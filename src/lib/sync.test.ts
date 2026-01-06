import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Group } from '@/types';
import type { User } from 'firebase/auth';
import { startSync, stopSync } from './sync';
import * as firebase from './firebase';

// Mock firebase module
vi.mock('./firebase', () => ({
  getGroupsFromFirebase: vi.fn(),
  subscribeToGroups: vi.fn(),
  getCurrentUser: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

const mockGroup: Group = {
  id: 'g1',
  title: 'Test Group',
  items: [],
  pinned: false,
  collapsed: false,
  order: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

describe('sync module', () => {
  let mockUnsubscribe: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn() as () => void;
    vi.mocked(firebase.subscribeToGroups).mockReturnValue(mockUnsubscribe);
    vi.mocked(firebase.getCurrentUser).mockReturnValue({ uid: 'user123' } as User);
    vi.mocked(firebase.onAuthStateChanged).mockImplementation((cb: (user: User | null) => void) => {
      cb({ uid: 'user123' } as User);
      return vi.fn() as () => void;
    });
  });

  afterEach(() => {
    stopSync();
    vi.useRealTimers();
  });

  it('performs initial fetch with retries on startSync', async () => {
    // Fail twice, succeed on third attempt
    vi.mocked(firebase.getGroupsFromFirebase)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([mockGroup]);

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    // Advance timers for retry delays (1s + 2s)
    await vi.advanceTimersByTimeAsync(1000); // First retry delay
    await vi.advanceTimersByTimeAsync(2000); // Second retry delay

    expect(firebase.getGroupsFromFirebase).toHaveBeenCalledTimes(3);
    expect(onGroupsUpdated).toHaveBeenCalledWith([mockGroup]);
  });

  it('starts polling after initial fetch', async () => {
    vi.mocked(firebase.getGroupsFromFirebase).mockResolvedValue([mockGroup]);

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    // Allow async operations to complete
    await vi.advanceTimersByTimeAsync(0);

    expect(firebase.subscribeToGroups).toHaveBeenCalled();
  });

  it('starts polling even after initial fetch fails', async () => {
    // All retries fail
    vi.mocked(firebase.getGroupsFromFirebase).mockRejectedValue(new Error('Network error'));

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    // Advance through all retry delays (1s + 2s + 4s)
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    expect(firebase.subscribeToGroups).toHaveBeenCalled();
    expect(onGroupsUpdated).not.toHaveBeenCalled();
  });

  it('does not call onGroupsUpdated when all retries fail', async () => {
    vi.mocked(firebase.getGroupsFromFirebase).mockRejectedValue(new Error('Network error'));

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    // Advance through all retry delays
    await vi.advanceTimersByTimeAsync(1000);
    await vi.advanceTimersByTimeAsync(2000);
    await vi.advanceTimersByTimeAsync(4000);

    expect(firebase.getGroupsFromFirebase).toHaveBeenCalledTimes(3);
    expect(onGroupsUpdated).not.toHaveBeenCalled();
  });

  it('stops polling on stopSync', async () => {
    vi.mocked(firebase.getGroupsFromFirebase).mockResolvedValue([mockGroup]);

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    // Allow async operations to complete
    await vi.advanceTimersByTimeAsync(0);

    stopSync();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('discards stale result when startSync called twice quickly', async () => {
    const firstGroups = [{ ...mockGroup, id: 'first' }];
    const secondGroups = [{ ...mockGroup, id: 'second' }];

    // First call takes longer (100ms delay)
    vi.mocked(firebase.getGroupsFromFirebase)
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(firstGroups), 100)))
      .mockResolvedValueOnce(secondGroups);

    const onGroupsUpdated = vi.fn();

    // Start first sync
    startSync(onGroupsUpdated);
    // Immediately start second sync (should cancel first)
    startSync(onGroupsUpdated);

    // Advance past both timeouts
    await vi.advanceTimersByTimeAsync(100);

    // Should only receive second result, not first (stale)
    expect(onGroupsUpdated).toHaveBeenCalledWith(secondGroups);
    expect(onGroupsUpdated).not.toHaveBeenCalledWith(firstGroups);
  });
});
