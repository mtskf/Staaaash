import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase modules before importing
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
  })),
  signInWithCredential: vi.fn(),
  GoogleAuthProvider: {
    credential: vi.fn(() => 'mock-credential'),
  },
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
}));

// Mock chrome API
const mockChrome = {
  identity: {
    getRedirectURL: vi.fn(() => 'https://redirect.chromiumapp.org/'),
    launchWebAuthFlow: vi.fn(),
  },
  runtime: {
    lastError: undefined as { message: string } | undefined,
  },
};

type GlobalWithChrome = typeof globalThis & {
  chrome?: typeof mockChrome;
};

describe('firebase module', () => {
  let getGroupsFromFirebase: typeof import('./firebase').getGroupsFromFirebase;
  let saveGroupsToFirebase: typeof import('./firebase').saveGroupsToFirebase;
  let subscribeToGroups: typeof import('./firebase').subscribeToGroups;

  // Preserve original chrome to restore after tests
  const global = globalThis as GlobalWithChrome;
  const originalChrome = global.chrome;

  beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();

    global.chrome = mockChrome;
    mockChrome.runtime.lastError = undefined;

    // Mock fetch
    global.fetch = vi.fn();

    // Re-import after mocks are set up
    const firebaseModule = await import('./firebase');
    getGroupsFromFirebase = firebaseModule.getGroupsFromFirebase;
    saveGroupsToFirebase = firebaseModule.saveGroupsToFirebase;
    subscribeToGroups = firebaseModule.subscribeToGroups;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original chrome stub from setup.ts
    global.chrome = originalChrome;
  });

  describe('getGroupsFromFirebase', () => {
    it('returns empty array when no token available', async () => {
      const result = await getGroupsFromFirebase('user-123');
      expect(result).toEqual([]);
    });
  });

  describe('saveGroupsToFirebase', () => {
    it('does nothing when no token available', async () => {
      await saveGroupsToFirebase('user-123', []);
      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('subscribeToGroups', () => {
    it('starts polling and calls callback', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();

      // subscribeToGroups will call getGroupsFromFirebase which returns []
      // because there's no token
      const unsubscribe = subscribeToGroups('user-123', callback, 1000);

      // Wait for initial poll
      await vi.advanceTimersByTimeAsync(0);

      expect(callback).toHaveBeenCalledWith([]);

      unsubscribe();
      vi.useRealTimers();
    });

    it('stops polling on unsubscribe', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();

      const unsubscribe = subscribeToGroups('user-123', callback, 1000);

      await vi.advanceTimersByTimeAsync(0);
      expect(callback).toHaveBeenCalledTimes(1);

      unsubscribe();

      // Advance time to see if polling continues
      await vi.advanceTimersByTimeAsync(2000);

      // Should still only be called once
      expect(callback).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('continues polling at specified interval', async () => {
      vi.useFakeTimers();
      const callback = vi.fn();

      const unsubscribe = subscribeToGroups('user-123', callback, 500);

      // Initial call
      await vi.advanceTimersByTimeAsync(0);
      expect(callback).toHaveBeenCalledTimes(1);

      // After first interval
      await vi.advanceTimersByTimeAsync(500);
      expect(callback).toHaveBeenCalledTimes(2);

      // After second interval
      await vi.advanceTimersByTimeAsync(500);
      expect(callback).toHaveBeenCalledTimes(3);

      unsubscribe();
      vi.useRealTimers();
    });
  });
});
