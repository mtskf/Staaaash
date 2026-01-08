import { describe, it, expect } from 'vitest';
import { filterGroups, mergeGroupsIntoTarget, reorderTabInGroup, moveTabToGroup, reorderGroup } from './logic';
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

describe('mergeGroupsIntoTarget', () => {
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

        const result = mergeGroupsIntoTarget(groups, 'source', 'target');

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

        const result = mergeGroupsIntoTarget(groups, 'source', 'target');

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

        const result = mergeGroupsIntoTarget(groups, 'source', 'target');

        expect(result).toHaveLength(2);
        expect(result.map((g: Group) => g.id)).toEqual(['target', 'other']);
    });

    it('returns unchanged groups if source not found', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = mergeGroupsIntoTarget(groups, 'nonexistent', mockGroup1.id);
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if target not found', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = mergeGroupsIntoTarget(groups, mockGroup1.id, 'nonexistent');
        expect(result).toEqual(groups);
    });

    it('returns unchanged groups if source and target are the same', () => {
        const groups = [mockGroup1, mockGroup2];
        const result = mergeGroupsIntoTarget(groups, mockGroup1.id, mockGroup1.id);
        expect(result).toEqual(groups);
        expect(result).toHaveLength(2);
    });

    it('removes pinned source group after merge', () => {
        const pinnedSource: Group = {
            id: 'pinned-source', title: 'Pinned Source', pinned: true, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab3]
        };
        const unpinnedTarget: Group = {
            id: 'unpinned-target', title: 'Unpinned Target', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab1, mockTab2]
        };
        const groups = [pinnedSource, unpinnedTarget];

        const result = mergeGroupsIntoTarget(groups, 'pinned-source', 'unpinned-target');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('unpinned-target');
        expect(result[0].items).toHaveLength(3);
        expect(result.find(g => g.id === 'pinned-source')).toBeUndefined();
    });

    it('removes unpinned source group when merging into pinned target', () => {
        const pinnedTarget: Group = {
            id: 'pinned-target', title: 'Pinned Target', pinned: true, collapsed: false, order: 0, createdAt: 0, updatedAt: 0,
            items: [mockTab1]
        };
        const unpinnedSource: Group = {
            id: 'unpinned-source', title: 'Unpinned Source', pinned: false, collapsed: false, order: 1, createdAt: 0, updatedAt: 0,
            items: [mockTab2, mockTab3]
        };
        const groups = [pinnedTarget, unpinnedSource];

        const result = mergeGroupsIntoTarget(groups, 'unpinned-source', 'pinned-target');

        expect(result).toHaveLength(1);
        expect(result[0].id).toBe('pinned-target');
        expect(result[0].items).toHaveLength(3);
        expect(result.find(g => g.id === 'unpinned-source')).toBeUndefined();
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

describe('reorderGroup', () => {
    // Test groups: p1, p2 are pinned; u1, u2 are unpinned
    const p1: Group = { id: 'p1', title: 'Pinned 1', pinned: true, collapsed: false, order: 0, createdAt: 0, updatedAt: 0, items: [] };
    const p2: Group = { id: 'p2', title: 'Pinned 2', pinned: true, collapsed: false, order: 1, createdAt: 0, updatedAt: 0, items: [] };
    const u1: Group = { id: 'u1', title: 'Unpinned 1', pinned: false, collapsed: false, order: 2, createdAt: 0, updatedAt: 0, items: [] };
    const u2: Group = { id: 'u2', title: 'Unpinned 2', pinned: false, collapsed: false, order: 3, createdAt: 0, updatedAt: 0, items: [] };
    const groups = [p1, p2, u1, u2];

    it('swaps P1 and P2 when P1 moves down', () => {
        const result = reorderGroup(groups, 'p1', 'down');
        expect(result.map((g: Group) => g.id)).toEqual(['p2', 'p1', 'u1', 'u2']);
        // New array check implies immutability
        expect(result).not.toBe(groups);
    });

    it('returns same groups when local move is invalid (boundary)', () => {
        const result = reorderGroup(groups, 'p2', 'down');
        expect(result).toEqual(groups);
    });

    it('moves U1 down within unpinned section', () => {
        const result = reorderGroup(groups, 'u1', 'down');
        expect(result.map((g: Group) => g.id)).toEqual(['p1', 'p2', 'u2', 'u1']);
    });

    it('blocks U1 from moving into pinned section', () => {
        const result = reorderGroup(groups, 'u1', 'up');
        expect(result).toEqual(groups);
    });

    it('returns same groups for invalid groupId', () => {
        const result = reorderGroup(groups, 'invalid', 'up');
        expect(result).toEqual(groups);
    });

    it('returns same groups when P1 moves up (already at top)', () => {
        const result = reorderGroup(groups, 'p1', 'up');
        expect(result).toEqual(groups);
    });

    it('returns same groups when U2 moves down (already at bottom)', () => {
        const result = reorderGroup(groups, 'u2', 'down');
        expect(result).toEqual(groups);
    });

    it('renormalizes order field after swap for persistence', () => {
        const result = reorderGroup(groups, 'p1', 'down');
        // After swap: [p2, p1, u1, u2] with order [0, 1, 2, 3]
        expect(result.map((g: Group) => g.order)).toEqual([0, 1, 2, 3]);
        // p2 is now at index 0 with order 0
        expect(result[0].id).toBe('p2');
        expect(result[0].order).toBe(0);
        // p1 is now at index 1 with order 1
        expect(result[1].id).toBe('p1');
        expect(result[1].order).toBe(1);
    });

    // This test documents the pinned-first invariant requirement.
    // useGroups is responsible for maintaining this order.
    it('handles unpinned-first array (edge case - invariant violation)', () => {
        // If caller passes unpinned-first array, boundary detection may be incorrect
        const badOrder = [u1, u2, p1, p2]; // Violates pinned-first invariant
        const result = reorderGroup(badOrder, 'p1', 'up');
        // firstUnpinnedIndex = 0, pinnedEnd = 0
        // p1 at index 2, targetIndex = 1, but 1 >= pinnedEnd (0) fails for pinned group
        // This returns unchanged - which is safe but not ideal
        expect(result).toBe(badOrder);
    });
});
