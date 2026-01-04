import { describe, it, expect } from 'vitest';
import { mergeGroups } from './sync-utils';
import type { Group } from '@/types';

// Helper to create mock groups
const createGroup = (id: string, title?: string, updatedAt?: number): Group => ({
  id,
  title: title || `Group ${id}`,
  items: [],
  pinned: false,
  collapsed: false,
  order: 0,
  createdAt: 1000,
  updatedAt: updatedAt ?? 1000
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

describe('Last Write Wins (LWW) conflict resolution', () => {
  it('should keep local changes when local updatedAt is newer', () => {
    const localGroup = {
      ...createGroup('1', 'Local Title'),
      updatedAt: 2000
    };
    const remoteGroup = {
      ...createGroup('1', 'Remote Title'),
      updatedAt: 1000
    };
    const base = [createGroup('1')];

    const { mergedGroups, newLocalGroups } = mergeGroups(
      [localGroup],
      [remoteGroup],
      base
    );

    expect(mergedGroups).toHaveLength(1);
    expect(mergedGroups[0].title).toBe('Local Title');
    expect(newLocalGroups).toContainEqual(localGroup);
  });

  it('should keep remote changes when remote updatedAt is newer', () => {
    const localGroup = {
      ...createGroup('1', 'Local Title'),
      updatedAt: 1000
    };
    const remoteGroup = {
      ...createGroup('1', 'Remote Title'),
      updatedAt: 2000
    };
    const base = [createGroup('1')];

    const { mergedGroups, newLocalGroups } = mergeGroups(
      [localGroup],
      [remoteGroup],
      base
    );

    expect(mergedGroups).toHaveLength(1);
    expect(mergedGroups[0].title).toBe('Remote Title');
    expect(newLocalGroups).toHaveLength(0);
  });

  it('should prefer remote when timestamps are equal', () => {
    const localGroup = {
      ...createGroup('1', 'Local Title'),
      updatedAt: 1000
    };
    const remoteGroup = {
      ...createGroup('1', 'Remote Title'),
      updatedAt: 1000
    };
    const base = [createGroup('1')];

    const { mergedGroups } = mergeGroups(
      [localGroup],
      [remoteGroup],
      base
    );

    expect(mergedGroups[0].title).toBe('Remote Title');
  });

  it('should fallback to createdAt when updatedAt is missing', () => {
    const localGroup = {
      ...createGroup('1', 'Local Title'),
      createdAt: 2000,
      updatedAt: undefined as unknown as number
    };
    const remoteGroup = {
      ...createGroup('1', 'Remote Title'),
      createdAt: 1000,
      updatedAt: undefined as unknown as number
    };
    const base = [createGroup('1')];

    const { mergedGroups } = mergeGroups(
      [localGroup],
      [remoteGroup],
      base
    );

    expect(mergedGroups[0].title).toBe('Local Title');
  });

  it('should handle mixed scenarios with LWW', () => {
    const local = [
      { ...createGroup('1', 'Local Newer'), updatedAt: 3000 },
      { ...createGroup('2', 'Local Older'), updatedAt: 1000 },
      { ...createGroup('3', 'Local New'), updatedAt: 2000 }
    ];
    const remote = [
      { ...createGroup('1', 'Remote Older'), updatedAt: 2000 },
      { ...createGroup('2', 'Remote Newer'), updatedAt: 4000 }
    ];
    const base = [
      createGroup('1'),
      createGroup('2')
    ];

    const { mergedGroups, newLocalGroups } = mergeGroups(local, remote, base);

    expect(mergedGroups).toHaveLength(3);
    expect(mergedGroups.find(g => g.id === '1')?.title).toBe('Local Newer');
    expect(mergedGroups.find(g => g.id === '2')?.title).toBe('Remote Newer');
    expect(mergedGroups.find(g => g.id === '3')?.title).toBe('Local New');
    // '1' (won LWW) and '3' (new local)
    expect(newLocalGroups).toHaveLength(2);
    expect(newLocalGroups.map(g => g.id).sort()).toEqual(['1', '3']);
  });
});
