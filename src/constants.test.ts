import { describe, it, expect, beforeEach, vi } from 'vitest';

declare const globalThis: { chrome?: { runtime?: { id?: string } } };

describe('constants', () => {
  beforeEach(() => {
    vi.resetModules();
    delete globalThis.chrome;
  });

  describe('EXTENSION_PREFIX', () => {
    it('should return empty string when chrome.runtime is not available', async () => {
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('');
    });

    it('should return empty string when chrome.runtime.id is undefined', async () => {
      globalThis.chrome = { runtime: {} };
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('');
    });

    it('should return correct prefix when chrome.runtime.id is available', async () => {
      globalThis.chrome = { runtime: { id: 'test-extension-id' } };
      const { EXTENSION_PREFIX } = await import('./constants');
      expect(EXTENSION_PREFIX).toBe('chrome-extension://test-extension-id');
    });
  });
});
