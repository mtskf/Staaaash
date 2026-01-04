import type { StorageSchema, Group } from "@/types";
import {
  getCurrentUser,
  onAuthStateChanged,
  saveGroupsToFirebase,
  subscribeToGroups
} from './firebase';
import { mergeGroups } from './sync-utils';
import { migrateAddUpdatedAt } from './migration';

const IS_DEV = import.meta.env.DEV;

// Local storage key for chrome.storage.local
const LOCAL_STORAGE_KEY = 'staaaash_groups';

// Keep track of Firebase subscription
let firebaseUnsubscribe: (() => void) | null = null;
let syncCallback: ((groups: Group[]) => void) | null = null;

// Local storage key for tracking last synced state (Base for 3-way merge)
const LAST_SYNCED_KEY = 'staaaash_last_synced';

// Track last received remote data to skip unnecessary processing
// Reset on: auth state change, Firebase sync failure (to allow retry)
let lastRemoteDataHash: string | null = null;

/**
 * Generate a simple hash for groups array to detect changes
 * Uses JSON.stringify for simplicity - sufficient for change detection
 */
function hashGroups(groups: Group[]): string {
  const sorted = [...groups].sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify(sorted);
}

// Keep track of auth state subscription
let authUnsubscribe: (() => void) | null = null;

/**
 * Initialize Firebase sync for authenticated user
 * This should be called when user signs in
 * Returns an unsubscribe function to clean up all subscriptions
 */
export function initFirebaseSync(onGroupsUpdated: (groups: Group[]) => void): () => void {
  // Run updatedAt migration
  migrateAddUpdatedAt().catch(console.error);

  // Clean up existing subscriptions
  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
    firebaseUnsubscribe = null;
  }
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }

  syncCallback = onGroupsUpdated;

  // Listen to auth state changes
  authUnsubscribe = onAuthStateChanged((user) => {
    if (firebaseUnsubscribe) {
      firebaseUnsubscribe();
      firebaseUnsubscribe = null;
    }
    // Reset hash when auth state changes (new user or logout)
    lastRemoteDataHash = null;

    if (user) {
      // Subscribe to Firebase real-time updates
      firebaseUnsubscribe = subscribeToGroups(user.uid, async (firebaseGroups) => {
        // Check if remote data has changed since last poll
        const remoteHash = hashGroups(firebaseGroups);
        if (remoteHash === lastRemoteDataHash) {
          // Remote data unchanged - skip merge/save to avoid unnecessary writes
          return;
        }
        lastRemoteDataHash = remoteHash;

        // 1. Get current local groups (Local)
        const localGroups = await getFromLocal();

        // 2. Get last synced groups (Base)
        const lastSyncedGroups = await getLastSynced();

        // 3. Perform 3-Way Merge
        const { mergedGroups, newLocalGroups } = mergeGroups(localGroups, firebaseGroups, lastSyncedGroups);

        // 4. Save merged result to local
        await saveToLocal(mergedGroups);

        // 5. Update Base (Last Synced) to match the new committed state
        // We include newLocalGroups in the 'base' because we are about to push them.
        // Actually, strictly speaking, we should update Base after push success,
        // but for eventual consistency in this flow, updating here is acceptable
        // as the next poll will converge.
        await saveLastSynced(mergedGroups);

        // 6. If there were newly created local groups, sync them to Firebase
        // Fire-and-forget: errors are logged but don't block the sync flow
        if (newLocalGroups.length > 0) {
          syncToFirebase(mergedGroups).catch((error) => {
            console.warn('Firebase sync failed (will retry on next sync):', error);
            // Reset hash so next poll will retry the sync
            lastRemoteDataHash = null;
          });
        }

        // Notify listeners
        syncCallback?.(mergedGroups);
      });
    }
  });

  // Return cleanup function
  return () => {
    if (firebaseUnsubscribe) {
      firebaseUnsubscribe();
      firebaseUnsubscribe = null;
    }
    if (authUnsubscribe) {
      authUnsubscribe();
      authUnsubscribe = null;
    }
    syncCallback = null;
    lastRemoteDataHash = null;
  };
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
    const { updatedAt: _oldUpdated, ...oldWithoutTimestamp } = oldGroup;
    const { updatedAt: _newUpdated, ...newWithoutTimestamp } = newGroup;
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
      // Save to local storage first (this is the primary operation)
      await saveToLocal(data.groups);
      // Update Base state - do this before Firebase sync so local state is consistent
      await saveLastSynced(data.groups);
      // Sync to Firebase in background (fire-and-forget)
      // Errors are logged but don't block local operations
      syncToFirebase(data.groups).catch((error) => {
        console.warn('Firebase sync failed (will retry on next sync):', error);
      });
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
