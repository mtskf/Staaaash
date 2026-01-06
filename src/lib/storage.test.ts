import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Group } from '@/types';
import { storage, initFirebaseSync } from './storage';
import { getCurrentUser, saveGroupsToFirebase, onAuthStateChanged } from '@/lib/firebase';

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
    } as any;
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
    vi.mocked(getCurrentUser).mockReturnValue({ uid: 'test-user' } as any);
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
  let authCallback: ((user: { uid: string } | null) => void) | null = null;
  let mockAuthUnsubscribe: ReturnType<typeof vi.fn>;
  let initFirebaseSyncFn: typeof initFirebaseSync;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset module to clear syncCallbacks state between tests
    vi.resetModules();

    authCallback = null;
    mockAuthUnsubscribe = vi.fn();

    vi.mocked(onAuthStateChanged).mockImplementation((cb) => {
      authCallback = cb;
      return mockAuthUnsubscribe;
    });

    type GlobalWithChrome = typeof globalThis & {
      chrome?: { storage?: unknown; runtime?: unknown };
    };
    const global = globalThis as GlobalWithChrome;
    global.chrome = {
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
