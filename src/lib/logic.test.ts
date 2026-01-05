import { describe, it, expect } from 'vitest';
import { filterGroups } from './logic';
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
