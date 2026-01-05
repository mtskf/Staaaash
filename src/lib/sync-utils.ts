import type { Group } from '@/types';

export interface MergeResult {
  mergedGroups: Group[];
  newLocalGroups: Group[];
}

/**
 * Performs a 3-way merge of groups: local, remote, and base (last synced).
 *
 * Logic:
 * 1. Remote is the source of truth for existing items (Remote Wins).
 * 2. If a group exists Locally but not Remotely:
 *    a. If it was present in Base (last sync) -> It meant it was deleted Remotely. Action: Delete Locally.
 *    b. If it was NOT in Base -> It means it is a New Local group. Action: Keep Locally & Push to Remote.
 */
export function mergeGroupsThreeWay(
  localGroups: Group[],
  remoteGroups: Group[],
  baseGroups: Group[]
): MergeResult {
  const baseIds = new Set(baseGroups.map(g => g.id));
  const remoteIds = new Set(remoteGroups.map(g => g.id));

  // Start with all remote groups (Remote Wins)
  const mergedGroups: Group[] = [...remoteGroups];
  const newLocalGroups: Group[] = [];

  for (const localGroup of localGroups) {
    if (remoteIds.has(localGroup.id)) {
      // Group exists in both - use Last Write Wins
      const remoteGroup = remoteGroups.find(g => g.id === localGroup.id)!;
      const localUpdated = localGroup.updatedAt ?? localGroup.createdAt;
      const remoteUpdated = remoteGroup.updatedAt ?? remoteGroup.createdAt;

      if (localUpdated > remoteUpdated) {
        // Local is newer - replace remote version in mergedGroups
        const index = mergedGroups.findIndex(g => g.id === localGroup.id);
        mergedGroups[index] = localGroup;
        newLocalGroups.push(localGroup); // Mark for upload to Firebase
      }
      continue;
    }

    // If it's NOT in Remote:
    if (baseIds.has(localGroup.id)) {
      // Case 2a: It was in Base but not in Remote -> Remote Deletion.
      // Action: Do not add to mergedGroups (effectively deletes it locally)
    } else {
      // Case 2b: It was NOT in Base and NOT in Remote -> Local Creation.
      // Action: Keep it
      mergedGroups.push(localGroup);
      newLocalGroups.push(localGroup);
    }
  }

  return { mergedGroups, newLocalGroups };
}
