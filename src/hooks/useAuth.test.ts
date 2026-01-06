import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from './useAuth';
import {
  signInWithGoogle,
  signOut,
  onAuthStateChanged,
} from '@/lib/firebase';

vi.mock('@/lib/firebase', () => ({
  signInWithGoogle: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

const mockUser = { uid: 'test-uid', email: 'test@example.com' };

describe('useAuth', () => {
  let authCallback: ((user: { uid: string; email: string } | null) => void) | null = null;
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;
    mockUnsubscribe = vi.fn();

    vi.mocked(onAuthStateChanged).mockImplementation((cb) => {
      authCallback = cb;
      return mockUnsubscribe;
    });
  });

  it('initializes with loading state', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBe(null);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('updates user when auth state changes', async () => {
    const { result } = renderHook(() => useAuth());

    // Simulate auth state change
    act(() => {
      authCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('handles sign out via auth state change', async () => {
    const { result } = renderHook(() => useAuth());

    // First sign in
    act(() => {
      authCallback?.(mockUser);
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });

    // Then sign out
    act(() => {
      authCallback?.(null);
    });

    await waitFor(() => {
      expect(result.current.user).toBe(null);
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  it('calls signInWithGoogle on signIn', async () => {
    vi.mocked(signInWithGoogle).mockResolvedValue(mockUser as ReturnType<typeof signInWithGoogle> extends Promise<infer T> ? T : never);

    const { result } = renderHook(() => useAuth());

    // Trigger initial state
    act(() => {
      authCallback?.(null);
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(signInWithGoogle).toHaveBeenCalledTimes(1);
  });

  it('sets error state when signIn fails', async () => {
    vi.mocked(signInWithGoogle).mockRejectedValue(new Error('Auth failed'));

    const { result } = renderHook(() => useAuth());

    act(() => {
      authCallback?.(null);
    });

    await act(async () => {
      await result.current.signIn();
    });

    expect(result.current.error).toBe('Auth failed');
    expect(result.current.loading).toBe(false);
  });

  it('calls signOut on signOut', async () => {
    vi.mocked(signOut).mockResolvedValue(undefined);

    const { result } = renderHook(() => useAuth());

    act(() => {
      authCallback?.(mockUser);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('sets error state when signOut fails', async () => {
    vi.mocked(signOut).mockRejectedValue(new Error('Sign out failed'));

    const { result } = renderHook(() => useAuth());

    act(() => {
      authCallback?.(mockUser);
    });

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.error).toBe('Sign out failed');
    expect(result.current.loading).toBe(false);
  });

  it('unsubscribes from auth state on unmount', () => {
    const { unmount } = renderHook(() => useAuth());

    unmount();

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
