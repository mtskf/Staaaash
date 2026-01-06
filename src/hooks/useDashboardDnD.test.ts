import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDashboardDnD } from './useDashboardDnD';
import type { Group } from '@/types';
import type { DragEndEvent } from '@dnd-kit/core';

// Mock logic functions
vi.mock('@/lib/logic', () => ({
  mergeGroupsIntoTarget: vi.fn((groups) => groups),
  reorderTabInGroup: vi.fn((groups) => groups),
  moveTabToGroup: vi.fn((groups) => groups),
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
});
