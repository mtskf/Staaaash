import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('constants', () => {
  beforeEach(() => {
    vi.resetModules();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).chrome = undefined;
  });

  describe('EXTENSION_PREFIX', () => {
    it('should return empty string when chrome.runtime is not available', async () => {
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('');
    });

    it('should return empty string when chrome.runtime.id is undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).chrome = { runtime: {} };
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('');
    });

    it('should return correct prefix when chrome.runtime.id is available', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).chrome = { runtime: { id: 'test-extension-id' } };
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('chrome-extension://test-extension-id');
    });
  });
});
