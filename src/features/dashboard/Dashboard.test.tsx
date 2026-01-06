import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Dashboard } from './Dashboard';
import type { Group } from '@/types';
import { storage } from '@/lib/storage';

// Mock dependencies
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
  Toaster: () => null,
}));

vi.mock('@/lib/storage', () => ({
  storage: {
    get: vi.fn(),
    updateGroups: vi.fn(),
  },
  initFirebaseSync: vi.fn(),
  StorageQuotaError: class extends Error {}
}));

const mockGroup: Group = {
  id: 'g1',
  title: 'Test Group',
  items: [
    { id: 't1', title: 'Test Tab', url: 'https://example.com' }
  ],
  pinned: false,
  collapsed: false,
  order: 0,
  createdAt: Date.now(),
  updatedAt: Date.now()
};

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock response
    vi.mocked(storage.get).mockResolvedValue({ groups: [] });
  });

  it('renders empty state initially', async () => {
    render(<Dashboard />);
    // t() returns the key itself in test environment (no chrome.i18n)
    expect(await screen.findByText('no_saved_tabs')).toBeInTheDocument();
  });

  it('renders groups from storage', async () => {
    vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup] });

    render(<Dashboard />);

    await waitFor(() => {
      expect(storage.get).toHaveBeenCalled();
    });

    const groupTitle = await screen.findByText('Test Group');
    expect(groupTitle).toBeInTheDocument();
    expect(screen.getByText('Test Tab')).toBeInTheDocument();
  });

  it('shows search input', async () => {
    render(<Dashboard />);
    // t() returns the key itself in test environment (no chrome.i18n)
    expect(await screen.findByPlaceholderText('search_placeholder')).toBeInTheDocument();
  });
});
