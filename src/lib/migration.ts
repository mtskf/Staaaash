import type { Group } from "@/types";

const UPDATED_AT_MIGRATION_KEY = 'staaaash_updatedAt_migrated';

/**
 * Add updatedAt field to existing groups
 * Initialize with createdAt value for backward compatibility
 */
export async function migrateAddUpdatedAt(): Promise<void> {
  // Skip migration in non-extension contexts (e.g., tests)
  if (!chrome.storage?.local) {
    return;
  }

  // Check if already migrated
  const migrated = await new Promise<boolean>((resolve) => {
    chrome.storage.local.get([UPDATED_AT_MIGRATION_KEY], (result: Record<string, unknown>) => {
      resolve(!!result[UPDATED_AT_MIGRATION_KEY]);
    });
  });

  if (migrated) {
    return;
  }

  // Get groups from local storage
  const groups = await new Promise<Group[]>((resolve) => {
    if (!chrome.storage?.local) {
      resolve([]);
      return;
    }
    chrome.storage.local.get(['staaaash_groups'], (result: Record<string, unknown>) => {
      resolve((result['staaaash_groups'] as Group[]) || []);
    });
  });

  if (groups.length === 0) {
    // No data, but mark as migrated
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ [UPDATED_AT_MIGRATION_KEY]: true }, () => resolve());
    });
    return;
  }

  // Initialize updatedAt with createdAt
  const migratedGroups = groups.map(g => ({
    ...g,
    updatedAt: g.updatedAt ?? g.createdAt
  }));

  // Save back
  await new Promise<void>((resolve, reject) => {
    chrome.storage.local.set({ 'staaaash_groups': migratedGroups }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });

  // Mark migration complete
  await new Promise<void>((resolve) => {
    chrome.storage.local.set({ [UPDATED_AT_MIGRATION_KEY]: true }, () => resolve());
  });

  console.log(`Migrated ${groups.length} groups with updatedAt field`);
}
