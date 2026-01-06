import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Chrome API - use type assertion to avoid complex Chrome type matching
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).chrome = {
  storage: {
    sync: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn(),
    },
  },
  tabs: {
    create: vi.fn(),
    query: vi.fn(),
  },
  runtime: {
    lastError: undefined,
  },
};

// Mock matchMedia for Radix UI
Object.defineProperty(window, 'matchMedia', {
  writable: true,

  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
