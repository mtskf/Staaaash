import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardDnD } from './useDashboardDnD';
import type { Group } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';
import * as logic from '@/lib/logic';
import { storage } from '@/lib/storage';
import { toast } from 'sonner';

// Mock logic functions
vi.mock('@/lib/logic', () => ({
  mergeGroupsIntoTarget: vi.fn((groups) => groups),
  reorderTabInGroup: vi.fn((groups) => groups),
  moveTabToGroup: vi.fn((groups) => groups),
}));

// Mock storage
vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
  },
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
  },
}));

const mockGroup1: Group = {
  id: 'g1',
  title: 'Group 1',
  items: [
    { id: 't1', title: 'Tab 1', url: 'https://one.test' },
    { id: 't2', title: 'Tab 2', url: 'https://two.test' },
  ],
  pinned: false,
  collapsed: false,
  order: 0,
  createdAt: 1,
  updatedAt: 1,
};

const mockGroup2: Group = {
  id: 'g2',
  title: 'Group 2',
  items: [{ id: 't3', title: 'Tab 3', url: 'https://three.test' }],
  pinned: false,
  collapsed: false,
  order: 1,
  createdAt: 2,
  updatedAt: 2,
};

describe('useDashboardDnD', () => {
  let mockUpdateGroups: (groups: Group[]) => Promise<void>;
  let shiftPressedRef: React.RefObject<boolean>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateGroups = vi.fn().mockResolvedValue(undefined) as (groups: Group[]) => Promise<void>;
    shiftPressedRef = { current: false };
    // Default: storage returns the same groups as props
    vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup1, mockGroup2] });
  });

  it('returns sensors and handlers', () => {
    const { result } = renderHook(() =>
      useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
    );

    expect(result.current.sensors).toBeDefined();
    expect(result.current.handleDragStart).toBeDefined();
    expect(result.current.handleDragOver).toBeDefined();
    expect(result.current.handleDragEnd).toBeDefined();
  });

  it('sets activeId on drag start', () => {
    const { result } = renderHook(() =>
      useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
    );

    act(() => {
      result.current.handleDragStart({
        active: {
          id: 'g1',
          data: { current: { type: 'Group', group: mockGroup1 } },
        },
      } as unknown as DragEndEvent);
    });

    expect(result.current.activeId).toBe('g1');
    expect(result.current.activeItem).toEqual(mockGroup1);
  });

  it('calls updateGroups on group reorder', async () => {
    const { result } = renderHook(() =>
      useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
    );

    await act(async () => {
      await result.current.handleDragEnd({
        active: {
          id: 'g1',
          data: { current: { type: 'Group' } },
        },
        over: {
          id: 'g2',
          data: { current: { type: 'Group' } },
        },
      } as unknown as DragEndEvent);
    });

    expect(mockUpdateGroups).toHaveBeenCalled();
  });

  it('clears activeId after drag end', async () => {
    const { result } = renderHook(() =>
      useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
    );

    // Start drag
    act(() => {
      result.current.handleDragStart({
        active: {
          id: 'g1',
          data: { current: { type: 'Group', group: mockGroup1 } },
        },
      } as unknown as DragEndEvent);
    });

    expect(result.current.activeId).toBe('g1');

    // End drag
    await act(async () => {
      await result.current.handleDragEnd({
        active: {
          id: 'g1',
          data: { current: { type: 'Group' } },
        },
        over: null,
      } as unknown as DragEndEvent);
    });

    expect(result.current.activeId).toBeNull();
    expect(result.current.activeItem).toBeNull();
  });

  it('does not call updateGroups when over is null', async () => {
    const { result } = renderHook(() =>
      useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
    );

    await act(async () => {
      await result.current.handleDragEnd({
        active: {
          id: 'g1',
          data: { current: { type: 'Group' } },
        },
        over: null,
      } as unknown as DragEndEvent);
    });

    expect(mockUpdateGroups).not.toHaveBeenCalled();
  });

  it('calls mergeGroupsIntoTarget when shift is pressed during group drag', async () => {
    const pinnedGroup: Group = {
      id: 'pinned',
      title: 'Pinned Group',
      items: [{ id: 't1', title: 'Tab 1', url: 'https://one.test' }],
      pinned: true,
      collapsed: false,
      order: 0,
      createdAt: 1,
      updatedAt: 1,
    };
    const unpinnedGroup: Group = {
      id: 'unpinned',
      title: 'Unpinned Group',
      items: [{ id: 't2', title: 'Tab 2', url: 'https://two.test' }],
      pinned: false,
      collapsed: false,
      order: 1,
      createdAt: 2,
      updatedAt: 2,
    };

    shiftPressedRef = { current: true };

    // Mock storage to return the groups
    vi.mocked(storage.get).mockResolvedValue({ groups: [pinnedGroup, unpinnedGroup] });

    // Mock mergeGroupsIntoTarget to return a new array (simulating source removal)
    const mergedGroups = [{ ...unpinnedGroup, items: [...unpinnedGroup.items, ...pinnedGroup.items] }];
    vi.mocked(logic.mergeGroupsIntoTarget).mockReturnValue(mergedGroups);

    const { result } = renderHook(() =>
      useDashboardDnD([pinnedGroup, unpinnedGroup], mockUpdateGroups, shiftPressedRef)
    );

    await act(async () => {
      await result.current.handleDragEnd({
        active: {
          id: 'pinned',
          data: { current: { type: 'Group' } },
        },
        over: {
          id: 'unpinned',
          data: { current: { type: 'Group' } },
        },
      } as unknown as DragEndEvent);
    });

    expect(storage.get).toHaveBeenCalled();
    expect(logic.mergeGroupsIntoTarget).toHaveBeenCalledWith(
      [pinnedGroup, unpinnedGroup],
      'pinned',
      'unpinned'
    );
    expect(mockUpdateGroups).toHaveBeenCalledWith(mergedGroups);
  });

  describe('race condition prevention', () => {
    it('uses fresh groups from storage for merge', async () => {
      const propsGroups = [mockGroup1, mockGroup2];
      // Storage has an updated version with an extra tab
      const freshGroup1 = {
        ...mockGroup1,
        items: [...mockGroup1.items, { id: 't-new', title: 'New Tab', url: 'https://new.test' }],
      };
      const storageGroups = [freshGroup1, mockGroup2];

      vi.mocked(storage.get).mockResolvedValue({ groups: storageGroups });
      const mergedGroups = [{ ...mockGroup2, items: [...mockGroup2.items, ...freshGroup1.items] }];
      vi.mocked(logic.mergeGroupsIntoTarget).mockReturnValue(mergedGroups);

      shiftPressedRef = { current: true };

      const { result } = renderHook(() =>
        useDashboardDnD(propsGroups, mockUpdateGroups, shiftPressedRef)
      );

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: 'g1', data: { current: { type: 'Group' } } },
          over: { id: 'g2', data: { current: { type: 'Group' } } },
        } as unknown as DragEndEvent);
      });

      // Should use storage groups (freshGroup1), not props groups (mockGroup1)
      expect(logic.mergeGroupsIntoTarget).toHaveBeenCalledWith(
        storageGroups,
        'g1',
        'g2'
      );
    });

    it('aborts merge when source is missing from storage', async () => {
      // Storage only has mockGroup2 (mockGroup1 was deleted)
      vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup2] });

      shiftPressedRef = { current: true };

      const { result } = renderHook(() =>
        useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
      );

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: 'g1', data: { current: { type: 'Group' } } },
          over: { id: 'g2', data: { current: { type: 'Group' } } },
        } as unknown as DragEndEvent);
      });

      expect(logic.mergeGroupsIntoTarget).not.toHaveBeenCalled();
      expect(mockUpdateGroups).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it('aborts merge when target is missing from storage', async () => {
      // Storage only has mockGroup1 (mockGroup2 was deleted)
      vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup1] });

      shiftPressedRef = { current: true };

      const { result } = renderHook(() =>
        useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
      );

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: 'g1', data: { current: { type: 'Group' } } },
          over: { id: 'g2', data: { current: { type: 'Group' } } },
        } as unknown as DragEndEvent);
      });

      expect(logic.mergeGroupsIntoTarget).not.toHaveBeenCalled();
      expect(mockUpdateGroups).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });

    it('falls back to props when storage.get fails', async () => {
      vi.mocked(storage.get).mockRejectedValue(new Error('Storage error'));
      const mergedGroups = [{ ...mockGroup2, items: [...mockGroup2.items, ...mockGroup1.items] }];
      vi.mocked(logic.mergeGroupsIntoTarget).mockReturnValue(mergedGroups);

      shiftPressedRef = { current: true };

      const { result } = renderHook(() =>
        useDashboardDnD([mockGroup1, mockGroup2], mockUpdateGroups, shiftPressedRef)
      );

      await act(async () => {
        await result.current.handleDragEnd({
          active: { id: 'g1', data: { current: { type: 'Group' } } },
          over: { id: 'g2', data: { current: { type: 'Group' } } },
        } as unknown as DragEndEvent);
      });

      // Should fall back to props groups
      expect(logic.mergeGroupsIntoTarget).toHaveBeenCalledWith(
        [mockGroup1, mockGroup2],
        'g1',
        'g2'
      );
      expect(mockUpdateGroups).toHaveBeenCalledWith(mergedGroups);
    });
  });
});
