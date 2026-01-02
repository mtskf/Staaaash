import type { StorageSchema, Group } from "@/types";
import {
  getCurrentUser,
  onAuthStateChanged,
  saveGroupsToFirebase,
  subscribeToGroups
} from './firebase';

const IS_DEV = import.meta.env.DEV;

// Local storage key for chrome.storage.local
const LOCAL_STORAGE_KEY = 'staaaash_groups';

// Keep track of Firebase subscription
let firebaseUnsubscribe: (() => void) | null = null;
let syncCallback: ((groups: Group[]) => void) | null = null;

// Local storage key for tracking last synced state (Base for 3-way merge)
const LAST_SYNCED_KEY = 'staaaash_last_synced';

/**
 * Initialize Firebase sync for authenticated user
 * This should be called when user signs in
 */
export function initFirebaseSync(onGroupsUpdated: (groups: Group[]) => void) {
  // Clean up existing subscription
  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
    firebaseUnsubscribe = null;
  }

  syncCallback = onGroupsUpdated;

  // Listen to auth state changes
  onAuthStateChanged((user) => {
    if (firebaseUnsubscribe) {
      firebaseUnsubscribe();
      firebaseUnsubscribe = null;
    }

    if (user) {
      // Subscribe to Firebase real-time updates
      firebaseUnsubscribe = subscribeToGroups(user.uid, async (firebaseGroups) => {
        // 1. Get current local groups (Local)
        const localGroups = await getFromLocal();

        // 2. Get last synced groups (Base)
        const lastSyncedGroups = await getLastSynced();
        const lastSyncedIds = new Set(lastSyncedGroups.map(g => g.id));

        // 3. Determine Merged State
        const firebaseIds = new Set(firebaseGroups.map(g => g.id));
        const mergedGroups: Group[] = [];

        // Add all Firebase groups (Remote wins for updates/existence)
        mergedGroups.push(...firebaseGroups);

        // Check local groups to see if any are NEW and should be preserved
        const newLocalGroups: Group[] = [];
        for (const localGroup of localGroups) {
            // If it exists in Firebase, it's already added above (mapped by Remote data)
            if (firebaseIds.has(localGroup.id)) continue;

            // If it's NOT in Firebase:
            // Check if it was present in the last sync (Base)
            if (lastSyncedIds.has(localGroup.id)) {
                // It was in Base but not in Remote -> It implies Remote Deletion.
                // Action: Delete locally (do not add to mergedGroups)
                console.log(`[Sync] Group separatedly deleted remotely: ${localGroup.id}`);
            } else {
                // It was NOT in Base and NOT in Remote -> It implies Local Creation.
                // Action: Keep it and push to Remote later
                mergedGroups.push(localGroup);
                newLocalGroups.push(localGroup);
            }
        }

        // 4. Save merged result to local
        await saveToLocal(mergedGroups);

        // 5. Update Base (Last Synced) to match the new committed state
        // We include newLocalGroups in the 'base' because we are about to push them.
        // Actually, strictly speaking, we should update Base after push success,
        // but for eventual consistency in this flow, updating here is acceptable
        // as the next poll will converge.
        await saveLastSynced(mergedGroups);

        // 6. If there were newly created local groups, sync them to Firebase
        if (newLocalGroups.length > 0) {
          await syncToFirebase(mergedGroups);
        }

        // Notify listeners
        syncCallback?.(mergedGroups);
      });
    }
  });
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

export const storage = {
  get: async (): Promise<StorageSchema> => {
    const groups = await getFromLocal();
    return { groups };
  },

  set: async (data: Partial<StorageSchema>): Promise<void> => {
    if (data.groups) {
      // Save to local storage
      await saveToLocal(data.groups);
      // Sync to Firebase if authenticated
      await syncToFirebase(data.groups);
      // Update Base state as we have successfully pushed our local state
      await saveLastSynced(data.groups);
    }
  },

  addGroup: async (group: Group): Promise<Group[]> => {
    const data = await storage.get();
    const minOrder = data.groups.length > 0
      ? Math.min(...data.groups.map(g => g.order || 0))
      : 0;

    // Assign an order lower than the current minimum to place it at the start
    const newGroup = { ...group, order: minOrder - 1 };

    const newGroups = [...data.groups, newGroup];
    await storage.set({ groups: newGroups });
    return newGroups;
  },

  updateGroups: async (groups: Group[]): Promise<Group[]> => {
    await storage.set({ groups });
    return groups;
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
