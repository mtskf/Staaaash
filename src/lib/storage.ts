import type { StorageSchema, Group, SyncStatus } from "@/types";
import {
  getCurrentUser,
  onAuthStateChanged,
  saveGroupsToFirebase,
  subscribeToGroups
} from './firebase';
import { mergeGroupsThreeWay } from './sync-utils';
import { migrateAddUpdatedAt } from './migration';

const IS_DEV = import.meta.env.DEV;

// Local storage key for chrome.storage.local
const LOCAL_STORAGE_KEY = 'staaaash_groups';

// Keep track of Firebase subscription
let firebaseUnsubscribe: (() => void) | null = null;

// Ref-counting for multiple subscribers
const syncCallbacks = new Set<(groups: Group[]) => void>();

// Local storage key for tracking last synced state (Base for 3-way merge)
const LAST_SYNCED_KEY = 'staaaash_last_synced';

// Track last received remote data to skip unnecessary processing
// Reset on: auth state change, Firebase sync failure (to allow retry)
let lastRemoteDataHash: string | null = null;

// Write lock to prevent Firebase callback from overwriting local changes in progress
// When true, Firebase subscription callback will queue data instead of processing immediately
let localWriteInProgress = false;

// Queue for remote data received during local write
// Only the latest data is kept (newer updates supersede older ones)
let pendingRemoteData: Group[] | null = null;

// Sync status state and callbacks
let currentSyncStatus: SyncStatus = { state: 'idle', error: null };
const syncStatusCallbacks = new Set<(status: SyncStatus) => void>();

/**
 * Notify all sync status subscribers with the current status
 * Isolates subscriber exceptions to prevent one failure from affecting others
 */
function notifySyncStatus(status: SyncStatus): void {
  currentSyncStatus = status;
  for (const callback of syncStatusCallbacks) {
    try {
      callback(status);
    } catch (e) {
      console.error('Sync status callback error:', e);
    }
  }
}

/**
 * Subscribe to sync status changes
 * Immediately notifies the current status on subscribe
 * Returns an unsubscribe function
 */
export function subscribeSyncStatus(callback: (status: SyncStatus) => void): () => void {
  syncStatusCallbacks.add(callback);
  // Initial notification with exception isolation
  try {
    callback(currentSyncStatus);
  } catch (e) {
    console.error('Sync status callback error:', e);
  }
  return () => {
    syncStatusCallbacks.delete(callback);
  };
}

/**
 * Generate a simple hash for groups array to detect changes
 * Uses JSON.stringify for simplicity - sufficient for change detection
 */
function hashGroups(groups: Group[]): string {
  const sorted = [...groups].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(sorted);
}

/**
 * Process remote data from Firebase
 * Performs 3-way merge with local data and notifies subscribers
 */
async function processRemoteData(firebaseGroups: Group[]): Promise<void> {
  // Check if remote data has changed since last poll
  // Do this BEFORE syncing notification to avoid UI flash for no-op
  const remoteHash = hashGroups(firebaseGroups);
  if (remoteHash === lastRemoteDataHash) {
    // Remote data unchanged - skip merge/save to avoid unnecessary writes
    return;
  }
  lastRemoteDataHash = remoteHash;

  // Notify syncing state (only when there's actual work to do)
  notifySyncStatus({ state: 'syncing', error: null });

  try {
    // 1. Get current local groups (Local)
    const localGroups = await getFromLocal();

    // 2. Get last synced groups (Base)
    const lastSyncedGroups = await getLastSynced();

    // 3. Perform 3-Way Merge
    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(localGroups, firebaseGroups, lastSyncedGroups);

    // 4. Save merged result to local
    await saveToLocal(mergedGroups);

    // 5. Update Base (Last Synced) to match the new committed state
    await saveLastSynced(mergedGroups);

    // 6. If there were newly created local groups, sync them to Firebase
    // Fire-and-forget: errors are logged but don't block the sync flow
    if (newLocalGroups.length > 0) {
      syncToFirebase(mergedGroups).catch((error) => {
        console.warn('Firebase sync failed (will retry on next sync):', error);
        notifySyncStatus({ state: 'error', error: String(error) });
        // Reset hash so next poll will retry the sync
        lastRemoteDataHash = null;
      });
    }

    // Notify all subscribers
    for (const callback of syncCallbacks) {
      callback(mergedGroups);
    }

    // Notify synced state on success
    notifySyncStatus({ state: 'synced', error: null });
  } catch (e) {
    // Reset hash so next poll will retry processing
    lastRemoteDataHash = null;
    // Notify error state on exception
    notifySyncStatus({ state: 'error', error: String(e) });
    throw e;
  }
}

/**
 * Process any pending remote data that was queued during a local write
 */
async function processPendingRemoteData(): Promise<void> {
  if (pendingRemoteData) {
    const dataToProcess = pendingRemoteData;
    pendingRemoteData = null;
    await processRemoteData(dataToProcess);
  }
}

// Keep track of auth state subscription
let authUnsubscribe: (() => void) | null = null;

/**
 * Initialize Firebase sync for authenticated user
 * This should be called when user signs in
 * Returns an unsubscribe function to clean up all subscriptions
 *
 * Uses ref-counting pattern: multiple consumers can subscribe, and cleanup
 * only happens when the last subscriber unsubscribes.
 */
export function initFirebaseSync(onGroupsUpdated: (groups: Group[]) => void): () => void {
  // Add this callback to the set of subscribers
  syncCallbacks.add(onGroupsUpdated);

  // If this is the first subscriber, start the sync
  if (syncCallbacks.size === 1) {
    startSync();
  }

  // Return cleanup function for this specific subscriber
  return () => {
    syncCallbacks.delete(onGroupsUpdated);

    // If no more subscribers, clean up everything
    if (syncCallbacks.size === 0) {
      stopSync();
    }
  };
}

/**
 * Start Firebase sync (called when first subscriber registers)
 */
function startSync(): void {
  // Run updatedAt migration
  migrateAddUpdatedAt().catch(console.error);

  // Listen to auth state changes
  authUnsubscribe = onAuthStateChanged((user) => {
    // 1. Unsubscribe from Firebase (stop new remote data from coming in)
    if (firebaseUnsubscribe) {
      firebaseUnsubscribe();
      firebaseUnsubscribe = null;
    }
    // 2. Reset hash when auth state changes (new user or logout)
    lastRemoteDataHash = null;
    // 3. Clear pending remote data (prevents old user's data from being processed)
    pendingRemoteData = null;

    if (user) {
      // 4. Notify syncing state on login
      notifySyncStatus({ state: 'syncing', error: null });
      // Subscribe to Firebase real-time updates
      firebaseUnsubscribe = subscribeToGroups(user.uid, async (firebaseGroups) => {
        // If a local write is in progress, queue the data for later processing
        // This prevents race conditions while ensuring we don't lose remote updates
        if (localWriteInProgress) {
          pendingRemoteData = firebaseGroups;
          return;
        }

        await processRemoteData(firebaseGroups);
      });
    } else {
      // 4. Notify idle state on logout
      notifySyncStatus({ state: 'idle', error: null });
    }
  });
}

/**
 * Stop Firebase sync (called when last subscriber unsubscribes)
 */
function stopSync(): void {
  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
    firebaseUnsubscribe = null;
  }
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
  lastRemoteDataHash = null;
}

/**
 * Get last synced groups (Base state)
 */
async function getLastSynced(): Promise<Group[]> {
  if (IS_DEV && !chrome.storage) {
     const data = localStorage.getItem(LAST_SYNCED_KEY);
     return data ? JSON.parse(data) : [];
  }

  return new Promise((resolve) => {
    chrome.storage.local.get([LAST_SYNCED_KEY], (result) => {
      resolve((result[LAST_SYNCED_KEY] as Group[]) || []);
    });
  });
}

/**
 * Save last synced groups (Base state)
 */
async function saveLastSynced(groups: Group[]): Promise<void> {
  if (IS_DEV && !chrome.storage) {
    localStorage.setItem(LAST_SYNCED_KEY, JSON.stringify(groups));
    return;
  }

  return new Promise((resolve) => {
    chrome.storage.local.set({ [LAST_SYNCED_KEY]: groups }, () => resolve());
  });
}

/**
 * Save groups to local storage (chrome.storage.local)
 */
async function saveToLocal(groups: Group[]): Promise<void> {
  if (IS_DEV && !chrome.storage) {
    localStorage.setItem('staaaash-storage', JSON.stringify({ groups }));
    return;
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [LOCAL_STORAGE_KEY]: groups }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

/**
 * Get groups from local storage
 */
async function getFromLocal(): Promise<Group[]> {
  if (IS_DEV && !chrome.storage) {
    const local = localStorage.getItem('staaaash-storage');
    return local ? JSON.parse(local).groups || [] : [];
  }

  return new Promise((resolve, reject) => {
    chrome.storage.local.get([LOCAL_STORAGE_KEY], (result: Record<string, unknown>) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve((result[LOCAL_STORAGE_KEY] as Group[]) || []);
    });
  });
}

/**
 * Sync groups to Firebase if user is authenticated
 */
async function syncToFirebase(groups: Group[]): Promise<void> {
  const user = getCurrentUser();
  if (user) {
    await saveGroupsToFirebase(user.uid, groups);
  }
}

/**
 * Set updatedAt timestamp for groups that have changed
 * Only updates timestamp when actual content changes
 */
function setUpdatedTimestamp(oldGroups: Group[], newGroups: Group[]): Group[] {
  const now = Date.now();
  const oldMap = new Map(oldGroups.map(g => [g.id, g]));

  return newGroups.map(newGroup => {
    const oldGroup = oldMap.get(newGroup.id);

    if (!oldGroup) {
      // New group
      return {
        ...newGroup,
        createdAt: newGroup.createdAt || now,
        updatedAt: now
      };
    }

    // Deep comparison excluding updatedAt
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt: _oldTs, ...oldWithoutTimestamp } = oldGroup;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updatedAt: _newTs, ...newWithoutTimestamp } = newGroup;
    const hasChanged = JSON.stringify(oldWithoutTimestamp) !== JSON.stringify(newWithoutTimestamp);

    if (hasChanged) {
      return { ...newGroup, updatedAt: now };
    }

    // No change - preserve existing timestamp
    return { ...newGroup, updatedAt: oldGroup.updatedAt ?? oldGroup.createdAt };
  });
}

export const storage = {
  get: async (): Promise<StorageSchema> => {
    const groups = await getFromLocal();
    return { groups };
  },

  set: async (data: Partial<StorageSchema>): Promise<void> => {
    if (data.groups) {
      // Set write lock to prevent Firebase callback from interfering
      localWriteInProgress = true;

      try {
        // Save to local storage first (this is the primary operation)
        await saveToLocal(data.groups);

        // Only update Base and sync to Firebase if user is authenticated
        // This prevents groups created before login from being marked as "synced"
        // which would cause them to be deleted during 3-way merge when Firebase returns empty
        const user = getCurrentUser();
        if (user) {
          await saveLastSynced(data.groups);
          // Reset hash so next Firebase callback processes the update after our sync
          lastRemoteDataHash = null;
          // Sync to Firebase in background (fire-and-forget)
          // Errors are logged but don't block local operations
          syncToFirebase(data.groups).catch((error) => {
            console.warn('Firebase sync failed (will retry on next sync):', error);
            notifySyncStatus({ state: 'error', error: String(error) });
          });
        }
      } finally {
        // Clear write lock after all synchronous operations complete
        localWriteInProgress = false;
        // Process any Firebase updates that were queued during the write
        await processPendingRemoteData();
      }
    }
  },

  addGroup: async (group: Group): Promise<Group[]> => {
    const data = await storage.get();
    const minOrder = data.groups.length > 0
      ? Math.min(...data.groups.map(g => g.order || 0))
      : 0;

    const now = Date.now();
    // Assign an order lower than the current minimum to place it at the start
    const newGroup = {
      ...group,
      order: minOrder - 1,
      createdAt: group.createdAt || now,
      updatedAt: now
    };

    const newGroups = [...data.groups, newGroup];
    await storage.set({ groups: newGroups });
    return newGroups;
  },

  updateGroups: async (groups: Group[]): Promise<Group[]> => {
    const currentData = await storage.get();
    const groupsWithTimestamps = setUpdatedTimestamp(currentData.groups, groups);
    await storage.set({ groups: groupsWithTimestamps });
    return groupsWithTimestamps;
  },

  // Get estimated storage usage (local storage)
  getUsage: async (): Promise<{ bytesUsed: number; quotaBytes: number }> => {
    if (IS_DEV && !chrome.storage) {
      const local = localStorage.getItem('staaaash-storage') || '';
      return { bytesUsed: local.length, quotaBytes: 10485760 }; // 10MB
    }

    return new Promise((resolve) => {
      chrome.storage.local.getBytesInUse(null, (bytesUsed) => {
        resolve({ bytesUsed, quotaBytes: chrome.storage.local.QUOTA_BYTES });
      });
    });
  },

  // Export all data as JSON
  exportData: async (): Promise<string> => {
    const data = await storage.get();
    return JSON.stringify(data, null, 2);
  },

  // Import data from JSON
  importData: async (jsonString: string): Promise<Group[]> => {
    const data = JSON.parse(jsonString) as StorageSchema;
    if (!data.groups || !Array.isArray(data.groups)) {
      throw new Error("Invalid data format: missing groups array");
    }
    await storage.set({ groups: data.groups });
    return data.groups;
  }
};

// Keep StorageQuotaError for backward compatibility (though less likely to occur with local storage)
export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageQuotaError";
  }
}
