import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { storage, initFirebaseSync, StorageQuotaError } from '@/lib/storage';
import type { Group, TabItem } from '@/types';

export interface FlattenedItem {
  id: string;
  type: 'group' | 'tab';
  groupId?: string;
  data?: Group | TabItem;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data from local storage
    const loadInitialData = async () => {
      const data = await storage.get();
      setGroups(data.groups.sort((a, b) => a.order - b.order));
    };
    loadInitialData();

    // Initialize Firebase sync - this will update groups when remote changes occur
    initFirebaseSync((syncedGroups) => {
      setGroups(syncedGroups.sort((a, b) => a.order - b.order));
    });
  }, []);

  const updateGroups = useCallback(async (newGroups: Group[]) => {
    // Optimistic update
    setGroups(newGroups);
    try {
      await storage.updateGroups(newGroups);
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        toast.error("Storage quota exceeded. Try removing some groups.");
      } else {
        toast.error("Failed to save changes.");
      }
      // Revert/Reload on error
      const data = await storage.get();
      setGroups(data.groups.sort((a, b) => a.order - b.order));
    }
  }, []);

  const updateGroupData = useCallback(async (id: string, data: Partial<Group>) => {
    const newGroups = groups.map(g => g.id === id ? { ...g, ...data } : g);
    setGroups(newGroups); // Optimistic update
    try {
      await storage.updateGroups(newGroups);
    } catch {
      toast.error("Failed to save changes.");
      // In a real app we might revert here too
    }
  }, [groups]);

  // Helper to get flattened list of visible items for navigation
  const getFlattenedItems = useCallback(() => {
    const items: FlattenedItem[] = [];

    const processGroup = (group: Group) => {
      items.push({ id: group.id, type: 'group', data: group });
      if (!group.collapsed) {
        group.items.forEach(tab => {
          items.push({ id: tab.id, type: 'tab', groupId: group.id, data: tab });
        });
      }
    };

    // Pinned groups first (assuming groups are already sorted by order)
    groups.filter(g => g.pinned).forEach(processGroup);
    // Unpinned groups second
    groups.filter(g => !g.pinned).forEach(processGroup);

    return items;
  }, [groups]);

  // Determine next selection when an item is removed
  const getNextSelectionId = useCallback((idToRemove: string) => {
    const items = getFlattenedItems();
    const index = items.findIndex(item => item.id === idToRemove);
    if (index === -1) return null;

    // Try previous item first
    if (index > 0) {
      return items[index - 1].id;
    }
    // If no previous, try next item
    if (index < items.length - 1) {
      return items[index + 1].id;
    }
    return null;
  }, [getFlattenedItems]);

  const removeGroup = useCallback(async (id: string) => {
    const nextId = getNextSelectionId(id);
    const newGroups = groups.filter(g => g.id !== id);
    await updateGroups(newGroups);
    if (nextId) setSelectedId(nextId);
  }, [groups, updateGroups, getNextSelectionId]);

  const removeTab = useCallback(async (groupId: string, tabId: string) => {
    const nextId = getNextSelectionId(tabId);
    const newGroups = groups.map(g => {
        if (g.id === groupId) {
            return {
                ...g,
                items: g.items.filter((t: TabItem) => t.id !== tabId)
            };
        }
        return g;
    });
    await updateGroups(newGroups);
    if (nextId) setSelectedId(nextId);
  }, [groups, updateGroups, getNextSelectionId]);

  const restoreGroup = useCallback(async (id: string) => {
    const nextId = getNextSelectionId(id);
    const group = groups.find(g => g.id === id);
    if (!group) return;

    for (const item of group.items) {
      await chrome.tabs.create({ url: item.url, active: false });
    }
    const newGroups = groups.filter(g => g.id !== id);
    await updateGroups(newGroups);
    if (nextId) setSelectedId(nextId);
  }, [groups, updateGroups, getNextSelectionId]);

  const restoreTab = useCallback(async (groupId: string, tabId: string) => {
    const nextId = getNextSelectionId(tabId);
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const tab = group.items.find(t => t.id === tabId);
    if (!tab) return;

    await chrome.tabs.create({ url: tab.url, active: false });
    const newGroups = groups.map(g => {
        if (g.id === groupId) {
            return {
                ...g,
                items: g.items.filter((t: TabItem) => t.id !== tabId)
            };
        }
        return g;
    });
    await updateGroups(newGroups);
    if (nextId) setSelectedId(nextId);
  }, [groups, updateGroups, getNextSelectionId]);

  return {
    groups,
    selectedId,
    setSelectedId,
    updateGroups,
    updateGroupData,
    removeGroup,
    removeTab,
    restoreGroup,
    restoreTab,
    getFlattenedItems,
  };
}
