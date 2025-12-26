import type { StorageSchema, Group } from "@/types";

const IS_DEV = import.meta.env.DEV;

// Mock storage for development outside extension environment
const mockStorage: StorageSchema = {
  groups: []
};

export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StorageQuotaError";
  }
}

export const storage = {
  get: async (): Promise<StorageSchema> => {
    if (IS_DEV && !chrome.storage) {
      const local = localStorage.getItem("staaaash-storage");
      return local ? JSON.parse(local) : mockStorage;
    }

    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(["groups"], (result: Record<string, unknown>) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve({ groups: (result.groups as Group[]) || [] });
      });
    });
  },

  set: async (data: Partial<StorageSchema>): Promise<void> => {
    if (IS_DEV && !chrome.storage) {
      const current = localStorage.getItem("staaaash-storage");
      const parsed = current ? JSON.parse(current) : mockStorage;
      const newData = { ...parsed, ...data };
      localStorage.setItem("staaaash-storage", JSON.stringify(newData));
      return;
    }

    return new Promise((resolve, reject) => {
      chrome.storage.sync.set(data, () => {
        if (chrome.runtime.lastError) {
          const errorMessage = chrome.runtime.lastError.message || "Storage error";
          if (errorMessage.includes("QUOTA_BYTES") || errorMessage.includes("quota")) {
            reject(new StorageQuotaError("Storage quota exceeded. Try removing some groups."));
          } else {
            reject(new Error(errorMessage));
          }
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

  // Get estimated storage usage
  getUsage: async (): Promise<{ bytesUsed: number; quotaBytes: number }> => {
    if (IS_DEV && !chrome.storage) {
      const local = localStorage.getItem("staaaash-storage") || "";
      return { bytesUsed: local.length, quotaBytes: 102400 };
    }

    return new Promise((resolve) => {
      chrome.storage.sync.getBytesInUse(null, (bytesUsed) => {
        resolve({ bytesUsed, quotaBytes: chrome.storage.sync.QUOTA_BYTES });
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
