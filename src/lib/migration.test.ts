import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Group } from '@/types';
import { migrateAddUpdatedAt } from './migration';

const LOCAL_STORAGE_KEY = 'staaaash_groups';
const MIGRATION_KEY = 'staaaash_updatedAt_migrated';

describe('migrateAddUpdatedAt', () => {
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
          get: vi.fn((keys: string[], callback: (result: Record<string, unknown>) => void) => {
            const result: Record<string, unknown> = {};
            keys.forEach((key) => {
              result[key] = store[key];
            });
            callback(result);
          }),
          set: vi.fn((data: Record<string, unknown>, callback: () => void) => {
            Object.assign(store, data);
            callback();
          }),
        },
      },
      runtime: {
        lastError: undefined,
      },
    };
  });

  it('initializes updatedAt from createdAt for groups without updatedAt', async () => {
    // Intentionally omitting updatedAt to test migration
    const groups = [
      {
        id: 'g1',
        title: 'Group 1',
        items: [],
        pinned: false,
        collapsed: false,
        order: 0,
        createdAt: 1000,
      },
    ] as unknown as Group[];
    store[LOCAL_STORAGE_KEY] = groups;

    await migrateAddUpdatedAt();

    const migratedGroups = store[LOCAL_STORAGE_KEY] as Group[];
    expect(migratedGroups[0].updatedAt).toBe(1000);
    expect(store[MIGRATION_KEY]).toBe(true);
  });

  it('preserves existing updatedAt values', async () => {
    const groups: Group[] = [
      {
        id: 'g1',
        title: 'Group 1',
        items: [],
        pinned: false,
        collapsed: false,
        order: 0,
        createdAt: 1000,
        updatedAt: 2000,
      },
    ];
    store[LOCAL_STORAGE_KEY] = groups;

    await migrateAddUpdatedAt();

    const migratedGroups = store[LOCAL_STORAGE_KEY] as Group[];
    expect(migratedGroups[0].updatedAt).toBe(2000);
  });

  it('skips migration if already migrated', async () => {
    store[MIGRATION_KEY] = true;
    // Intentionally omitting updatedAt to test that migration is skipped
    const groups = [
      {
        id: 'g1',
        title: 'Group 1',
        items: [],
        pinned: false,
        collapsed: false,
        order: 0,
        createdAt: 1000,
      },
    ] as unknown as Group[];
    store[LOCAL_STORAGE_KEY] = groups;

    await migrateAddUpdatedAt();

    // Groups should remain unchanged (no updatedAt added)
    const storedGroups = store[LOCAL_STORAGE_KEY] as Group[];
    expect(storedGroups[0].updatedAt).toBeUndefined();
  });

  it('marks as migrated when no groups exist', async () => {
    store[LOCAL_STORAGE_KEY] = [];

    await migrateAddUpdatedAt();

    expect(store[MIGRATION_KEY]).toBe(true);
  });

  it('returns early when chrome.storage is not available', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome = { storage: undefined };

    // Should not throw
    await expect(migrateAddUpdatedAt()).resolves.not.toThrow();
  });

  it('throws error when chrome.runtime.lastError is set', async () => {
    // Intentionally omitting updatedAt to test migration with lastError
    const groups = [
      {
        id: 'g1',
        title: 'Group 1',
        items: [],
        pinned: false,
        collapsed: false,
        order: 0,
        createdAt: 1000,
      },
    ] as unknown as Group[];
    store[LOCAL_STORAGE_KEY] = groups;

    // Mock set to trigger lastError
    vi.mocked(chrome.storage.local.set).mockImplementation((_data, callback) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chrome.runtime as any).lastError = { message: 'Storage quota exceeded' };
      callback();
    });

    await expect(migrateAddUpdatedAt()).rejects.toThrow('Storage quota exceeded');
  });
});
