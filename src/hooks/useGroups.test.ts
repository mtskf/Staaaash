import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { Group } from '@/types';
import { useGroups } from './useGroups';
import { storage, initFirebaseSync } from '@/lib/storage';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
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

  it('loads groups with pinned-first sorting', async () => {
    const pinnedGroup: Group = { ...baseGroup, id: 'g-pinned', pinned: true, order: 5 };
    const unpinnedGroup: Group = { ...secondGroup, id: 'g-unpinned', pinned: false, order: 1 };
    vi.mocked(storage.get).mockResolvedValue({ groups: [unpinnedGroup, pinnedGroup] });

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    // Pinned should come first despite higher order value
    expect(result.current.groups.map((group) => group.id)).toEqual(['g-pinned', 'g-unpinned']);
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

  it('maintains pinned-first order after updateGroups (D&D scenario)', async () => {
    const pinnedGroup: Group = { ...baseGroup, id: 'pinned', pinned: true, order: 0 };
    const unpinnedGroup: Group = { ...secondGroup, id: 'unpinned', pinned: false, order: 1 };
    vi.mocked(storage.get).mockResolvedValue({ groups: [pinnedGroup, unpinnedGroup] });

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    // Simulate D&D reorder that puts unpinned first (bad order from caller)
    const reorderedBadly = [unpinnedGroup, pinnedGroup];

    await act(async () => {
      await result.current.updateGroups(reorderedBadly);
    });

    // Should still be pinned-first in state
    expect(result.current.groups.map((g) => g.id)).toEqual(['pinned', 'unpinned']);
  });

  it('re-sorts after updateGroupData pin toggle', async () => {
    const unpinned1: Group = { ...baseGroup, id: 'u1', pinned: false, order: 0 };
    const unpinned2: Group = { ...secondGroup, id: 'u2', pinned: false, order: 1 };
    vi.mocked(storage.get).mockResolvedValue({ groups: [unpinned1, unpinned2] });

    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    // Pin the second group
    await act(async () => {
      await result.current.updateGroupData('u2', { pinned: true });
    });

    // u2 should now be first (pinned)
    expect(result.current.groups[0].id).toBe('u2');
    expect(result.current.groups[0].pinned).toBe(true);
  });

  it('restores a group in a new window and removes the group', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    await act(async () => {
      await result.current.restoreGroup('g1');
    });

    // Should open a new window with all tab URLs
    expect(chrome.windows.create).toHaveBeenCalledWith({
      url: ['https://one.test', 'https://two.test'],
      focused: true,
    });

    // Group should be removed
    expect(result.current.groups.map((g) => g.id)).toEqual(['g2']);
  });

  it('opens a group without removing it from collections', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    await act(async () => {
      await result.current.openGroup('g1');
    });

    // Should open a new window with all tab URLs
    expect(chrome.windows.create).toHaveBeenCalledWith({
      url: ['https://one.test', 'https://two.test'],
      focused: true,
    });

    // Group should NOT be removed
    expect(result.current.groups.map((g) => g.id)).toEqual(['g2', 'g1']);
  });

  it('opens a tab without removing it from the group', async () => {
    const { result } = renderHook(() => useGroups());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    await act(async () => {
      await result.current.openTab('g1', 't1');
    });

    // Should open the tab
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: 'https://one.test', active: false });

    // Tab should NOT be removed from the group
    const group = result.current.groups.find((g) => g.id === 'g1');
    expect(group?.items.map((t) => t.id)).toEqual(['t1', 't2']);
  });
});
