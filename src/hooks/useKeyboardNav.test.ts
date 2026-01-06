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
  let mockUpdateGroups: ReturnType<typeof vi.fn>;
  let mockUpdateGroupData: ReturnType<typeof vi.fn>;
  let mockRestoreGroup: ReturnType<typeof vi.fn>;
  let mockRestoreTab: ReturnType<typeof vi.fn>;
  let mockRemoveGroup: ReturnType<typeof vi.fn>;
  let mockRemoveTab: ReturnType<typeof vi.fn>;
  let mockSetRenamingGroupId: ReturnType<typeof vi.fn>;
  let mockSetSelectedId: ReturnType<typeof vi.fn>;
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
    mockUpdateGroups = vi.fn().mockResolvedValue(undefined);
    mockUpdateGroupData = vi.fn().mockResolvedValue(undefined);
    mockRestoreGroup = vi.fn().mockResolvedValue(undefined);
    mockRestoreTab = vi.fn().mockResolvedValue(undefined);
    mockRemoveGroup = vi.fn().mockResolvedValue(undefined);
    mockRemoveTab = vi.fn().mockResolvedValue(undefined);
    mockSetRenamingGroupId = vi.fn();
    mockSetSelectedId = vi.fn();
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
});
