import { describe, it, expect } from 'vitest';
import { mergeGroupsThreeWay } from './sync-utils';
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

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    expect(mergedGroups).toEqual(remote);
    expect(newLocalGroups).toEqual([]);
  });

  it('should prioritize remote updates (Remote Wins)', () => {
    const group1_local = { ...createGroup('1'), title: 'Local Title' };
    const group1_remote = { ...createGroup('1'), title: 'Remote Title' };

    // Base doesn't strictly matter for "existence" check, but let's say it existed
    const base = [createGroup('1')];

    const { mergedGroups } = mergeGroupsThreeWay([group1_local], [group1_remote], base);

    expect(mergedGroups[0].title).toBe('Remote Title');
  });

  it('should detect Remote Deletion (Local present, Remote missing, Base present)', () => {
    const group1 = createGroup('1');

    // Group 1 exists locally and in base, but is MISSING from remote
    const local = [group1];
    const remote: Group[] = [];
    const base = [group1];

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    // Should be deleted (not in mergedGroups)
    expect(mergedGroups).toEqual([]);
    expect(newLocalGroups).toEqual([]);
  });

  it('should detect Local Deletion (Local missing, Remote present, Base present)', () => {
    const group1 = createGroup('1');
    const group2 = createGroup('2');

    // Group 2 was deleted locally but still exists in remote (sync not yet complete)
    const local = [group1];
    const remote = [group1, group2];
    const base = [group1, group2];

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    // Group 2 should be removed (local deletion wins)
    expect(mergedGroups).toHaveLength(1);
    expect(mergedGroups[0].id).toBe('1');
    expect(newLocalGroups).toEqual([]);
  });

  it('should detect Local Creation (Local present, Remote missing, Base missing)', () => {
    const group1 = createGroup('1'); // Existing synced group
    const group2 = createGroup('new'); // Newly created locally

    const local = [group1, group2];
    const remote = [group1];
    const base = [group1];

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

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

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

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

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(
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

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(
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

    const { mergedGroups } = mergeGroupsThreeWay(
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

    const { mergedGroups } = mergeGroupsThreeWay(
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

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    expect(mergedGroups).toHaveLength(3);
    expect(mergedGroups.find(g => g.id === '1')?.title).toBe('Local Newer');
    expect(mergedGroups.find(g => g.id === '2')?.title).toBe('Remote Newer');
    expect(mergedGroups.find(g => g.id === '3')?.title).toBe('Local New');
    // '1' (won LWW) and '3' (new local)
    expect(newLocalGroups).toHaveLength(2);
    expect(newLocalGroups.map(g => g.id).sort()).toEqual(['1', '3']);
  });
});

describe('Stale local data protection', () => {
  it('should NOT trust local deletion when local is older than base', () => {
    // Scenario: Local data rolled back to an older state (e.g., after extension reload)
    // Group 2 exists in base and remote, but not in local (local is stale)
    const group1 = { ...createGroup('1'), updatedAt: 1000 };
    const group2 = { ...createGroup('2', 'Pinned Group'), updatedAt: 2000 };

    const local = [{ ...group1, updatedAt: 500 }];  // Local is older (500 < 2000)
    const remote = [group1, group2];
    const base = [group1, group2];  // Base has group2 with updatedAt: 2000

    const { mergedGroups } = mergeGroupsThreeWay(local, remote, base);

    // Group 2 should NOT be deleted (local deletion not trusted because local is stale)
    expect(mergedGroups).toHaveLength(2);
    expect(mergedGroups.find(g => g.id === '2')).toBeDefined();
  });

  it('should trust local deletion when local is newer than or equal to base', () => {
    // Normal case: Local intentionally deleted a group
    const group1 = { ...createGroup('1'), updatedAt: 2000 };
    const group2 = { ...createGroup('2'), updatedAt: 1000 };

    const local = [group1];  // Group 2 was deleted locally
    const remote = [group1, group2];
    const base = [{ ...group1, updatedAt: 1000 }, group2];  // Base is older (1000 < 2000)

    const { mergedGroups } = mergeGroupsThreeWay(local, remote, base);

    // Group 2 should be deleted (local deletion trusted)
    expect(mergedGroups).toHaveLength(1);
    expect(mergedGroups[0].id).toBe('1');
  });

  it('should NOT trust LWW when local is older than base', () => {
    // Scenario: Local has stale data with old updatedAt that happens to be "newer" than remote
    // This can happen due to clock skew or sync failures
    const localGroup = {
      ...createGroup('1', 'Stale Local Title'),
      updatedAt: 1500  // Newer than remote, but local overall is stale
    };
    const remoteGroup = {
      ...createGroup('1', 'Fresh Remote Title'),
      updatedAt: 1000
    };
    const baseGroup = {
      ...createGroup('1'),
      updatedAt: 2000  // Base is newer than local overall
    };

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(
      [localGroup],
      [remoteGroup],
      [baseGroup]
    );

    // Remote should win because local is stale (local max 1500 < base max 2000)
    expect(mergedGroups[0].title).toBe('Fresh Remote Title');
    expect(newLocalGroups).toHaveLength(0);
  });

  it('should trust LWW when local is newer than or equal to base', () => {
    // Normal case: Local has legitimate newer changes
    const localGroup = {
      ...createGroup('1', 'Fresh Local Title'),
      updatedAt: 3000
    };
    const remoteGroup = {
      ...createGroup('1', 'Remote Title'),
      updatedAt: 2000
    };
    const baseGroup = {
      ...createGroup('1'),
      updatedAt: 2000  // Base is older than or equal to local
    };

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(
      [localGroup],
      [remoteGroup],
      [baseGroup]
    );

    // Local should win (LWW trusted)
    expect(mergedGroups[0].title).toBe('Fresh Local Title');
    expect(newLocalGroups).toContainEqual(localGroup);
  });

  it('should NOT trust local creation when local is older than base', () => {
    // Scenario: Local has stale data with a group that was deleted from remote long ago
    const group1 = { ...createGroup('1'), updatedAt: 500 };  // Stale local
    const oldDeletedGroup = { ...createGroup('old', 'Deleted Long Ago'), updatedAt: 100 };

    const local = [group1, oldDeletedGroup];  // Local has an old deleted group
    const remote = [{ ...createGroup('1'), updatedAt: 1000 }];
    const base = [{ ...createGroup('1'), updatedAt: 1000 }];  // Base is newer

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    // Old deleted group should NOT be resurrected (local creation not trusted)
    expect(mergedGroups).toHaveLength(1);
    expect(mergedGroups[0].id).toBe('1');
    expect(newLocalGroups).toHaveLength(0);
  });

  it('should trust local creation when local is newer than or equal to base', () => {
    // Normal case: New group created locally
    const existingGroup = { ...createGroup('1'), updatedAt: 2000 };
    const newGroup = { ...createGroup('new', 'Brand New'), updatedAt: 3000 };

    const local = [existingGroup, newGroup];
    const remote = [existingGroup];
    const base = [{ ...createGroup('1'), updatedAt: 1000 }];  // Base is older

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    // New group should be kept (local creation trusted)
    expect(mergedGroups).toHaveLength(2);
    expect(mergedGroups.find(g => g.id === 'new')).toBeDefined();
    expect(newLocalGroups).toContainEqual(newGroup);
  });

  it('should handle empty base (initial sync) - trust local', () => {
    // Initial sync scenario: Base is empty, both local and remote have data
    const localGroup = { ...createGroup('1', 'Old Local'), updatedAt: 500 };
    const remoteGroup = { ...createGroup('1', 'Fresh Remote'), updatedAt: 1000 };
    const localOnlyGroup = { ...createGroup('local-only', 'Local Only'), updatedAt: 300 };

    const local = [localGroup, localOnlyGroup];
    const remote = [remoteGroup];
    const base: Group[] = [];  // Empty base

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    // With empty base, local is considered "fresh", so local changes are trusted
    // This maintains backward compatibility with existing behavior
    expect(mergedGroups).toHaveLength(2);
    expect(newLocalGroups).toContainEqual(localOnlyGroup);
  });

  it('should NOT trust deletion when local has no overlapping groups with base (Codex P1 fix)', () => {
    // Scenario: Local lost groups A, B but has unrelated new group C
    // This is the case Codex identified where one fresh group could incorrectly
    // mark the entire local snapshot as "trusted"
    const groupA = { ...createGroup('A', 'Group A'), updatedAt: 3000 };
    const groupB = { ...createGroup('B', 'Group B'), updatedAt: 2000 };
    const groupC = { ...createGroup('C', 'New Group C'), updatedAt: 4000 };  // Fresh but unrelated

    const local = [groupC];  // A and B are missing, only C exists
    const remote = [groupA, groupB];
    const base = [groupA, groupB];  // Base had A and B

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    // A and B should NOT be deleted because local has no overlapping groups with base
    // (C is new and doesn't count for staleness comparison)
    // C is also not trusted (no overlapping groups to prove local is current)
    expect(mergedGroups).toHaveLength(2);
    expect(mergedGroups.find(g => g.id === 'A')).toBeDefined();
    expect(mergedGroups.find(g => g.id === 'B')).toBeDefined();
    expect(mergedGroups.find(g => g.id === 'C')).toBeUndefined();  // Not trusted
    expect(newLocalGroups).toHaveLength(0);  // Nothing pushed to remote
  });

  it('should trust deletion when local has overlapping groups that are not stale', () => {
    // Normal deletion: Local kept A (not stale), deleted B, added C
    const groupA = { ...createGroup('A', 'Group A'), updatedAt: 3000 };
    const groupB = { ...createGroup('B', 'Group B'), updatedAt: 2000 };
    const groupC = { ...createGroup('C', 'New Group C'), updatedAt: 4000 };

    const local = [groupA, groupC];  // B was intentionally deleted
    const remote = [groupA, groupB];
    const base = [groupA, groupB];

    const { mergedGroups } = mergeGroupsThreeWay(local, remote, base);

    // B should be deleted because A is not stale (proves local is current)
    expect(mergedGroups).toHaveLength(2);
    expect(mergedGroups.find(g => g.id === 'A')).toBeDefined();
    expect(mergedGroups.find(g => g.id === 'B')).toBeUndefined();
    expect(mergedGroups.find(g => g.id === 'C')).toBeDefined();
  });

  it('should NOT trust deletion when overlapping group is stale', () => {
    // Partial rollback: A rolled back to older version, B is missing
    const groupA_base = { ...createGroup('A', 'Group A'), updatedAt: 3000 };
    const groupA_local = { ...createGroup('A', 'Group A Old'), updatedAt: 2000 };  // Rolled back
    const groupB = { ...createGroup('B', 'Group B'), updatedAt: 2500 };
    const groupC = { ...createGroup('C', 'New Group C'), updatedAt: 4000 };

    const local = [groupA_local, groupC];  // A is stale, B is missing
    const remote = [groupA_base, groupB];
    const base = [groupA_base, groupB];

    const { mergedGroups, newLocalGroups } = mergeGroupsThreeWay(local, remote, base);

    // B should NOT be deleted because A is stale (indicates rollback)
    // C is also not trusted because local has stale data
    expect(mergedGroups).toHaveLength(2);
    expect(mergedGroups.find(g => g.id === 'A')?.title).toBe('Group A');  // Remote wins
    expect(mergedGroups.find(g => g.id === 'B')).toBeDefined();
    expect(mergedGroups.find(g => g.id === 'C')).toBeUndefined();  // Not trusted
    expect(newLocalGroups).toHaveLength(0);  // Nothing pushed to remote
  });
});
