import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncStatus } from './useSyncStatus';
import { subscribeSyncStatus } from '@/lib/storage';
import type { SyncStatus } from '@/types';

vi.mock('@/lib/storage', () => ({
  subscribeSyncStatus: vi.fn(),
}));

describe('useSyncStatus', () => {
  let statusCallback: ((status: SyncStatus) => void) | null = null;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    statusCallback = null;
    mockUnsubscribe = vi.fn();

    vi.mocked(subscribeSyncStatus).mockImplementation((cb: (status: SyncStatus) => void) => {
      statusCallback = cb;
      // Immediately call with initial idle state
      cb({ state: 'idle', error: null });
      return mockUnsubscribe as () => void;
    });
  });

  it('initializes with idle state', () => {
    const { result } = renderHook(() => useSyncStatus());

    expect(result.current.state).toBe('idle');
    expect(result.current.error).toBe(null);
  });

  it('subscribes to sync status on mount', () => {
    renderHook(() => useSyncStatus());

    expect(subscribeSyncStatus).toHaveBeenCalledTimes(1);
    expect(subscribeSyncStatus).toHaveBeenCalledWith(expect.any(Function));
  });

  it('updates state when sync status changes', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      statusCallback?.({ state: 'syncing', error: null });
    });

    expect(result.current.state).toBe('syncing');
    expect(result.current.error).toBe(null);
  });

  it('updates error when sync fails', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      statusCallback?.({ state: 'error', error: 'Network error' });
    });

    expect(result.current.state).toBe('error');
    expect(result.current.error).toBe('Network error');
  });

  it('transitions through syncing to synced', () => {
    const { result } = renderHook(() => useSyncStatus());

    act(() => {
      statusCallback?.({ state: 'syncing', error: null });
    });
    expect(result.current.state).toBe('syncing');

    act(() => {
      statusCallback?.({ state: 'synced', error: null });
    });
    expect(result.current.state).toBe('synced');
  });

  it('unsubscribes on unmount', () => {
    const { unmount } = renderHook(() => useSyncStatus());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
