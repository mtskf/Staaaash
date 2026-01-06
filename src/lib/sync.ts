/**
 * Sync utilities - provides retry logic for Firebase operations
 *
 * This module provides utilities for reliable Firebase synchronization:
 * - Exponential backoff retry for initial fetch
 * - Stale result detection via syncId
 */

import type { Group } from '@/types';
import {
  getGroupsFromFirebase,
  subscribeToGroups,
  onAuthStateChanged,
} from './firebase';
import type { User } from './firebase';

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

// Sync state for race condition handling
let syncId = 0;

/**
 * Retry a fetch operation with exponential backoff
 */
export async function retryFetch<T>(
  fn: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_DELAY_MS
): Promise<T | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt + 1}/${maxRetries} failed:`, error);

      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('All fetch retries failed:', lastError);
  return null;
}

// Internal sync state
let pollingUnsubscribe: (() => void) | null = null;
let authUnsubscribe: (() => void) | null = null;
let currentCallback: ((groups: Group[]) => void) | null = null;

/**
 * Start Firebase synchronization with retry logic
 *
 * 1. Performs initial fetch with retry
 * 2. Starts polling for updates
 * 3. Handles auth state changes
 *
 * @param onGroupsUpdated Callback when groups are updated (raw groups, no merge)
 * @returns Cleanup function
 */
export function startSync(onGroupsUpdated: (groups: Group[]) => void): () => void {
  // Increment syncId to invalidate any previous in-flight requests
  syncId++;

  // Clean up existing subscriptions
  if (pollingUnsubscribe) {
    pollingUnsubscribe();
    pollingUnsubscribe = null;
  }
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }

  currentCallback = onGroupsUpdated;

  const performSyncWithId = async (userId: string, activeSyncId: number) => {
    // Phase 1: Initial fetch with retry
    const groups = await retryFetch(() => getGroupsFromFirebase(userId));

    if (activeSyncId !== syncId) {
      console.log('Stale sync result discarded');
      return;
    }

    if (groups !== null) {
      currentCallback?.(groups);
    }

    // Phase 2: Start polling (even if initial fetch failed)
    pollingUnsubscribe = subscribeToGroups(userId, (polledGroups) => {
      if (activeSyncId !== syncId) return;
      currentCallback?.(polledGroups);
    });
  };

  authUnsubscribe = onAuthStateChanged((user: User | null) => {
    // Increment syncId to invalidate any in-flight requests from previous user
    // This prevents stale results from leaking after sign-out or account switch
    const authChangeSyncId = ++syncId;

    if (pollingUnsubscribe) {
      pollingUnsubscribe();
      pollingUnsubscribe = null;
    }

    if (user) {
      // Pass the new syncId to performSync to ensure proper invalidation
      performSyncWithId(user.uid, authChangeSyncId);
    }
  });

  return stopSync;
}

/**
 * Stop Firebase synchronization
 */
export function stopSync(): void {
  syncId++;

  if (pollingUnsubscribe) {
    pollingUnsubscribe();
    pollingUnsubscribe = null;
  }
  if (authUnsubscribe) {
    authUnsubscribe();
    authUnsubscribe = null;
  }
  currentCallback = null;
}
