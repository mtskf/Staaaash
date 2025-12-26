import { useEffect, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  defaultDropAnimationSideEffects,
  type DropAnimation
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import type { Group, TabItem } from '@/types';
import { storage } from '@/lib/storage';
import { GroupCard } from './GroupCard';
import { TabCard } from './TabCard';
import { createPortal } from 'react-dom';

export function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<Group | TabItem | null>(null);
  const [autoFocusGroupId, setAutoFocusGroupId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const loadGroups = useCallback(async () => {
    const data = await storage.get();
    setGroups(data.groups.sort((a, b) => a.order - b.order));

    // Check for auto-focus request
    const params = new URLSearchParams(window.location.search);
    const newGroupId = params.get('newGroupId');
    if (newGroupId) {
       // Clear query param to prevent re-focus on refresh
       window.history.replaceState({}, '', 'index.html');
       // We'll pass this ID down to identify which group needs focus
       // For simplicity, we can just use a local state or pass it to a context.
       // However, since we re-render here, let's store it or pass it.
       // Actually, we can just set a temporary state 'autoFocusGroupId'
       setAutoFocusGroupId(newGroupId);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Helper to get flattened list of visible items for navigation
  const getFlattenedItems = useCallback(() => {
    const items: Array<{ id: string, type: 'group' | 'tab', groupId?: string, data?: any }> = [];

    const processGroup = (group: Group) => {
      items.push({ id: group.id, type: 'group', data: group });
      if (!group.collapsed) {
        group.items.forEach(tab => {
          items.push({ id: tab.id, type: 'tab', groupId: group.id, data: tab });
        });
      }
    };

    // Pinned groups first
    groups.filter(g => g.pinned).forEach(processGroup);
    // Unpinned groups second
    groups.filter(g => !g.pinned).forEach(processGroup);

    return items;
  }, [groups]);


  const updateGroups = async (newGroups: Group[]) => {
    setGroups(newGroups);
    await storage.updateGroups(newGroups);
  };



  // Drag Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const currentData = active.data.current;
    setActiveId(active.id as string);
    setActiveItem(currentData?.group || currentData?.tab);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (!over) return;

    // const activeData = active.data.current?.data;
    // const overData = over.data.current?.data;

    // Handling Tab over Group or Tab over Tab (complex nested sortable)
    // Simplified: We mostly handle logic in DragEnd for reordering
    // Real-time visual feedback for moving between containers handles via dnd-kit automatically if setup right
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Group Reordering
    if (activeType === 'Group' && overType === 'Group') {
        if (active.id !== over.id) {
            const oldIndex = groups.findIndex(g => g.id === active.id);
            const newIndex = groups.findIndex(g => g.id === over.id);
            const newGroups = arrayMove(groups, oldIndex, newIndex).map((g, idx) => ({ ...g, order: idx }));
            await updateGroups(newGroups);
        }
        return;
    }

    // Tab Reordering / Moving
    if (activeType === 'Tab') {
        const activeTabId = active.id;
        // Find which group the active tab belongs to
        const sourceGroup = groups.find(g => g.items.some((t: TabItem) => t.id === activeTabId));

        if (!sourceGroup) return;

        // Ensure we dropped over something valid
        let targetGroupId: string | null = null;

        if (overType === 'Group') {
            targetGroupId = over.id as string;
        } else if (overType === 'Tab') {
            // Did we drop onto another tab? Find its group
             const targetGroup = groups.find(g => g.items.some((t: TabItem) => t.id === over.id));
             targetGroupId = targetGroup ? targetGroup.id : null;
        }

        if (!targetGroupId) return;

        const targetGroup = groups.find(g => g.id === targetGroupId)!;

        // Case 1: Reordering within same group
        if (sourceGroup.id === targetGroup.id) {
            const oldIndex = sourceGroup.items.findIndex((t: TabItem) => t.id === activeTabId);
            const newIndex = overType === 'Group'
                ? sourceGroup.items.length // Append to end if dropped on group container
                : sourceGroup.items.findIndex((t: TabItem) => t.id === over.id);

            if (oldIndex !== newIndex && newIndex !== -1) {
                const newItems = arrayMove(sourceGroup.items, oldIndex, newIndex);
                const newGroups = groups.map(g =>
                    g.id === sourceGroup.id ? { ...g, items: newItems } : g
                );
                await updateGroups(newGroups);
            }
        }
        // Case 2: Moving to different group
        else {
             const tabToMove = sourceGroup.items.find((t: TabItem) => t.id === activeTabId)!;
             const sourceItems = sourceGroup.items.filter((t: TabItem) => t.id !== activeTabId);

             const targetItems = [...targetGroup.items];
             if (overType === 'Group') {
                 // Check visual order to decide insertion point
                 const pinnedGroups = groups.filter(g => g.pinned).sort((a, b) => a.order - b.order);
                 const unpinnedGroups = groups.filter(g => !g.pinned).sort((a, b) => a.order - b.order);
                 const visualGroups = [...pinnedGroups, ...unpinnedGroups];

                 const sourceIndex = visualGroups.findIndex(g => g.id === sourceGroup.id);
                 const targetIndex = visualGroups.findIndex(g => g.id === targetGroup.id);

                 if (targetIndex > sourceIndex) {
                     // Moving DOWN to a group -> Insert at TOP
                     targetItems.unshift(tabToMove);
                 } else {
                     // Moving UP to a group -> Insert at BOTTOM (default)
                     targetItems.push(tabToMove);
                 }
             } else {
                 const insertIndex = targetItems.findIndex(t => t.id === over.id);
                 if (insertIndex !== -1) {
                     targetItems.splice(insertIndex, 0, tabToMove);
                 } else {
                     targetItems.push(tabToMove);
                 }
             }

             const newGroups = groups.map(g => {
                 if (g.id === sourceGroup.id) return { ...g, items: sourceItems };
                 if (g.id === targetGroup.id) return { ...g, items: targetItems };
                 return g;
             });
             await updateGroups(newGroups);
        }
    }
  };

  const removeGroup = async (id: string) => {
    const newGroups = groups.filter(g => g.id !== id);
    await updateGroups(newGroups);
  };

  const removeTab = async (groupId: string, tabId: string) => {
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
  };

  const updateGroupData = async (id: string, data: Partial<Group>) => {
      const newGroups = groups.map(g => g.id === id ? { ...g, ...data } : g);
      setGroups(newGroups); // Optimistic update
      await storage.updateGroups(newGroups);
  };

  const restoreGroup = async (id: string) => {
    const group = groups.find(g => g.id === id);
    if (!group) return;

    for (const item of group.items) {
      await chrome.tabs.create({ url: item.url, active: false });
    }
    await removeGroup(id);
  };

  const restoreTab = async (groupId: string, tabId: string) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const tab = group.items.find(t => t.id === tabId);
    if (!tab) return;

    await chrome.tabs.create({ url: tab.url, active: false });
    await removeTab(groupId, tabId);
  };

  // Renaming state
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const items = getFlattenedItems();
      const currentIndex = items.findIndex(item => item.id === selectedId);

      // Handle Renaming ('e')
      if (e.key === 'e' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (currentIndex !== -1 && items[currentIndex].type === 'group') {
            e.preventDefault();
            setRenamingGroupId(items[currentIndex].id);
        }
        return;
      }

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
                                     return { ...g, items: [...g.items, currentItem.data as TabItem], collapsed: false };
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
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            if (currentIndex !== -1) {
              const item = items[currentIndex];
              if (item.type === 'group') {
                restoreGroup(item.id);
              } else if (item.type === 'tab' && item.groupId) {
                restoreTab(item.groupId, item.id);
              }
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
                removeGroup(item.id);
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
  }, [getFlattenedItems, selectedId, groups, updateGroupData, restoreGroup, restoreTab, removeGroup, removeTab, updateGroups]);

  const dropAnimation: DropAnimation = {
      sideEffects: defaultDropAnimationSideEffects({
        styles: {
          active: {
            opacity: '0.5',
          },
        },
      }),
  };

  const pinnedGroups = groups.filter(g => g.pinned);
  const unpinnedGroups = groups.filter(g => !g.pinned);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Puuuush</h1>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-8">
            {/* Pinned Section */}
            {pinnedGroups.length > 0 && (
                <section className="max-w-3xl mx-auto w-full">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wider">Pinned</h2>
                    <SortableContext items={pinnedGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-4">
                            {pinnedGroups.map(group => (
                                <GroupCard
                                    key={group.id}
                                    group={group}
                                    onRemoveGroup={removeGroup}
                                    onRemoveTab={removeTab}
                                    onUpdateGroup={updateGroupData}
                                    onRestore={restoreGroup}
                                    onRestoreTab={restoreTab}
                                    autoFocusName={group.id === autoFocusGroupId}
                                    isSelected={selectedId === group.id}
                                    selectedTabId={selectedId}
                                    isRenaming={renamingGroupId === group.id}
                                    onRenameStop={() => setRenamingGroupId(null)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </section>
            )}

            {/* Main Grid */}
             <section className="max-w-3xl mx-auto w-full">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Collections</h2>
                </div>
                 <SortableContext items={unpinnedGroups.map(g => g.id)} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-4">
                         {unpinnedGroups.map(group => (
                            <GroupCard
                                key={group.id}
                                group={group}
                                onRemoveGroup={removeGroup}
                                onRemoveTab={removeTab}
                                onUpdateGroup={updateGroupData}
                                onRestore={restoreGroup}
                                onRestoreTab={restoreTab}
                                autoFocusName={group.id === autoFocusGroupId}
                                isSelected={selectedId === group.id}
                                selectedTabId={selectedId}
                                isRenaming={renamingGroupId === group.id}
                                onRenameStop={() => setRenamingGroupId(null)}
                            />
                        ))}
                    </div>
                </SortableContext>
            </section>
        </div>

        {createPortal(
            <DragOverlay dropAnimation={dropAnimation}>
                {activeItem && activeId ? (
                   'items' in activeItem ? (
                       <div className="w-full max-w-3xl">
                           <GroupCard
                               group={activeItem as Group}
                               onRemoveGroup={() => {}}
                               onRemoveTab={() => {}}
                               onUpdateGroup={() => {}}
                               onRestore={() => {}}
                               onRestoreTab={() => {}}
                               autoFocusName={false}
                               isSelected={false}
                               selectedTabId={null}
                            />
                       </div>
                   ) : (
                       <div className="w-[300px]">
                        <TabCard tab={activeItem as TabItem} onRemove={() => {}} onRestore={() => {}} />
                       </div>
                   )
                ) : null}
            </DragOverlay>,
            document.body
        )}
      </DndContext>
    </div>
  );
}
