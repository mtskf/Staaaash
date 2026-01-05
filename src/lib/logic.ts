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
 * Merge source group into target group, removing duplicates by URL.
 * Returns new groups array with source removed and target containing merged items.
 */
export function mergeGroups(
    groups: Group[],
    sourceGroupId: string,
    targetGroupId: string
): Group[] {
    const sourceGroup = groups.find(g => g.id === sourceGroupId);
    const targetGroup = groups.find(g => g.id === targetGroupId);

    if (!sourceGroup || !targetGroup) return groups;

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

    if (!sourceGroup || !targetGroup) return groups;

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
