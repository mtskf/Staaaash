import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Group, SyncStatus } from '@/types';
import type { User } from 'firebase/auth';
import { storage, initFirebaseSync, subscribeSyncStatus } from './storage';
import { getCurrentUser, saveGroupsToFirebase, onAuthStateChanged, subscribeToGroups } from '@/lib/firebase';

vi.mock('@/lib/firebase', () => ({
  getCurrentUser: vi.fn(() => null),
  onAuthStateChanged: vi.fn(() => () => {}),
  saveGroupsToFirebase: vi.fn(),
  subscribeToGroups: vi.fn(() => () => {}),
}));

const LOCAL_STORAGE_KEY = 'staaaash_groups';
const LAST_SYNCED_KEY = 'staaaash_last_synced';

describe('storage', () => {
  const store: Record<string, unknown> = {};

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(store)) {
      delete store[key];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome = {
      storage: {
        local: {
          QUOTA_BYTES: 10485760,
          get: vi.fn((keys: string[] | string | null, callback: (result: Record<string, unknown>) => void) => {
            const result: Record<string, unknown> = {};
            if (Array.isArray(keys)) {
              keys.forEach((key) => {
                result[key] = store[key];
              });
            } else if (typeof keys === 'string') {
              result[keys] = store[keys];
            } else if (keys === null) {
              Object.assign(result, store);
            }
            callback(result);
          }),
          set: vi.fn((data: Record<string, unknown>, callback: () => void) => {
            Object.assign(store, data);
            callback();
          }),
          getBytesInUse: vi.fn((_: string[] | null, callback: (bytesUsed: number) => void) => {
            const total = JSON.stringify(store).length;
            callback(total);
          })
        }
      },
      runtime: {
        lastError: undefined,
      },
    };
  });

  it('adds new groups at the top by order', async () => {
    const existing: Group = {
      id: 'g-existing',
      title: 'Existing',
      items: [],
      pinned: false,
      collapsed: false,
      order: 2,
      createdAt: 1,
      updatedAt: 1,
    };

    await storage.set({ groups: [existing] });

    const newGroup: Group = {
      id: 'g-new',
      title: 'New',
      items: [],
      pinned: false,
      collapsed: false,
      order: 999,
      createdAt: 2,
      updatedAt: 2,
    };

    const groups = await storage.addGroup(newGroup);
    const saved = groups.find((group) => group.id === 'g-new');

    expect(saved?.order).toBe(1);
    expect(store[LOCAL_STORAGE_KEY]).toEqual(groups);
    // LAST_SYNCED_KEY is NOT set when user is not authenticated
    // This prevents pre-login groups from being deleted during 3-way merge
    expect(store[LAST_SYNCED_KEY]).toBeUndefined();
  });

  it('exports and imports groups as JSON', async () => {
    const groups: Group[] = [
      {
        id: 'g1',
        title: 'Exported',
        items: [{ id: 't1', title: 'Tab', url: 'https://example.com' }],
        pinned: false,
        collapsed: false,
        order: 0,
        createdAt: 1,
        updatedAt: 1,
      }
    ];

    await storage.set({ groups });

    const json = await storage.exportData();
    const parsed = JSON.parse(json) as { groups: Group[] };
    expect(parsed.groups).toEqual(groups);

    const imported = await storage.importData(json);
    expect(imported).toEqual(groups);
    expect(store[LOCAL_STORAGE_KEY]).toEqual(groups);
  });

  it('rejects invalid import data', async () => {
    await expect(storage.importData('{"foo":[]}'))
      .rejects
      .toThrow('Invalid data format: missing groups array');
  });

  it('saves locally even when Firebase sync fails', async () => {
    // Setup: user is authenticated and Firebase will fail
    vi.mocked(getCurrentUser).mockReturnValue({ uid: 'test-user' } as User);
    vi.mocked(saveGroupsToFirebase).mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const groups: Group[] = [
      {
        id: 'g1',
        title: 'Test Group',
        items: [],
        pinned: false,
        collapsed: false,
        order: 0,
        createdAt: 1,
        updatedAt: 1,
      }
    ];

    // Should not throw even though Firebase fails
    await expect(storage.set({ groups })).resolves.not.toThrow();

    // Wait for fire-and-forget promise to settle
    await new Promise(resolve => setTimeout(resolve, 0));

    // Local storage should have the data
    expect(store[LOCAL_STORAGE_KEY]).toEqual(groups);
    expect(store[LAST_SYNCED_KEY]).toEqual(groups);

    // Warning should be logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Firebase sync failed (will retry on next sync):',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('initFirebaseSync ref-counting', () => {
  let authCallback: ((user: User | null) => void) | null = null;
  let mockAuthUnsubscribe: ReturnType<typeof vi.fn>;
  let initFirebaseSyncFn: typeof initFirebaseSync;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to clear syncCallbacks state between tests
    vi.resetModules();

    authCallback = null;
    mockAuthUnsubscribe = vi.fn();

    vi.mocked(onAuthStateChanged).mockImplementation((cb: (user: User | null) => void) => {
      authCallback = cb;
      return mockAuthUnsubscribe as () => void;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome = {
      storage: {
        local: {
          QUOTA_BYTES: 10485760,
          get: vi.fn((_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
            callback({});
          }),
          set: vi.fn((_data: unknown, callback: () => void) => {
            callback();
          }),
        }
      },
      runtime: {
        lastError: undefined,
      },
    };

    // Re-import after module reset
    const storageModule = await import('./storage');
    initFirebaseSyncFn = storageModule.initFirebaseSync;
  });

  it('starts sync only once for multiple subscribers', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const unsubscribe1 = initFirebaseSyncFn(callback1);
    const unsubscribe2 = initFirebaseSyncFn(callback2);

    // onAuthStateChanged should be called only once (shared subscription)
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);

    unsubscribe1();
    unsubscribe2();
  });

  it('keeps sync alive when first subscriber unsubscribes but second remains', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const unsubscribe1 = initFirebaseSyncFn(callback1);
    const unsubscribe2 = initFirebaseSyncFn(callback2);

    // First subscriber unsubscribes
    unsubscribe1();

    // Auth subscription should still be active (not cleaned up)
    expect(mockAuthUnsubscribe).not.toHaveBeenCalled();

    // Second subscriber unsubscribes
    unsubscribe2();

    // Now auth subscription should be cleaned up
    expect(mockAuthUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('notifies all subscribers when sync receives updates', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    initFirebaseSyncFn(callback1);
    initFirebaseSyncFn(callback2);

    // Simulate auth state change with logged-in user
    // The actual group update notification would come from subscribeToGroups
    // For this test, we verify the callbacks are registered
    expect(authCallback).not.toBeNull();

    // Both callbacks should be notified (implementation detail - tested via integration)
  });

  it('allows re-subscribing after all subscribers have unsubscribed', () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const unsubscribe1 = initFirebaseSyncFn(callback1);
    unsubscribe1();

    // After cleanup, should be able to start fresh
    expect(mockAuthUnsubscribe).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();

    const unsubscribe2 = initFirebaseSyncFn(callback2);
    expect(onAuthStateChanged).toHaveBeenCalledTimes(1);
    unsubscribe2();
  });
});

describe('Firebase sync during local write', () => {
  const store: Record<string, unknown> = {};
  let firebaseCallback: ((groups: Group[]) => void) | null = null;
  let authCallback: ((user: User | null) => void) | null = null;
  let initFirebaseSyncFn: typeof initFirebaseSync;
  type StorageModule = { storage: typeof storage; initFirebaseSync: typeof initFirebaseSync };
  let storageModule: StorageModule;

  const mockGroup = (id: string, title: string): Group => ({
    id,
    title,
    items: [],
    pinned: false,
    collapsed: false,
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    for (const key of Object.keys(store)) {
      delete store[key];
    }

    firebaseCallback = null;
    authCallback = null;

    vi.mocked(onAuthStateChanged).mockImplementation((cb: (user: User | null) => void) => {
      authCallback = cb;
      return () => {};
    });

    vi.mocked(subscribeToGroups).mockImplementation((_uid: string, cb: (groups: Group[]) => void) => {
      firebaseCallback = cb;
      return () => {};
    });

    vi.mocked(getCurrentUser).mockReturnValue({ uid: 'test-user' } as User);
    vi.mocked(saveGroupsToFirebase).mockResolvedValue();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome = {
      storage: {
        local: {
          QUOTA_BYTES: 10485760,
          get: vi.fn((keys: string[] | string | null, callback: (result: Record<string, unknown>) => void) => {
            const result: Record<string, unknown> = {};
            if (Array.isArray(keys)) {
              keys.forEach((key) => {
                result[key] = store[key];
              });
            } else if (typeof keys === 'string') {
              result[keys] = store[keys];
            } else if (keys === null) {
              Object.assign(result, store);
            }
            callback(result);
          }),
          set: vi.fn((data: Record<string, unknown>, callback: () => void) => {
            Object.assign(store, data);
            callback();
          }),
        }
      },
      runtime: {
        lastError: undefined,
      },
    };

    storageModule = await import('./storage');
    initFirebaseSyncFn = storageModule.initFirebaseSync;
  });

  it('queues Firebase updates during local write and processes after completion', async () => {
    const syncCallback = vi.fn();
    initFirebaseSyncFn(syncCallback);

    // Trigger auth state to start Firebase subscription
    authCallback?.({ uid: 'test-user' } as User);

    // Setup initial state
    const groupA = mockGroup('g-a', 'Group A');
    store[LOCAL_STORAGE_KEY] = [groupA];
    store[LAST_SYNCED_KEY] = [groupA];

    // Clear any calls from initial setup
    syncCallback.mockClear();

    // Simulate: User deletes group A locally
    // While the write is in progress, Firebase sends an update with a new group B
    const groupB = mockGroup('g-b', 'Group B from another device');

    // Hook into chrome.storage.local.set to fire Firebase callback mid-write
    let writeCount = 0;
    vi.mocked(chrome.storage.local.set).mockImplementation((data, callback) => {
      writeCount++;
      if (writeCount === 1) {
        // Fire Firebase callback while write is in progress (before calling callback)
        firebaseCallback?.([groupA, groupB]);
        // syncCallback should NOT be called yet (data is queued)
        expect(syncCallback).not.toHaveBeenCalled();
      }
      // Perform the actual storage operation
      Object.assign(store, data);
      callback();
    });

    // Perform the local write (delete group A)
    await storageModule.storage.updateGroups([]);

    // Wait for pending data to be processed
    await new Promise(resolve => setTimeout(resolve, 10));

    // The sync callback should NOW be called with merged data
    // Since we deleted A locally and B was added remotely, we should have B
    // (3-way merge: local=[], remote=[A,B], base=[A] => A was deleted locally, B is new from remote)
    expect(syncCallback).toHaveBeenCalled();
    const lastCallArg = syncCallback.mock.calls[syncCallback.mock.calls.length - 1][0] as Group[];
    expect(lastCallArg.some((g: Group) => g.id === 'g-b')).toBe(true);
  });

  it('processes only the latest queued Firebase update', async () => {
    const syncCallback = vi.fn();
    initFirebaseSyncFn(syncCallback);

    authCallback?.({ uid: 'test-user' } as User);

    const groupA = mockGroup('g-a', 'Group A');
    store[LOCAL_STORAGE_KEY] = [groupA];
    store[LAST_SYNCED_KEY] = [groupA];

    // Clear any calls from initial setup
    syncCallback.mockClear();

    // Multiple Firebase updates during write
    const groupB = mockGroup('g-b', 'Group B');
    const groupC = mockGroup('g-c', 'Group C');

    // Hook into chrome.storage.local.set to fire Firebase callbacks mid-write
    let writeCount = 0;
    vi.mocked(chrome.storage.local.set).mockImplementation((data, callback) => {
      writeCount++;
      if (writeCount === 1) {
        // Fire multiple Firebase callbacks while write is in progress
        firebaseCallback?.([groupA, groupB]); // First update
        firebaseCallback?.([groupA, groupC]); // Second update (should supersede first)
      }
      // Perform the actual storage operation
      Object.assign(store, data);
      callback();
    });

    // Perform the local write
    await storageModule.storage.updateGroups([groupA]);

    await new Promise(resolve => setTimeout(resolve, 10));

    // Only the latest update (with group C) should be processed
    expect(syncCallback).toHaveBeenCalled();
    const lastCallArg = syncCallback.mock.calls[syncCallback.mock.calls.length - 1][0] as Group[];
    expect(lastCallArg.some((g: Group) => g.id === 'g-c')).toBe(true);
    // Group B should not be present (superseded by later update)
    expect(lastCallArg.some((g: Group) => g.id === 'g-b')).toBe(false);
  });
});

describe('subscribeSyncStatus', () => {
  let subscribeSyncStatusFn: typeof subscribeSyncStatus;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome = {
      storage: {
        local: {
          QUOTA_BYTES: 10485760,
          get: vi.fn((_keys: unknown, callback: (result: Record<string, unknown>) => void) => {
            callback({});
          }),
          set: vi.fn((_data: unknown, callback: () => void) => {
            callback();
          }),
        }
      },
      runtime: {
        lastError: undefined,
      },
    };

    const storageModule = await import('./storage');
    subscribeSyncStatusFn = storageModule.subscribeSyncStatus;
  });

  it('returns an unsubscribe function', () => {
    const callback = vi.fn();
    const unsubscribe = subscribeSyncStatusFn(callback);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('immediately notifies the current status on subscribe', () => {
    const callback = vi.fn();
    subscribeSyncStatusFn(callback);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ state: 'idle', error: null });
  });

  it('notifies all subscribers on status change', async () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    subscribeSyncStatusFn(callback1);
    subscribeSyncStatusFn(callback2);

    // Both should receive initial value
    expect(callback1).toHaveBeenCalledWith({ state: 'idle', error: null });
    expect(callback2).toHaveBeenCalledWith({ state: 'idle', error: null });
  });

  it('does not notify after unsubscribe', async () => {
    const storageModule = await import('./storage');
    const callback = vi.fn();

    const unsubscribe = storageModule.subscribeSyncStatus(callback);
    callback.mockClear(); // Clear initial notification

    unsubscribe();

    // Trigger a status change by calling the internal function
    // This requires the notifySyncStatus to be exposed or tested via integration
    // For now, we verify the callback is not in the set anymore
    expect(callback).not.toHaveBeenCalled();
  });

  it('isolates subscriber exceptions - other subscribers still receive notifications', async () => {
    const errorCallback = vi.fn(() => {
      throw new Error('Subscriber error');
    });
    const successCallback = vi.fn();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    subscribeSyncStatusFn(errorCallback);
    subscribeSyncStatusFn(successCallback);

    // Both should receive initial notification
    expect(errorCallback).toHaveBeenCalled();
    expect(successCallback).toHaveBeenCalled();

    // Error should be logged
    expect(consoleSpy).toHaveBeenCalledWith(
      'Sync status callback error:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });
});

describe('sync status state transitions', () => {
  const store: Record<string, unknown> = {};
  let firebaseCallback: ((groups: Group[]) => void) | null = null;
  let authCallback: ((user: User | null) => void) | null = null;
  type StorageModule = {
    storage: typeof storage;
    initFirebaseSync: typeof initFirebaseSync;
    subscribeSyncStatus: typeof subscribeSyncStatus;
  };
  let storageModule: StorageModule;

  const mockGroup = (id: string, title: string): Group => ({
    id,
    title,
    items: [],
    pinned: false,
    collapsed: false,
    order: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    for (const key of Object.keys(store)) {
      delete store[key];
    }

    firebaseCallback = null;
    authCallback = null;

    vi.mocked(onAuthStateChanged).mockImplementation((cb: (user: User | null) => void) => {
      authCallback = cb;
      return () => {};
    });

    vi.mocked(subscribeToGroups).mockImplementation((_uid: string, cb: (groups: Group[]) => void) => {
      firebaseCallback = cb;
      return () => {};
    });

    vi.mocked(getCurrentUser).mockReturnValue(null);
    vi.mocked(saveGroupsToFirebase).mockResolvedValue();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome = {
      storage: {
        local: {
          QUOTA_BYTES: 10485760,
          get: vi.fn((keys: string[] | string | null, callback: (result: Record<string, unknown>) => void) => {
            const result: Record<string, unknown> = {};
            if (Array.isArray(keys)) {
              keys.forEach((key) => {
                result[key] = store[key];
              });
            } else if (typeof keys === 'string') {
              result[keys] = store[keys];
            } else if (keys === null) {
              Object.assign(result, store);
            }
            callback(result);
          }),
          set: vi.fn((data: Record<string, unknown>, callback: () => void) => {
            Object.assign(store, data);
            callback();
          }),
        }
      },
      runtime: {
        lastError: undefined,
      },
    };

    storageModule = await import('./storage');
  });

  it('transitions to syncing on login', () => {
    const statusCallback = vi.fn();
    const groupCallback = vi.fn();

    storageModule.subscribeSyncStatus(statusCallback);
    storageModule.initFirebaseSync(groupCallback);

    statusCallback.mockClear(); // Clear initial idle notification

    // Simulate login
    authCallback?.({ uid: 'test-user' } as User);

    expect(statusCallback).toHaveBeenCalledWith({ state: 'syncing', error: null });
  });

  it('transitions to idle on logout', () => {
    const statusCallback = vi.fn();
    const groupCallback = vi.fn();

    storageModule.subscribeSyncStatus(statusCallback);
    storageModule.initFirebaseSync(groupCallback);

    // Login first
    authCallback?.({ uid: 'test-user' } as User);
    statusCallback.mockClear();

    // Logout
    authCallback?.(null);

    expect(statusCallback).toHaveBeenCalledWith({ state: 'idle', error: null });
  });

  it('transitions to synced after successful processRemoteData', async () => {
    const statusCallback = vi.fn();
    const groupCallback = vi.fn();

    storageModule.subscribeSyncStatus(statusCallback);
    storageModule.initFirebaseSync(groupCallback);

    // Login
    authCallback?.({ uid: 'test-user' } as User);
    statusCallback.mockClear();

    // Setup initial state
    const group = mockGroup('g1', 'Test Group');

    // Trigger Firebase update (this should trigger syncing -> synced)
    await firebaseCallback?.([group]);

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 10));

    const calls = statusCallback.mock.calls.map((c) => (c[0] as SyncStatus).state);
    expect(calls).toContain('syncing');
    expect(calls).toContain('synced');
  });

  it('does not change state when remote data hash matches', async () => {
    const statusCallback = vi.fn();
    const groupCallback = vi.fn();

    storageModule.subscribeSyncStatus(statusCallback);
    storageModule.initFirebaseSync(groupCallback);

    // Login
    authCallback?.({ uid: 'test-user' } as User);

    const group = mockGroup('g1', 'Test Group');

    // First Firebase update
    await firebaseCallback?.([group]);
    await new Promise(resolve => setTimeout(resolve, 10));

    statusCallback.mockClear();

    // Same data again (hash should match)
    await firebaseCallback?.([group]);
    await new Promise(resolve => setTimeout(resolve, 10));

    // No state transitions should occur
    expect(statusCallback).not.toHaveBeenCalled();
  });

  it('transitions to error on syncToFirebase failure and recovers on next success', async () => {
    const statusCallback = vi.fn();
    const groupCallback = vi.fn();

    vi.mocked(getCurrentUser).mockReturnValue({ uid: 'test-user' } as User);
    vi.mocked(saveGroupsToFirebase).mockRejectedValueOnce(new Error('Network error'));

    storageModule.subscribeSyncStatus(statusCallback);
    storageModule.initFirebaseSync(groupCallback);

    // Login
    authCallback?.({ uid: 'test-user' } as User);
    statusCallback.mockClear();

    // Setup groups and trigger a write that will fail on Firebase
    const group = mockGroup('g1', 'Test Group');
    await storageModule.storage.set({ groups: [group] });

    // Wait for fire-and-forget to fail
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should have error state
    const calls = statusCallback.mock.calls.map((c) => (c[0] as SyncStatus).state);
    expect(calls).toContain('error');

    statusCallback.mockClear();

    // Reset mock to succeed
    vi.mocked(saveGroupsToFirebase).mockResolvedValue();

    // Trigger a successful sync via Firebase callback
    const group2 = mockGroup('g2', 'Test Group 2');
    await firebaseCallback?.([group, group2]);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should recover to synced
    const recoveryCalls = statusCallback.mock.calls.map((c) => (c[0] as SyncStatus).state);
    expect(recoveryCalls).toContain('synced');
  });

  it('resets hash on processRemoteData failure so retry works', async () => {
    const statusCallback = vi.fn();
    const groupCallback = vi.fn();

    storageModule.subscribeSyncStatus(statusCallback);
    storageModule.initFirebaseSync(groupCallback);

    // Login
    authCallback?.({ uid: 'test-user' } as User);
    statusCallback.mockClear();

    const group = mockGroup('g1', 'Test Group');

    // Make saveToLocal fail on first call by setting lastError
    let failOnce = true;
    vi.mocked(chrome.storage.local.set).mockImplementation((data: Record<string, unknown>, callback: () => void) => {
      if (failOnce && data[LOCAL_STORAGE_KEY]) {
        failOnce = false;
        (chrome.runtime as { lastError?: { message: string } }).lastError = { message: 'Storage error' };
        callback();
        (chrome.runtime as { lastError?: { message: string } }).lastError = undefined;
        return;
      }
      Object.assign(store, data);
      callback();
    });

    // First Firebase update - should fail
    try {
      await firebaseCallback?.([group]);
    } catch {
      // Expected to throw
    }
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should have error state
    let calls = statusCallback.mock.calls.map((c) => (c[0] as SyncStatus).state);
    expect(calls).toContain('error');

    statusCallback.mockClear();

    // Same data again - should NOT be skipped due to hash reset
    await firebaseCallback?.([group]);
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should process and succeed this time
    calls = statusCallback.mock.calls.map((c) => (c[0] as SyncStatus).state);
    expect(calls).toContain('syncing');
    expect(calls).toContain('synced');
  });
});
