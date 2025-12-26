import type { Group } from '@/types';
import { arrayMove } from '@dnd-kit/sortable';

/**
 * Filter groups and their tabs based on a search query.
 */
export function filterGroups(groups: Group[], query: string): Group[] {
    if (!query.trim()) return groups;
    const lowerQuery = query.toLowerCase();

    return groups.map(group => {
        const matchesGroupTitle = group.title.toLowerCase().includes(lowerQuery);
        const filteredTabs = group.items.filter(tab =>
            tab.title.toLowerCase().includes(lowerQuery) ||
            tab.url.toLowerCase().includes(lowerQuery)
        );

        if (matchesGroupTitle || filteredTabs.length > 0) {
            return {
                ...group,
                items: matchesGroupTitle ? group.items : filteredTabs
            };
        }
        return null;
    }).filter((g): g is Group => g !== null);
}

/**
 * Merge two groups, deduplicating tabs by URL.
 */
export function mergeGroups(sourceGroup: Group, targetGroup: Group): Group {
    const seenUrls = new Set(targetGroup.items.map(t => t.url));
    const newItems = [...targetGroup.items];

    for (const item of sourceGroup.items) {
        if (!seenUrls.has(item.url)) {
            newItems.push(item);
            seenUrls.add(item.url);
        }
    }
    return { ...targetGroup, items: newItems };
}

/**
 * Reorder tabs within a single group.
 */
export function reorderTabInGroup(group: Group, activeId: string, overId: string): Group {
    const oldIndex = group.items.findIndex(t => t.id === activeId);
    const newIndex = group.items.findIndex(t => t.id === overId);

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        return {
            ...group,
            items: arrayMove(group.items, oldIndex, newIndex)
        };
    }
    return group;
}

/**
 * Move a tab from one group to another.
 */
export function moveTabToGroup(
    sourceGroup: Group,
    targetGroup: Group,
    tabId: string,
    index?: number
): { source: Group, target: Group } {
    const tabToMove = sourceGroup.items.find(t => t.id === tabId);
    if (!tabToMove) return { source: sourceGroup, target: targetGroup };

    const newSourceItems = sourceGroup.items.filter(t => t.id !== tabId);
    const newTargetItems = [...targetGroup.items];

    if (typeof index === 'number' && index >= 0 && index <= newTargetItems.length) {
        newTargetItems.splice(index, 0, tabToMove);
    } else {
        newTargetItems.push(tabToMove);
    }

    return {
        source: { ...sourceGroup, items: newSourceItems },
        target: { ...targetGroup, items: newTargetItems }
    };
}
