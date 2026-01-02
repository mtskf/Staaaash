import type { Group } from "@/types";
import { getCurrentUser, getGroupsFromFirebase, saveGroupsToFirebase } from './firebase';

const SYNC_STORAGE_KEY = 'groups';
const MIGRATION_FLAG_KEY = 'staaaash_migrated';

/**
 * Check if we have data in chrome.storage.sync that needs migration
 */
export async function checkSyncStorageData(): Promise<Group[]> {
  return new Promise((resolve) => {
    if (!chrome.storage?.sync) {
      resolve([]);
      return;
    }

    chrome.storage.sync.get([SYNC_STORAGE_KEY], (result: Record<string, unknown>) => {
      if (chrome.runtime.lastError) {
        console.warn('Error reading sync storage:', chrome.runtime.lastError);
        resolve([]);
        return;
      }
      resolve((result[SYNC_STORAGE_KEY] as Group[]) || []);
    });
  });
}

/**
 * Check if migration has already been performed
 */
async function hasMigrated(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!chrome.storage?.local) {
      resolve(false);
      return;
    }

    chrome.storage.local.get([MIGRATION_FLAG_KEY], (result: Record<string, unknown>) => {
      resolve(!!result[MIGRATION_FLAG_KEY]);
    });
  });
}

/**
 * Mark migration as complete
 */
async function markMigrated(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [MIGRATION_FLAG_KEY]: true }, () => {
      resolve();
    });
  });
}

/**
 * Clear data from chrome.storage.sync after successful migration
 */
async function clearSyncStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.sync.remove([SYNC_STORAGE_KEY], () => {
      resolve();
    });
  });
}

/**
 * Merge two arrays of groups, preferring newer items by createdAt
 */
function mergeGroups(localGroups: Group[], firebaseGroups: Group[]): Group[] {
  const mergedMap = new Map<string, Group>();

  // Add all local groups
  localGroups.forEach(group => {
    mergedMap.set(group.id, group);
  });

  // Merge Firebase groups, preferring newer by createdAt
  firebaseGroups.forEach(group => {
    const existing = mergedMap.get(group.id);
    if (!existing || group.createdAt > existing.createdAt) {
      mergedMap.set(group.id, group);
    }
  });

  return Array.from(mergedMap.values());
}

/**
 * Migrate data from chrome.storage.sync to Firebase
 * This should be called after user signs in for the first time
 */
export async function migrateToFirebase(): Promise<{ migrated: boolean; groupCount: number }> {
  const user = getCurrentUser();
  if (!user) {
    return { migrated: false, groupCount: 0 };
  }

  // Check if already migrated
  const alreadyMigrated = await hasMigrated();
  if (alreadyMigrated) {
    return { migrated: false, groupCount: 0 };
  }

  try {
    // Get data from sync storage
    const syncGroups = await checkSyncStorageData();

    if (syncGroups.length === 0) {
      // No data to migrate, but mark as migrated
      await markMigrated();
      return { migrated: false, groupCount: 0 };
    }

    // Get existing Firebase data
    const firebaseGroups = await getGroupsFromFirebase(user.uid);

    // Merge data (prefer newer items)
    const mergedGroups = mergeGroups(syncGroups, firebaseGroups);

    // Save merged data to Firebase
    await saveGroupsToFirebase(user.uid, mergedGroups);

    // Clear sync storage to free up quota
    await clearSyncStorage();

    // Mark migration as complete
    await markMigrated();

    console.log(`Migrated ${syncGroups.length} groups from sync storage to Firebase`);

    return { migrated: true, groupCount: syncGroups.length };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}
