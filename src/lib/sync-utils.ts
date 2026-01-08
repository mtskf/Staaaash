import type { Group } from '@/types';

export interface MergeResult {
  mergedGroups: Group[];
  newLocalGroups: Group[];
}

/**
 * Performs a 3-way merge of groups: local, remote, and base (last synced).
 *
 * Logic:
 * 1. Remote is the source of truth for existing items, with LWW (Last Write Wins) for conflicts.
 * 2. If a group exists Locally but not Remotely:
 *    a. If it was present in Base (last sync) -> It was deleted Remotely. Action: Delete Locally.
 *    b. If it was NOT in Base -> It is a New Local group. Action: Keep Locally & Push to Remote.
 * 3. If a group exists Remotely but not Locally:
 *    a. If it was present in Base -> It was deleted Locally. Action: Delete from merged result.
 *    b. If it was NOT in Base -> It is a New Remote group. Action: Keep in merged result.
 */
export function mergeGroupsThreeWay(
  localGroups: Group[],
  remoteGroups: Group[],
  baseGroups: Group[]
): MergeResult {
  const baseIds = new Set(baseGroups.map(g => g.id));
  const localIds = new Set(localGroups.map(g => g.id));
  const remoteIds = new Set(remoteGroups.map(g => g.id));

  // Start with remote groups, but filter out locally deleted ones
  // Local Deletion: In Base, NOT in Local, still in Remote -> Remove from merged
  const mergedGroups: Group[] = remoteGroups.filter(remoteGroup => {
    const wasInBase = baseIds.has(remoteGroup.id);
    const isInLocal = localIds.has(remoteGroup.id);
    // If it was in base but not in local, it was deleted locally
    if (wasInBase && !isInLocal) {
      return false; // Exclude from merged (local deletion wins)
    }
    return true;
  });

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
