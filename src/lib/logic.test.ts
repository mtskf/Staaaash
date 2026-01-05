import { describe, it, expect } from 'vitest';
import { filterGroups, mergeGroups, reorderTabInGroup, moveTabToGroup } from './logic';
import type { Group, TabItem } from '@/types';

const mockTab1: TabItem = { id: 't1', title: 'Google', url: 'https://google.com' };
const mockTab2: TabItem = { id: 't2', title: 'GitHub', url: 'https://github.com' };
const mockTab3: TabItem = { id: 't3', title: 'Twitter', url: 'https://twitter.com' };

const mockGroup1: Group = {
    id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
    items: [mockTab1, mockTab2]
};

const mockGroup2: Group = {
    id: 'g2', title: 'Social', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
    items: [mockTab3]
};

describe('filterGroups', () => {
    it('returns all groups if query is empty', () => {
        const result = filterGroups([mockGroup1, mockGroup2], '');
        expect(result).toHaveLength(2);
    });

    it('filters by group title', () => {
        const result = filterGroups([mockGroup1, mockGroup2], 'Social');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('g2');
        expect(result[0].items).toHaveLength(1);
    });

    it('filters by tab title', () => {
        const result = filterGroups([mockGroup1, mockGroup2], 'Google');
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('g1');
        expect(result[0].items).toHaveLength(1);
        expect(result[0].items[0].id).toBe('t1');
    });

    it('filters by tab url', () => {
        const result = filterGroups([mockGroup1, mockGroup2], 'github.com');
        expect(result).toHaveLength(1);
        expect(result[0].items[0].id).toBe('t2');
    });
});

describe('mergeGroups', () => {
    const mockTab4: TabItem = { id: 't4', title: 'Reddit', url: 'https://reddit.com' };

    it('merges source group items into target group', () => {
        const sourceGroup: Group = {
            id: 'source', title: 'Source', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab3]
        };
        const targetGroup: Group = {
            id: 'target', title: 'Target', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const groups = [targetGroup, sourceGroup];

        const result = mergeGroups(groups, 'source', 'target');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('target');
        expect(result[0].items).toHaveLength(3);
        expect(result[0].items.map((t: TabItem) => t.id)).toEqual(['t1', 't2', 't3']);
    });

    it('deduplicates by URL (keeps first occurrence)', () => {
        const duplicateTab: TabItem = { id: 't5', title: 'Google Dup', url: 'https://google.com' };
        const sourceGroup: Group = {
            id: 'source', title: 'Source', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [duplicateTab, mockTab4]
        };
        const targetGroup: Group = {
            id: 'target', title: 'Target', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1]
        };
        const groups = [targetGroup, sourceGroup];

        const result = mergeGroups(groups, 'source', 'target');

        expect(result[0].items).toHaveLength(2);
        expect(result[0].items[0].id).toBe('t1'); // Original kept, not t5
        expect(result[0].items[1].id).toBe('t4');
    });

    it('removes source group after merge', () => {
        const otherGroup: Group = {
            id: 'other', title: 'Other', pinned: false, collapsed: false, order: 2, createdAt: 0, updatedAt: 0,
            items: []
        };
        const sourceGroup: Group = {
            id: 'source', title: 'Source', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab3]
        };
        const targetGroup: Group = {
            id: 'target', title: 'Target', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1]
        };
        const groups = [targetGroup, sourceGroup, otherGroup];

        const result = mergeGroups(groups, 'source', 'target');

        expect(result).toHaveLength(2);
        expect(result.map((g: Group) => g.id)).toEqual(['target', 'other']);
    });

    it('returns unchanged groups if source not found', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = mergeGroups(groups, 'nonexistent', mockGroup1.id);
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if target not found', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = mergeGroups(groups, mockGroup1.id, 'nonexistent');
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if source and target are the same', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = mergeGroups(groups, mockGroup1.id, mockGroup1.id);
        expect(result).toEqual(groups);
        expect(result).toHaveLength(2);
    });
});

describe('reorderTabInGroup', () => {
    it('reorders tab within the same group', () => {
        const group: Group = {
            id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2, mockTab3]
        };
        const groups = [group];

        const result = reorderTabInGroup(groups, 'g1', 0, 2);

        expect(result[0].items.map((t: TabItem) => t.id)).toEqual(['t2', 't3', 't1']);
    });

    it('does not modify other groups', () => {
        const group1: Group = {
            id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const group2: Group = {
            id: 'g2', title: 'Social', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab3]
        };
        const groups = [group1, group2];

        const result = reorderTabInGroup(groups, 'g1', 0, 1);

        expect(result[1]).toEqual(group2);
    });

    it('returns unchanged groups if group not found', () => {
        const groups = [mockGroup1];
        const result = reorderTabInGroup(groups, 'nonexistent', 0, 1);
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if indices are same', () => {
        const group: Group = {
            id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const groups = [group];

        const result = reorderTabInGroup(groups, 'g1', 0, 0);

        expect(result[0].items.map((t: TabItem) => t.id)).toEqual(['t1', 't2']);
    });

    it('returns unchanged groups if oldIndex is out of bounds', () => {
        const group: Group = {
            id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const groups = [group];

        const result = reorderTabInGroup(groups, 'g1', 10, 0);

        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if newIndex is out of bounds', () => {
        const group: Group = {
            id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const groups = [group];

        const result = reorderTabInGroup(groups, 'g1', 0, 10);

        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if indices are negative', () => {
        const group: Group = {
            id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const groups = [group];

        const result = reorderTabInGroup(groups, 'g1', -1, 0);

        expect(result).toEqual(groups);
    });
});

describe('moveTabToGroup', () => {
    it('moves tab from source to target group', () => {
        const sourceGroup: Group = {
            id: 'source', title: 'Source', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const targetGroup: Group = {
            id: 'target', title: 'Target', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab3]
        };
        const groups = [sourceGroup, targetGroup];

        const result = moveTabToGroup(groups, 't1', 'source', 'target');

        expect(result.find((g: Group) => g.id === 'source')?.items.map((t: TabItem) => t.id)).toEqual(['t2']);
        expect(result.find((g: Group) => g.id === 'target')?.items.map((t: TabItem) => t.id)).toEqual(['t3', 't1']);
    });

    it('inserts tab at specified index', () => {
        const sourceGroup: Group = {
            id: 'source', title: 'Source', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1]
        };
        const targetGroup: Group = {
            id: 'target', title: 'Target', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab2, mockTab3]
        };
        const groups = [sourceGroup, targetGroup];

        const result = moveTabToGroup(groups, 't1', 'source', 'target', 1);

        expect(result.find((g: Group) => g.id === 'target')?.items.map((t: TabItem) => t.id)).toEqual(['t2', 't1', 't3']);
    });

    it('prepends tab when insertAtStart is true', () => {
        const sourceGroup: Group = {
            id: 'source', title: 'Source', pinned: false, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1]
        };
        const targetGroup: Group = {
            id: 'target', title: 'Target', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab2, mockTab3]
        };
        const groups = [sourceGroup, targetGroup];

        const result = moveTabToGroup(groups, 't1', 'source', 'target', undefined, true);

        expect(result.find((g: Group) => g.id === 'target')?.items.map((t: TabItem) => t.id)).toEqual(['t1', 't2', 't3']);
    });

    it('returns unchanged groups if tab not found', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = moveTabToGroup(groups, 'nonexistent', mockGroup1.id, mockGroup2.id);
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if source group not found', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = moveTabToGroup(groups, 't1', 'nonexistent', mockGroup2.id);
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if target group not found', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = moveTabToGroup(groups, 't1', mockGroup1.id, 'nonexistent');
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if source and target are the same', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = moveTabToGroup(groups, 't1', mockGroup1.id, mockGroup1.id);
        expect(result).toEqual(groups);
        expect(result.find((g: Group) => g.id === mockGroup1.id)?.items).toHaveLength(2);
    });
});
