import type { Group, TabItem } from '@/types';

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
 * Merge source group into target group (for Shift+Drag operations).
 * Removes duplicates by URL. Returns new groups array with source removed
 * and target containing merged items.
 */
export function mergeGroupsIntoTarget(
    groups: Group[],
    sourceGroupId: string,
    targetGroupId: string
): Group[] {
    const sourceGroup = groups.find(g => g.id === sourceGroupId);
    const targetGroup = groups.find(g => g.id === targetGroupId);

    if (!sourceGroup || !targetGroup || sourceGroupId === targetGroupId) return groups;

    const seenUrls = new Set<string>();
    const mergedItems: TabItem[] = [];

    // Target items first (they take precedence)
    for (const tab of targetGroup.items) {
        if (!seenUrls.has(tab.url)) {
            seenUrls.add(tab.url);
            mergedItems.push(tab);
        }
    }

    // Then source items
    for (const tab of sourceGroup.items) {
        if (!seenUrls.has(tab.url)) {
            seenUrls.add(tab.url);
            mergedItems.push(tab);
        }
    }

    return groups
        .filter(g => g.id !== sourceGroupId)
        .map(g => g.id === targetGroupId ? { ...g, items: mergedItems } : g);
}

/**
 * Reorder a tab within the same group.
 */
export function reorderTabInGroup(
    groups: Group[],
    groupId: string,
    oldIndex: number,
    newIndex: number
): Group[] {
    const group = groups.find(g => g.id === groupId);
    if (!group || oldIndex === newIndex) return groups;

    const len = group.items.length;
    if (oldIndex < 0 || oldIndex >= len || newIndex < 0 || newIndex >= len) return groups;

    const newItems = [...group.items];
    const [removed] = newItems.splice(oldIndex, 1);
    newItems.splice(newIndex, 0, removed);

    return groups.map(g => g.id === groupId ? { ...g, items: newItems } : g);
}

/**
 * Move a tab from one group to another.
 */
export function moveTabToGroup(
    groups: Group[],
    tabId: string,
    sourceGroupId: string,
    targetGroupId: string,
    insertIndex?: number,
    insertAtStart?: boolean
): Group[] {
    const sourceGroup = groups.find(g => g.id === sourceGroupId);
    const targetGroup = groups.find(g => g.id === targetGroupId);

    if (!sourceGroup || !targetGroup || sourceGroupId === targetGroupId) return groups;

    const tab = sourceGroup.items.find(t => t.id === tabId);
    if (!tab) return groups;

    const sourceItems = sourceGroup.items.filter(t => t.id !== tabId);
    const targetItems = [...targetGroup.items];

    if (insertAtStart) {
        targetItems.unshift(tab);
    } else if (insertIndex !== undefined) {
        targetItems.splice(insertIndex, 0, tab);
    } else {
        targetItems.push(tab);
    }

    return groups.map(g => {
        if (g.id === sourceGroupId) return { ...g, items: sourceItems };
        if (g.id === targetGroupId) return { ...g, items: targetItems };
        return g;
    });
}

/**
 * Reorder a group within its section (pinned/unpinned).
 * Groups cannot cross the pinned/unpinned boundary.
 * Assumes input array is "Pinned First" (pinned groups at the start).
 * Updates order field to persist the new ordering.
 */
export function reorderGroup(
    groups: Group[],
    groupId: string,
    direction: 'up' | 'down'
): Group[] {
    const index = groups.findIndex(g => g.id === groupId);
    if (index === -1) return groups;

    const group = groups[index];
    const isPinned = group.pinned;

    // Find section boundaries
    const firstUnpinnedIndex = groups.findIndex(g => !g.pinned);
    const pinnedEnd = firstUnpinnedIndex === -1 ? groups.length : firstUnpinnedIndex;

    // Calculate target index
    const targetIndex = direction === 'up' ? index - 1 : index + 1;

    // Boundary checks
    if (isPinned) {
        // Pinned group: can only move within pinned section [0, pinnedEnd)
        if (targetIndex < 0 || targetIndex >= pinnedEnd) return groups;
    } else {
        // Unpinned group: can only move within unpinned section [pinnedEnd, groups.length)
        if (targetIndex < pinnedEnd || targetIndex >= groups.length) return groups;
    }

    // Swap groups and renormalize order field
    const newGroups = [...groups];
    [newGroups[index], newGroups[targetIndex]] = [newGroups[targetIndex], newGroups[index]];

    // Update order field based on new array positions
    return newGroups.map((g, i) => ({ ...g, order: i }));
}
