import type { StorageSchema, Group } from "@/types";

const IS_DEV = import.meta.env.DEV;

// Mock storage for development outside extension environment
const mockStorage: StorageSchema = {
  groups: []
};

export const storage = {
  get: async (): Promise<StorageSchema> => {
    if (IS_DEV && !chrome.storage) {
      const local = localStorage.getItem("puuuush-storage");
      return local ? JSON.parse(local) : mockStorage;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.get(["groups"], (result: { [key: string]: any }) => {
        resolve({ groups: (result.groups as Group[]) || [] });
      });
    });
  },

  set: async (data: Partial<StorageSchema>): Promise<void> => {
    if (IS_DEV && !chrome.storage) {
      const current = localStorage.getItem("puuuush-storage");
      const parsed = current ? JSON.parse(current) : mockStorage;
      const newData = { ...parsed, ...data };
      localStorage.setItem("puuuush-storage", JSON.stringify(newData));
      return;
    }

    return new Promise((resolve) => {
      chrome.storage.sync.set(data, () => {
        resolve();
      });
    });
  },

  addGroup: async (group: Group) => {
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

  updateGroups: async (groups: Group[]) => {
    await storage.set({ groups });
    return groups;
  }
};
