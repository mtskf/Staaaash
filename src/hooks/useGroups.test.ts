import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Group } from '@/types';
import { useGroups } from './useGroups';
import { storage, initFirebaseSync } from '@/lib/storage';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    updateGroups: vi.fn(),
  },
  initFirebaseSync: vi.fn(),
  StorageQuotaError: class extends Error {},
}));

const baseGroup: Group = {
  id: 'g1',
  title: 'Group 1',
  items: [
    { id: 't1', title: 'Tab 1', url: 'https://one.test' },
    { id: 't2', title: 'Tab 2', url: 'https://two.test' },
  ],
  pinned: false,
  collapsed: false,
  order: 2,
  createdAt: 1,
  updatedAt: 1,
};

const secondGroup: Group = {
  id: 'g2',
  title: 'Group 2',
  items: [{ id: 't3', title: 'Tab 3', url: 'https://three.test' }],
  pinned: false,
  collapsed: false,
  order: 1,
  createdAt: 2,
  updatedAt: 2,
};

describe('useGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(storage.get).mockResolvedValue({ groups: [baseGroup, secondGroup] });
    vi.mocked(storage.updateGroups).mockResolvedValue([baseGroup, secondGroup]);
  });

  it('loads groups sorted by order', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    expect(result.current.groups.map((group) => group.id)).toEqual(['g2', 'g1']);
    expect(initFirebaseSync).toHaveBeenCalledTimes(1);
  });

  it('selects previous item when a group is removed', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    act(() => {
      result.current.setSelectedId('g2');
    });

    await act(async () => {
      await result.current.removeGroup('g2');
    });

    expect(result.current.groups.map((group) => group.id)).toEqual(['g1']);
    expect(vi.mocked(storage.updateGroups)).toHaveBeenCalledWith([baseGroup]);
  });

  it('restores a tab and removes it from the group', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    await act(async () => {
      await result.current.restoreTab('g1', 't1');
    });

    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://one.test', active: false });

    const updatedGroup = result.current.groups.find((group) => group.id === 'g1');
    expect(updatedGroup?.items.map((tab) => tab.id)).toEqual(['t2']);
  });
});
