import { useEffect, useState, useRef } from 'react';
import type { Group, TabItem } from '@/types';
import type { FlattenedItem } from './useGroups';

interface UseKeyboardNavProps {
  groups: Group[];
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  updateGroups: (groups: Group[]) => Promise<void>;
  updateGroupData: (id: string, data: Partial<Group>) => Promise<void>;
  restoreGroup: (id: string) => Promise<void>;
  restoreTab: (groupId: string, tabId: string) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;
  removeTab: (groupId: string, tabId: string) => Promise<void>;
  setRenamingGroupId: (id: string | null) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  getFlattenedItems: () => FlattenedItem[];
  onRequestDeleteGroup?: (group: Group) => void;
  disabled?: boolean;
}

export function useKeyboardNav({
  groups,
  selectedId,
  setSelectedId,
  updateGroups,
  updateGroupData,
  restoreGroup,
  restoreTab,
  removeGroup,
  removeTab,
  setRenamingGroupId,
  searchInputRef,
  getFlattenedItems,
  onRequestDeleteGroup,
  disabled = false
}: UseKeyboardNavProps) {
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const shiftPressedRef = useRef(false);

  // Track Shift key state
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (disabled) return;
        if (e.key === 'Shift') {
            setIsShiftPressed(true);
            shiftPressedRef.current = true;
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (disabled) return;
        if (e.key === 'Shift') {
             setIsShiftPressed(false);
             shiftPressedRef.current = false;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled]);

  // Main Keyboard Navigation Logic
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (disabled) return;

      // ⌘+F to focus search (allow even in inputs)
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Don't interfere if Shift is just being pressed down (handled by other effect)
      if (e.key === 'Shift') return;

      const items = getFlattenedItems();
      const currentIndex = items.findIndex(item => item.id === selectedId);

      // Handle Reordering (Shift + ArrowUp/Down)
      if (e.shiftKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
         e.preventDefault();
         if (currentIndex === -1) return;
         const currentItem = items[currentIndex];

         if (currentItem.type === 'tab' && currentItem.groupId) {
             const group = groups.find(g => g.id === currentItem.groupId);
             if (group) {
                 const tabIndex = group.items.findIndex(t => t.id === currentItem.id);
                 if (tabIndex !== -1) {
                     // Check for cross-group move
                     const isFirstItem = tabIndex === 0;
                     const isLastItem = tabIndex === group.items.length - 1;

                     if (e.key === 'ArrowUp' && isFirstItem) {
                         // Move to previous group's bottom
                         const pinnedGroups = groups.filter(g => g.pinned).sort((a, b) => a.order - b.order);
                         const unpinnedGroups = groups.filter(g => !g.pinned).sort((a, b) => a.order - b.order);
                         const visualGroups = [...pinnedGroups, ...unpinnedGroups];

                         const groupIndex = visualGroups.findIndex(g => g.id === group.id);
                         if (groupIndex > 0) {
                             const prevGroup = visualGroups[groupIndex - 1];
                             const newGroups = groups.map(g => {
                                 if (g.id === group.id) {
                                     return { ...g, items: g.items.filter(t => t.id !== currentItem.id) };
                                 }
                                 if (g.id === prevGroup.id) {
                                     return { ...g, items: [...g.items, currentItem.data as TabItem], collapsed: false };
                                 }
                                 return g;
                             });
                             await updateGroups(newGroups);
                             document.getElementById(`item-${currentItem.id}`)?.scrollIntoView({ block: 'nearest' });
                         }
                     } else if (e.key === 'ArrowDown' && isLastItem) {
                         // Move to next group's bottom
                         const pinnedGroups = groups.filter(g => g.pinned).sort((a, b) => a.order - b.order);
                         const unpinnedGroups = groups.filter(g => !g.pinned).sort((a, b) => a.order - b.order);
                         const visualGroups = [...pinnedGroups, ...unpinnedGroups];

                         const groupIndex = visualGroups.findIndex(g => g.id === group.id);
                         if (groupIndex !== -1 && groupIndex < visualGroups.length - 1) {
                             const nextGroup = visualGroups[groupIndex + 1];
                               const newGroups = groups.map(g => {
                                 if (g.id === group.id) {
                                     return { ...g, items: g.items.filter(t => t.id !== currentItem.id) };
                                 }
                                 if (g.id === nextGroup.id) {
                                     return { ...g, items: [currentItem.data as TabItem, ...g.items], collapsed: false };
                                 }
                                 return g;
                             });
                             await updateGroups(newGroups);
                             document.getElementById(`item-${currentItem.id}`)?.scrollIntoView({ block: 'nearest' });
                         }
                     } else {
                         // Intra-group move
                         const targetIndex = e.key === 'ArrowUp' ? tabIndex - 1 : tabIndex + 1;
                         if (targetIndex >= 0 && targetIndex < group.items.length) {
                             const newItems = [...group.items];
                             const [movedTab] = newItems.splice(tabIndex, 1);
                             newItems.splice(targetIndex, 0, movedTab);
                             await updateGroupData(group.id, { items: newItems });
                         }
                     }
                 }
             }
         } else if (currentItem.type === 'group') {
             const group = currentItem.data as Group;
             const isPinned = group.pinned;
             // Filter groups of same type
             const relevantGroups = groups.filter(g => !!g.pinned === !!isPinned);
             const groupIndex = relevantGroups.findIndex(g => g.id === currentItem.id);

             if (groupIndex !== -1) {
                 const targetIndex = e.key === 'ArrowUp' ? groupIndex - 1 : groupIndex + 1;

                 // Check bounds within the filtered list
                 if (targetIndex >= 0 && targetIndex < relevantGroups.length) {
                     // We need to swap positions in the MAIN groups list
                     // Find the neighbor in the main list
                     const neighbor = relevantGroups[targetIndex];
                     const mainIndexCurrent = groups.findIndex(g => g.id === group.id);
                     const mainIndexNeighbor = groups.findIndex(g => g.id === neighbor.id);

                     if (mainIndexCurrent !== -1 && mainIndexNeighbor !== -1) {
                         const newGroups = [...groups];
                         // Simple swap
                         [newGroups[mainIndexCurrent], newGroups[mainIndexNeighbor]] = [newGroups[mainIndexNeighbor], newGroups[mainIndexCurrent]];
                         await updateGroups(newGroups);
                         document.getElementById(`item-${currentItem.id}`)?.scrollIntoView({ block: 'nearest' });
                     }
                 }
             }
         }
         return;
      }

      // Standard Navigation
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const nextIndex = currentIndex + 1;
          if (nextIndex < items.length) {
            setSelectedId(items[nextIndex].id);
            document.getElementById(`item-${items[nextIndex].id}`)?.scrollIntoView({ block: 'nearest' });
          } else if (items.length > 0 && currentIndex === -1) {
             // Select first if none selected
             setSelectedId(items[0].id);
          }
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prevIndex = currentIndex - 1;
          if (prevIndex >= 0) {
            setSelectedId(items[prevIndex].id);
            document.getElementById(`item-${items[prevIndex].id}`)?.scrollIntoView({ block: 'nearest' });
          }
          break;
        }
        case 'ArrowRight': {
          e.preventDefault();
          if (currentIndex !== -1 && items[currentIndex].type === 'group') {
            const group = items[currentIndex].data as Group;
            if (group.collapsed) {
               updateGroupData(group.id, { collapsed: false });
            }
          }
          break;
        }
        case 'ArrowLeft': {
           e.preventDefault();
           if (currentIndex !== -1) {
             const item = items[currentIndex];
             if (item.type === 'group') {
               const group = item.data as Group;
               if (!group.collapsed) {
                 updateGroupData(group.id, { collapsed: true });
               }
             } else if (item.type === 'tab' && item.groupId) {
               // If tab is selected, pressing left selects its parent group
                setSelectedId(item.groupId);
                document.getElementById(`item-${item.groupId}`)?.scrollIntoView({ block: 'nearest' });
             }
           }
           break;
        }
        case 'Enter': {
          e.preventDefault();
          if (currentIndex !== -1) {
            const item = items[currentIndex];

            // Restore: Cmd/Ctrl + Enter
            if (e.metaKey || e.ctrlKey) {
               if (item.type === 'group') {
                 restoreGroup(item.id);
               } else if (item.type === 'tab' && item.groupId) {
                 restoreTab(item.groupId, item.id);
               }
            } else {
               // Rename: Enter (no modifiers)
               if (item.type === 'group') {
                   setRenamingGroupId(item.id);
               }
            }
          } else {
             // Handle Renaming (Enter without modifiers)
             if (currentIndex !== -1 && items[currentIndex].type === 'group') {
                e.preventDefault();
                setRenamingGroupId(items[currentIndex].id);
             }
          }
          break;
        }
        case 'Backspace':
        case 'Delete': {
           e.preventDefault();
           if (currentIndex !== -1) {
             const item = items[currentIndex];
             if (item.type === 'group') {
                if (onRequestDeleteGroup) {
                    onRequestDeleteGroup(item.data as Group);
                } else {
                    removeGroup(item.id);
                }
             } else if (item.type === 'tab' && item.groupId) {
                removeTab(item.groupId, item.id);
             }
           }
           break;
        }
        case 'p': {
          e.preventDefault();
          if (currentIndex !== -1 && items[currentIndex].type === 'group') {
             const group = items[currentIndex].data as Group;
             updateGroupData(group.id, { pinned: !group.pinned });
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getFlattenedItems, selectedId, groups, updateGroupData, restoreGroup, restoreTab, removeGroup, removeTab, updateGroups, setRenamingGroupId, searchInputRef, setSelectedId, onRequestDeleteGroup, disabled]);

  return { isShiftPressed, shiftPressedRef };
}
