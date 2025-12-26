import { describe, it, expect } from 'vitest';
import { filterGroups, mergeGroups, moveTabToGroup, reorderTabInGroup } from './logic';
import type { Group, TabItem } from '@/types';

const mockTab1: TabItem = { id: 't1', title: 'Google', url: 'https://google.com' };
const mockTab2: TabItem = { id: 't2', title: 'GitHub', url: 'https://github.com' };
const mockTab3: TabItem = { id: 't3', title: 'Twitter', url: 'https://twitter.com' };

const mockGroup1: Group = {
    id: 'g1', title: 'Work', pinned: false, collapsed: false, order: 0, createdAt: 0,
    items: [mockTab1, mockTab2]
};

const mockGroup2: Group = {
    id: 'g2', title: 'Social', pinned: false, collapsed: false, order: 1, createdAt: 0,
    items: [mockTab3]
};

describe('logic', () => {
    describe('filterGroups', () => {
        it('returns all groups if query is empty', () => {
            const result = filterGroups([mockGroup1, mockGroup2], '');
            expect(result).toHaveLength(2);
        });

        it('filters by group title', () => {
            const result = filterGroups([mockGroup1, mockGroup2], 'Social');
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('g2');
            expect(result[0].items).toHaveLength(1); // Should keep all items if group matches?
            // Logic implementation: matchesGroupTitle ? group.items : filteredTabs
            // Since 'Social' matches group title, it returns all items.
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
        it('merges tabs and deduplicates by URL', () => {
            const source = { ...mockGroup2, items: [mockTab3, { ...mockTab1, id: 't1-copy' }] }; // t1-copy has same url as t1
            const target = mockGroup1;

            const result = mergeGroups(source, target);
            expect(result.items).toHaveLength(3); // t1, t2, t3. t1-copy should be deduplicated (ignored if url matches existing?)
            // Logic: target items first, then source items.
            // checks seenUrls.
            // target has t1 (google), t2 (github).
            // source has t3 (twitter), t1-copy (google).
            // t1 is seen. t2 is seen.
            // t3 is new -> added.
            // t1-copy url is seen -> skipped.

            expect(result.items.map(t => t.id)).toEqual(['t1', 't2', 't3']);
        });
    });

    describe('reorderTabInGroup', () => {
        it('reorders tabs', () => {
            const group = mockGroup1; // [t1, t2]
            const result = reorderTabInGroup(group, 't1', 't2');
            expect(result.items.map(t => t.id)).toEqual(['t2', 't1']);
        });
    });

    describe('moveTabToGroup', () => {
        it('moves tab from source to target', () => {
            const source = mockGroup1; // [t1, t2]
            const target = mockGroup2; // [t3]

            const { source: newSource, target: newTarget } = moveTabToGroup(source, target, 't1');

            expect(newSource.items).toHaveLength(1);
            expect(newSource.items[0].id).toBe('t2');

            expect(newTarget.items).toHaveLength(2);
            expect(newTarget.items.map(t => t.id)).toEqual(['t3', 't1']); // appended
        });

        it('inserts tab at specific index', () => {
             const source = mockGroup1;
             const target = mockGroup2; // [t3]

             const { source: newSource, target: newTarget } = moveTabToGroup(source, target, 't1', 0);
             expect(newSource.items).toHaveLength(1);
             expect(newTarget.items.map(t => t.id)).toEqual(['t1', 't3']);
        });
    });
});
