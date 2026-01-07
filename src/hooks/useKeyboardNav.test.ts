import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardNav } from './useKeyboardNav';
import type { Group } from '@/types';
import type { FlattenedItem } from './useGroups';

// Mock logic functions
vi.mock('@/lib/logic', () => ({
  reorderGroup: vi.fn((groups) => groups),
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

describe('useKeyboardNav', () => {
  let mockUpdateGroups: (groups: Group[]) => Promise<void>;
  let mockUpdateGroupData: (id: string, updates: Partial<Group>) => Promise<void>;
  let mockRestoreGroup: (id: string) => Promise<void>;
  let mockRestoreTab: (groupId: string, tabId: string) => Promise<void>;
  let mockOpenGroup: (id: string) => Promise<void>;
  let mockOpenTab: (groupId: string, tabId: string) => Promise<void>;
  let mockRemoveGroup: (id: string) => Promise<void>;
  let mockRemoveTab: (groupId: string, tabId: string) => Promise<void>;
  let mockSetRenamingGroupId: (id: string | null) => void;
  let mockSetSelectedId: (id: string | null) => void;
  let searchInputRef: React.RefObject<HTMLInputElement | null>;

  const createFlattenedItems = (groups: Group[]): FlattenedItem[] => {
    const items: FlattenedItem[] = [];
    groups.forEach(group => {
      items.push({ id: group.id, type: 'group', data: group });
      if (!group.collapsed) {
        group.items.forEach(tab => {
          items.push({ id: tab.id, type: 'tab', groupId: group.id, data: tab });
        });
      }
    });
    return items;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateGroups = vi.fn().mockResolvedValue(undefined) as (groups: Group[]) => Promise<void>;
    mockUpdateGroupData = vi.fn().mockResolvedValue(undefined) as (id: string, updates: Partial<Group>) => Promise<void>;
    mockRestoreGroup = vi.fn().mockResolvedValue(undefined) as (id: string) => Promise<void>;
    mockRestoreTab = vi.fn().mockResolvedValue(undefined) as (groupId: string, tabId: string) => Promise<void>;
    mockOpenGroup = vi.fn().mockResolvedValue(undefined) as (id: string) => Promise<void>;
    mockOpenTab = vi.fn().mockResolvedValue(undefined) as (groupId: string, tabId: string) => Promise<void>;
    mockRemoveGroup = vi.fn().mockResolvedValue(undefined) as (id: string) => Promise<void>;
    mockRemoveTab = vi.fn().mockResolvedValue(undefined) as (groupId: string, tabId: string) => Promise<void>;
    mockSetRenamingGroupId = vi.fn() as (id: string | null) => void;
    mockSetSelectedId = vi.fn() as (id: string | null) => void;
    searchInputRef = { current: null };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const renderNavHook = (groups: Group[], selectedId: string | null = null) => {
    return renderHook(() =>
      useKeyboardNav({
        groups,
        selectedId,
        setSelectedId: mockSetSelectedId,
        updateGroups: mockUpdateGroups,
        updateGroupData: mockUpdateGroupData,
        restoreGroup: mockRestoreGroup,
        restoreTab: mockRestoreTab,
        openGroup: mockOpenGroup,
        openTab: mockOpenTab,
        removeGroup: mockRemoveGroup,
        removeTab: mockRemoveTab,
        setRenamingGroupId: mockSetRenamingGroupId,
        searchInputRef,
        getFlattenedItems: () => createFlattenedItems(groups),
      })
    );
  };

  it('returns isShiftPressed state and ref', () => {
    const { result } = renderNavHook([mockGroup1, mockGroup2]);

    expect(result.current.isShiftPressed).toBe(false);
    expect(result.current.shiftPressedRef).toBeDefined();
  });

  it('updates isShiftPressed on keydown', () => {
    const { result } = renderNavHook([mockGroup1, mockGroup2]);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    });

    expect(result.current.isShiftPressed).toBe(true);
  });

  it('resets isShiftPressed on keyup', () => {
    const { result } = renderNavHook([mockGroup1, mockGroup2]);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
    });

    expect(result.current.isShiftPressed).toBe(true);

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Shift' }));
    });

    expect(result.current.isShiftPressed).toBe(false);
  });

  it('navigates down with ArrowDown key', () => {
    renderNavHook([mockGroup1, mockGroup2], 'g1');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    // Should call setSelectedId with next item (t1)
    expect(mockSetSelectedId).toHaveBeenCalled();
  });

  it('navigates up with ArrowUp key', () => {
    renderNavHook([mockGroup1, mockGroup2], 't1');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
    });

    // Should call setSelectedId with previous item (g1)
    expect(mockSetSelectedId).toHaveBeenCalled();
  });

  it('does not navigate when disabled', () => {
    renderHook(() =>
      useKeyboardNav({
        groups: [mockGroup1, mockGroup2],
        selectedId: 'g1',
        setSelectedId: mockSetSelectedId,
        updateGroups: mockUpdateGroups,
        updateGroupData: mockUpdateGroupData,
        restoreGroup: mockRestoreGroup,
        restoreTab: mockRestoreTab,
        openGroup: mockOpenGroup,
        openTab: mockOpenTab,
        removeGroup: mockRemoveGroup,
        removeTab: mockRemoveTab,
        setRenamingGroupId: mockSetRenamingGroupId,
        searchInputRef,
        getFlattenedItems: () => createFlattenedItems([mockGroup1, mockGroup2]),
        disabled: true,
      })
    );

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    });

    expect(mockSetSelectedId).not.toHaveBeenCalled();
  });

  it('opens group without removing with Cmd+Option+Enter', () => {
    renderNavHook([mockGroup1, mockGroup2], 'g1');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        altKey: true,
      }));
    });

    expect(mockOpenGroup).toHaveBeenCalledWith('g1');
    expect(mockRestoreGroup).not.toHaveBeenCalled();
  });

  it('opens tab without removing with Cmd+Option+Enter', () => {
    renderNavHook([mockGroup1, mockGroup2], 't1');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        altKey: true,
      }));
    });

    expect(mockOpenTab).toHaveBeenCalledWith('g1', 't1');
    expect(mockRestoreTab).not.toHaveBeenCalled();
  });

  it('restores group with Cmd+Enter (without Option)', () => {
    renderNavHook([mockGroup1, mockGroup2], 'g1');

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        metaKey: true,
        altKey: false,
      }));
    });

    expect(mockRestoreGroup).toHaveBeenCalledWith('g1');
    expect(mockOpenGroup).not.toHaveBeenCalled();
  });
});
