import { describe, it, expect } from 'vitest';
import { mergeGroups } from './sync-utils';
import type { Group } from '@/types';

// Helper to create mock groups
const createGroup = (id: string, updatedMs: number = 0): Group => ({
  id,
  title: `Group ${id}`,
  items: [],
  pinned: false,
  collapsed: false,
  order: 0,
  createdAt: updatedMs
});

describe('mergeGroups (3-way merge)', () => {
  it('should return remote groups when local and base are empty (Initial Sync)', () => {
    const remote = [createGroup('1'), createGroup('2')];
    const local: Group[] = [];
    const base: Group[] = [];

    const { mergedGroups, newLocalGroups } = mergeGroups(local, remote, base);

    expect(mergedGroups).toEqual(remote);
    expect(newLocalGroups).toEqual([]);
  });

  it('should prioritize remote updates (Remote Wins)', () => {
    const group1_local = { ...createGroup('1'), title: 'Local Title' };
    const group1_remote = { ...createGroup('1'), title: 'Remote Title' };

    // Base doesn't strictly matter for "existence" check, but let's say it existed
    const base = [createGroup('1')];

    const { mergedGroups } = mergeGroups([group1_local], [group1_remote], base);

    expect(mergedGroups[0].title).toBe('Remote Title');
  });

  it('should detect Remote Deletion (Local present, Remote missing, Base present)', () => {
    const group1 = createGroup('1');

    // Group 1 exists locally and in base, but is MISSING from remote
    const local = [group1];
    const remote: Group[] = [];
    const base = [group1];

    const { mergedGroups, newLocalGroups } = mergeGroups(local, remote, base);

    // Should be deleted (not in mergedGroups)
    expect(mergedGroups).toEqual([]);
    expect(newLocalGroups).toEqual([]);
  });

  it('should detect Local Creation (Local present, Remote missing, Base missing)', () => {
    const group1 = createGroup('1'); // Existing synced group
    const group2 = createGroup('new'); // Newly created locally

    const local = [group1, group2];
    const remote = [group1];
    const base = [group1];

    const { mergedGroups, newLocalGroups } = mergeGroups(local, remote, base);

    // Should keep group2
    expect(mergedGroups).toHaveLength(2);
    expect(mergedGroups).toContainEqual(group1); // Remote version
    expect(mergedGroups).toContainEqual(group2); // Local version kept

    // Should verify it needs to be pushed
    expect(newLocalGroups).toEqual([group2]);
  });

  it('should handle complex mixed scenarios', () => {
    // G1: Unchanged
    // G2: Deleted remotely
    // G3: Created locally
    // G4: Updated remotely

    const g1 = createGroup('1');
    const g2 = createGroup('2');
    const g3 = createGroup('3');
    const g4_old = { ...createGroup('4'), title: 'Old' };
    const g4_new = { ...createGroup('4'), title: 'New' };

    const base = [g1, g2, g4_old];
    const remote = [g1, g4_new];
    const local = [g1, g2, g3, g4_old];

    const { mergedGroups, newLocalGroups } = mergeGroups(local, remote, base);

    const mergedIds = mergedGroups.map(g => g.id).sort();
    expect(mergedIds).toEqual(['1', '3', '4']);

    expect(mergedGroups.find(g => g.id === '4')?.title).toBe('New'); // Remote wins update
    expect(newLocalGroups).toEqual([g3]); // New local group identified
  });
});
