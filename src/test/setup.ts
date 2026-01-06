import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Type for globalThis with chrome extension API mock
type GlobalWithChrome = typeof globalThis & {
  chrome?: {
    storage?: {
      sync?: {
        get: ReturnType<typeof vi.fn>;
        set: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
      };
    };
    tabs?: {
      create: ReturnType<typeof vi.fn>;
      query: ReturnType<typeof vi.fn>;
    };
    runtime?: {
      lastError?: chrome.runtime.LastError;
    };
  };
};

// Mock Chrome API
const global = globalThis as GlobalWithChrome;
global.chrome = {
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
