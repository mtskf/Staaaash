import { render, screen, waitFor, fireEvent } from '@testing-library/react';
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
    // Mock scrollIntoView for jsdom
    Element.prototype.scrollIntoView = vi.fn();
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

  it('selects group after renaming via click', async () => {
    vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup] });
    vi.mocked(storage.updateGroups).mockResolvedValue(undefined);

    render(<Dashboard />);

    // Wait for group to render
    const groupTitle = await screen.findByText('Test Group');
    expect(groupTitle).toBeInTheDocument();

    // Click on group title to enter edit mode
    fireEvent.click(groupTitle);

    // Find the input and confirm with Enter
    const input = screen.getByDisplayValue('Test Group');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const groupCard = document.getElementById('item-g1');
      expect(groupCard?.getAttribute('data-selected')).toBe('true');
    });
  });

  it('selects group after canceling rename with Escape', async () => {
    vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup] });

    render(<Dashboard />);

    // Wait for group to render
    const groupTitle = await screen.findByText('Test Group');

    // Click on group title to enter edit mode
    fireEvent.click(groupTitle);

    // Find the input and cancel with Escape
    const input = screen.getByDisplayValue('Test Group');
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      const groupCard = document.getElementById('item-g1');
      expect(groupCard?.getAttribute('data-selected')).toBe('true');
    });
  });

  it('selects group after renaming via blur', async () => {
    vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup] });
    vi.mocked(storage.updateGroups).mockResolvedValue(undefined);

    render(<Dashboard />);

    const groupTitle = await screen.findByText('Test Group');
    fireEvent.click(groupTitle);

    const input = screen.getByDisplayValue('Test Group');
    fireEvent.blur(input);

    await waitFor(() => {
      const groupCard = document.getElementById('item-g1');
      expect(groupCard?.getAttribute('data-selected')).toBe('true');
    });
  });

  it('selects group after starting rename via keyboard', async () => {
    vi.mocked(storage.get).mockResolvedValue({ groups: [mockGroup] });
    vi.mocked(storage.updateGroups).mockResolvedValue(undefined);

    render(<Dashboard />);

    await screen.findByText('Test Group');

    fireEvent.keyDown(window, { key: 'ArrowDown' });
    fireEvent.keyDown(window, { key: 'Enter' });

    const input = await screen.findByDisplayValue('Test Group');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      const groupCard = document.getElementById('item-g1');
      expect(groupCard?.getAttribute('data-selected')).toBe('true');
    });
  });
});
