import type { Group } from '@/types';

export interface MergeResult {
  mergedGroups: Group[];
  newLocalGroups: Group[];
}

/**
 * Check if local data can be trusted by comparing overlapping groups with base.
 *
 * Returns true if:
 * - There are overlapping groups between local and base, AND
 * - None of the overlapping groups in local are older than in base
 *
 * This prevents data loss when local storage has partially stale data
 * (e.g., some groups rolled back but others are new).
 */
function canTrustLocalChanges(localGroups: Group[], baseGroups: Group[]): boolean {
  const baseMap = new Map(baseGroups.map(g => [g.id, g]));

  // Find groups that exist in both local and base
  const overlappingGroups = localGroups.filter(lg => baseMap.has(lg.id));

  if (overlappingGroups.length === 0) {
    // No overlapping groups - can't determine staleness from comparison
    // Trust local if base is empty (initial state), otherwise don't trust
    return baseGroups.length === 0;
  }

  // Check if any overlapping group in local is older than in base (indicates rollback)
  const hasStaleGroup = overlappingGroups.some(lg => {
    const bg = baseMap.get(lg.id)!;
    const localTimestamp = lg.updatedAt ?? lg.createdAt ?? 0;
    const baseTimestamp = bg.updatedAt ?? bg.createdAt ?? 0;
    return localTimestamp < baseTimestamp;
  });

  return !hasStaleGroup;
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
 *
 * Protection against stale local data:
 * - Staleness is determined per-group by comparing overlapping groups between local and base.
 * - If any overlapping group in local is older than in base, local changes are not trusted.
 * - This prevents data loss when local storage has partially stale data (e.g., after extension reload).
 */
export function mergeGroupsThreeWay(
  localGroups: Group[],
  remoteGroups: Group[],
  baseGroups: Group[]
): MergeResult {
  const baseIds = new Set(baseGroups.map(g => g.id));
  const localIds = new Set(localGroups.map(g => g.id));
  const remoteIds = new Set(remoteGroups.map(g => g.id));

  // Check if local data can be trusted by comparing overlapping groups with base
  const trustLocalChanges = canTrustLocalChanges(localGroups, baseGroups);

  // Start with remote groups, but filter out locally deleted ones (if trusted)
  // Local Deletion: In Base, NOT in Local, still in Remote -> Remove from merged
  const mergedGroups: Group[] = remoteGroups.filter(remoteGroup => {
    const wasInBase = baseIds.has(remoteGroup.id);
    const isInLocal = localIds.has(remoteGroup.id);
    // If it was in base but not in local, it was deleted locally
    if (wasInBase && !isInLocal) {
      // Only trust local deletion if local data is not stale
      if (trustLocalChanges) {
        return false; // Exclude from merged (local deletion wins)
      }
      // Local is stale - keep remote group (don't trust local deletion)
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

      if (localUpdated > remoteUpdated && trustLocalChanges) {
        // Local is newer AND local data is not stale - replace remote version
        const index = mergedGroups.findIndex(g => g.id === localGroup.id);
        mergedGroups[index] = localGroup;
        newLocalGroups.push(localGroup); // Mark for upload to Firebase
      }
      // If local is stale (trustLocalChanges=false), keep remote version
      continue;
    }

    // If it's NOT in Remote:
    if (baseIds.has(localGroup.id)) {
      // Case 2a: It was in Base but not in Remote -> Remote Deletion.
      // Action: Do not add to mergedGroups (effectively deletes it locally)
    } else {
      // Case 2b: It was NOT in Base and NOT in Remote -> Local Creation.
      // Only trust if local data is not stale (prevents deleted groups from being resurrected)
      if (trustLocalChanges) {
        mergedGroups.push(localGroup);
        newLocalGroups.push(localGroup);
      }
      // If local is stale, don't add (could be a deleted group in old data)
    }
  }

  return { mergedGroups, newLocalGroups };
}
