/**
 * Simplified storage for background script
 * Uses chrome.storage.local only (no Firebase sync)
 * The dashboard will handle Firebase sync when user is authenticated
 */
import type { StorageSchema, Group } from '../types';

const LOCAL_STORAGE_KEY = 'staaaash_groups';

export const storage = {
  get: async (): Promise<StorageSchema> => {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get([LOCAL_STORAGE_KEY], (result: Record<string, unknown>) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ groups: (result[LOCAL_STORAGE_KEY] as Group[]) || [] });
      });
    });
  },

  set: async (data: Partial<StorageSchema>): Promise<void> => {
    if (!data.groups) return;

    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [LOCAL_STORAGE_KEY]: data.groups }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  },

  addGroup: async (group: Group): Promise<Group[]> => {
    const data = await storage.get();
    const minOrder = data.groups.length > 0
      ? Math.min(...data.groups.map(g => g.order || 0))
      : 0;

    const newGroup = { ...group, order: minOrder - 1 };
    const newGroups = [...data.groups, newGroup];
    await storage.set({ groups: newGroups });
    return newGroups;
  },

  updateGroups: async (groups: Group[]): Promise<Group[]> => {
    await storage.set({ groups });
    return groups;
  }
};
