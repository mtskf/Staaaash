import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { storage, initFirebaseSync, StorageQuotaError } from '@/lib/storage';
import { t } from '@/lib/i18n';
import type { Group, TabItem } from '@/types';

const UNDO_TOAST_DURATION = 5000;

export interface FlattenedItem {
  id: string;
  type: 'group' | 'tab';
  groupId?: string;
  data?: Group | TabItem;
}

export function useGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Helper: sort groups with pinned first, then by order (non-destructive)
  const sortPinnedFirst = (arr: Group[]) => [...arr].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return a.order - b.order;
  });

  useEffect(() => {
    // Load initial data from local storage
    const loadInitialData = async () => {
      const data = await storage.get();
      setGroups(sortPinnedFirst(data.groups));
    };
    loadInitialData();

    // Initialize Firebase sync - this will update groups when remote changes occur
    const unsubscribe = initFirebaseSync((syncedGroups) => {
      setGroups(sortPinnedFirst([...syncedGroups]));
    });

    // Listen for local storage changes (e.g., from background script archiving)
    const handleStorageChange = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: string
    ) => {
      if (areaName === 'local' && changes['staaaash_groups']?.newValue) {
        const newGroups = changes['staaaash_groups'].newValue;
        if (Array.isArray(newGroups)) {
          setGroups(sortPinnedFirst(newGroups as Group[]));
        }
      }
    };
    chrome.storage?.onChanged?.addListener(handleStorageChange);

    // Cleanup on unmount
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      chrome.storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, []);

  const updateGroups = useCallback(async (newGroups: Group[]): Promise<boolean> => {
    // Optimistic update with pinned-first sort to maintain invariant
    setGroups(sortPinnedFirst([...newGroups]));
    try {
      await storage.updateGroups(newGroups);
      return true;
    } catch (error) {
      if (error instanceof StorageQuotaError) {
        toast.error("Storage quota exceeded. Try removing some groups.");
      } else {
        toast.error("Failed to save changes.");
      }
      // Revert/Reload on error
      const data = await storage.get();
      setGroups(sortPinnedFirst(data.groups));
      return false;
    }
  }, []);

  const updateGroupData = useCallback(async (id: string, data: Partial<Group>) => {
    const newGroups = groups.map(g => g.id === id ? { ...g, ...data } : g);
    // Re-sort to maintain pinned-first invariant (e.g., after pin toggle)
    setGroups(sortPinnedFirst([...newGroups]));
    try {
      await storage.updateGroups(newGroups);
    } catch {
      toast.error("Failed to save changes.");
      // Reload from storage to restore consistency
      const storedData = await storage.get();
      setGroups(sortPinnedFirst(storedData.groups));
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
    const groupToRemove = groups.find(g => g.id === id);
    if (!groupToRemove) return;

    const nextId = getNextSelectionId(id);
    const newGroups = groups.filter(g => g.id !== id);
    const success = await updateGroups(newGroups);
    if (nextId) setSelectedId(nextId);

    if (success) {
      toast.success(t('group_deleted'), {
        duration: UNDO_TOAST_DURATION,
        action: {
          label: t('undo'),
          onClick: async () => {
            try {
              const currentGroups = await storage.get().then(d => d.groups);
              const restoredGroups = [...currentGroups, groupToRemove];
              await storage.updateGroups(restoredGroups);
              setGroups(sortPinnedFirst(restoredGroups));
              setSelectedId(groupToRemove.id);
            } catch {
              toast.error(t('failed_to_restore'));
            }
          },
        },
      });
    }
  }, [groups, updateGroups, getNextSelectionId]);

  const removeTab = useCallback(async (groupId: string, tabId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const tabToRemove = group.items.find(item => item.id === tabId);
    if (!tabToRemove) return;
    const tabIndex = group.items.findIndex(item => item.id === tabId);

    const nextId = getNextSelectionId(tabId);
    const newGroups = groups.map(g => {
        if (g.id === groupId) {
            return {
                ...g,
                items: g.items.filter((item: TabItem) => item.id !== tabId)
            };
        }
        return g;
    });
    const success = await updateGroups(newGroups);
    if (nextId) setSelectedId(nextId);

    if (success) {
      toast.success(t('tab_deleted'), {
        duration: UNDO_TOAST_DURATION,
        action: {
          label: t('undo'),
          onClick: async () => {
            try {
              const currentGroups = await storage.get().then(d => d.groups);
              const restoredGroups = currentGroups.map(g => {
                if (g.id === groupId) {
                  const newItems = [...g.items];
                  newItems.splice(tabIndex, 0, tabToRemove);
                  return { ...g, items: newItems };
                }
                return g;
              });
              await storage.updateGroups(restoredGroups);
              setGroups(sortPinnedFirst(restoredGroups));
              setSelectedId(tabToRemove.id);
            } catch {
              toast.error(t('failed_to_restore'));
            }
          },
        },
      });
    }
  }, [groups, updateGroups, getNextSelectionId]);

  const restoreGroup = useCallback(async (id: string) => {
    const group = groups.find(g => g.id === id);
    if (!group) return;

    // Open all tabs in a new window
    const urls = group.items.map(item => item.url);
    await chrome.windows.create({ url: urls, focused: true });

    // Pinned groups stay in collection
    if (group.pinned) return;

    const nextId = getNextSelectionId(id);
    const newGroups = groups.filter(g => g.id !== id);
    await updateGroups(newGroups);
    if (nextId) setSelectedId(nextId);
  }, [groups, updateGroups, getNextSelectionId]);

  const restoreTab = useCallback(async (groupId: string, tabId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const tab = group.items.find(t => t.id === tabId);
    if (!tab) return;

    await chrome.tabs.create({ url: tab.url, active: false });

    // Tabs in pinned groups stay in collection
    if (group.pinned) return;

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
