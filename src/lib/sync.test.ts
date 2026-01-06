import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Group } from '@/types';
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
  let mockUnsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUnsubscribe = vi.fn();
    vi.mocked(firebase.subscribeToGroups).mockReturnValue(mockUnsubscribe);
    vi.mocked(firebase.getCurrentUser).mockReturnValue({ uid: 'user123' } as firebase.User);
    vi.mocked(firebase.onAuthStateChanged).mockImplementation((cb) => {
      cb({ uid: 'user123' } as firebase.User);
      return vi.fn();
    });
  });

  afterEach(() => {
    stopSync();
  });

  it('performs initial fetch with retries on startSync', async () => {
    // Fail twice, succeed on third attempt
    vi.mocked(firebase.getGroupsFromFirebase)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce([mockGroup]);

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    // Wait for retries (1s + 2s = 3s max, but we use fake timers)
    await vi.waitFor(() => {
      expect(onGroupsUpdated).toHaveBeenCalledWith([mockGroup]);
    }, { timeout: 10000 });

    expect(firebase.getGroupsFromFirebase).toHaveBeenCalledTimes(3);
  });

  it('starts polling after initial fetch', async () => {
    vi.mocked(firebase.getGroupsFromFirebase).mockResolvedValue([mockGroup]);

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    await vi.waitFor(() => {
      expect(firebase.subscribeToGroups).toHaveBeenCalled();
    });
  });

  it('starts polling even after initial fetch fails', async () => {
    // All retries fail
    vi.mocked(firebase.getGroupsFromFirebase).mockRejectedValue(new Error('Network error'));

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    // Wait for all retries to complete
    await vi.waitFor(() => {
      expect(firebase.subscribeToGroups).toHaveBeenCalled();
    }, { timeout: 10000 });

    // onGroupsUpdated should NOT have been called with initial data
    expect(onGroupsUpdated).not.toHaveBeenCalled();
  });

  it('does not call onGroupsUpdated when all retries fail', async () => {
    vi.mocked(firebase.getGroupsFromFirebase).mockRejectedValue(new Error('Network error'));

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    await vi.waitFor(() => {
      expect(firebase.getGroupsFromFirebase).toHaveBeenCalledTimes(3);
    }, { timeout: 10000 });

    expect(onGroupsUpdated).not.toHaveBeenCalled();
  });

  it('stops polling on stopSync', async () => {
    vi.mocked(firebase.getGroupsFromFirebase).mockResolvedValue([mockGroup]);

    const onGroupsUpdated = vi.fn();
    startSync(onGroupsUpdated);

    await vi.waitFor(() => {
      expect(firebase.subscribeToGroups).toHaveBeenCalled();
    });

    stopSync();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });

  it('discards stale result when startSync called twice quickly', async () => {
    const firstGroups = [{ ...mockGroup, id: 'first' }];
    const secondGroups = [{ ...mockGroup, id: 'second' }];

    // First call takes longer
    vi.mocked(firebase.getGroupsFromFirebase)
      .mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve(firstGroups), 100)))
      .mockResolvedValueOnce(secondGroups);

    const onGroupsUpdated = vi.fn();

    // Start first sync
    startSync(onGroupsUpdated);
    // Immediately start second sync (should cancel first)
    startSync(onGroupsUpdated);

    await vi.waitFor(() => {
      expect(onGroupsUpdated).toHaveBeenCalled();
    });

    // Should only receive second result, not first (stale)
    expect(onGroupsUpdated).toHaveBeenCalledWith(secondGroups);
    expect(onGroupsUpdated).not.toHaveBeenCalledWith(firstGroups);
  });
});
