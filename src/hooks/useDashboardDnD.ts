import { useState } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import type { Group, TabItem } from '@/types';
import { mergeGroupsIntoTarget, reorderTabInGroup, moveTabToGroup } from '@/lib/logic';

export function useDashboardDnD(
  groups: Group[],
  updateGroups: (groups: Group[]) => Promise<void>,
  shiftPressedRef: React.RefObject<boolean>
) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<Group | TabItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const currentData = active.data.current;
    setActiveId(active.id as string);
    setActiveItem(currentData?.group || currentData?.tab);
  };

  const handleDragOver = () => {
    // const { over } = event;
    // if (!over) return;
    // Real-time visual feedback is handled by dnd-kit
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    // We used string literals 'Group' and 'Tab' in the original code.
    // We should ensure the Item components (GroupCard/TabCard) are using the same types in useSortable/useDraggable data.
    // Assuming they use { type: 'Group' } or { type: 'Tab' }.

    // Note: In constants we defined 'group' and 'tab' (lowercase), but checking original code:
    // Line 199: if (activeType === 'Group')
    // Line 204: } else if (overType === 'Tab')
    // So it seems they are Capitalized in the component data.

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;

    // Group Reordering / Merging
    if (activeType === 'Group') {
        let targetGroupId: string | null = null;

        if (overType === 'Group') {
            targetGroupId = over.id as string;
        } else if (overType === 'Tab') {
            const targetGroup = groups.find(g => g.items.some(t => t.id === over.id));
            if (targetGroup) targetGroupId = targetGroup.id;
        }

        if (targetGroupId && active.id !== targetGroupId) {
            if (shiftPressedRef.current) {
                // Merge Groups
                const newGroups = mergeGroupsIntoTarget(groups, active.id as string, targetGroupId);
                if (newGroups !== groups) {
                    await updateGroups(newGroups);
                }
            } else if (overType === 'Group') {
                // Standard Reorder (only group-on-group)
                const oldIndex = groups.findIndex(g => g.id === active.id);
                const newIndex = groups.findIndex(g => g.id === targetGroupId);
                const newGroups = arrayMove(groups, oldIndex, newIndex).map((g, idx) => ({ ...g, order: idx }));
                await updateGroups(newGroups);
            }
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
                const newGroups = reorderTabInGroup(groups, sourceGroup.id, oldIndex, newIndex);
                await updateGroups(newGroups);
            }
        }
        // Case 2: Moving to different group
        else {
             let insertIndex: number | undefined;
             let insertAtStart = false;

             if (overType === 'Group') {
                 // Check visual order to decide insertion point
                 const pinnedGroups = groups.filter(g => g.pinned).sort((a, b) => a.order - b.order);
                 const unpinnedGroups = groups.filter(g => !g.pinned).sort((a, b) => a.order - b.order);
                 const visualGroups = [...pinnedGroups, ...unpinnedGroups];

                 const sourceIndex = visualGroups.findIndex(g => g.id === sourceGroup.id);
                 const targetIndex = visualGroups.findIndex(g => g.id === targetGroup.id);

                 // Moving DOWN to a group -> Insert at TOP
                 insertAtStart = targetIndex > sourceIndex;
             } else {
                 insertIndex = targetGroup.items.findIndex(t => t.id === over.id);
                 if (insertIndex === -1) insertIndex = undefined;
             }

             const newGroups = moveTabToGroup(
                 groups,
                 activeTabId as string,
                 sourceGroup.id,
                 targetGroup.id,
                 insertIndex,
                 insertAtStart
             );
             await updateGroups(newGroups);
        }
    }
  };

  return {
    sensors,
    activeId,
    activeItem,
    handleDragStart,
    handleDragOver,
    handleDragEnd
  };
}
