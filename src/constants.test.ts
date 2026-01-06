import { describe, it, expect, beforeEach, vi } from 'vitest';

type GlobalWithChrome = typeof globalThis & {
  chrome?: { runtime?: { id?: string } };
};
const global = globalThis as GlobalWithChrome;

describe('constants', () => {
  beforeEach(() => {
    vi.resetModules();
    delete global.chrome;
  });

  describe('EXTENSION_PREFIX', () => {
    it('should return empty string when chrome.runtime is not available', async () => {
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('');
    });

    it('should return empty string when chrome.runtime.id is undefined', async () => {
      global.chrome = { runtime: {} };
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('');
    });

    it('should return correct prefix when chrome.runtime.id is available', async () => {
      global.chrome = { runtime: { id: 'test-extension-id' } };
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('chrome-extension://test-extension-id');
    });
  });
});
