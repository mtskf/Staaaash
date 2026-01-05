import type { Group } from '@/types';

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
