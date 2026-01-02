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
      firebaseUnsubscribe = subscribeToGroups(user.uid, (groups) => {
        // Update local cache
        saveToLocal(groups);
        // Notify listeners
        syncCallback?.(groups);
      });
    }
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
