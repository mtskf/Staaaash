import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncIndicator } from './SyncIndicator';
import { useSyncStatus } from '@/hooks/useSyncStatus';

vi.mock('@/hooks/useSyncStatus', () => ({
  useSyncStatus: vi.fn(),
}));

describe('SyncIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when state is idle', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'idle', error: null });
    const { container } = render(<SyncIndicator />);
    expect(container.firstChild).toBeNull();
  });

  it('shows spinning RefreshCw icon when syncing', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'syncing', error: null });
    render(<SyncIndicator />);
    const svg = document.querySelector('svg.lucide-refresh-cw');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
  });

  it('shows Cloud icon when synced', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'synced', error: null });
    render(<SyncIndicator />);
    const svg = document.querySelector('svg.lucide-cloud');
    expect(svg).toBeInTheDocument();
  });

  it('shows CloudOff icon when error', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'error', error: 'Network error' });
    render(<SyncIndicator />);
    const svg = document.querySelector('svg.lucide-cloud-off');
    expect(svg).toBeInTheDocument();
  });

  it('applies blue color when syncing', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'syncing', error: null });
    render(<SyncIndicator />);
    const svg = document.querySelector('svg.lucide-refresh-cw');
    expect(svg).toHaveClass('text-blue-500');
  });

  it('applies green color when synced', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'synced', error: null });
    render(<SyncIndicator />);
    const svg = document.querySelector('svg.lucide-cloud');
    expect(svg).toHaveClass('text-green-500');
  });

  it('applies red color when error', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'error', error: 'Network error' });
    render(<SyncIndicator />);
    const svg = document.querySelector('svg.lucide-cloud-off');
    expect(svg).toHaveClass('text-red-500');
  });

  it('has accessible title for syncing state', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'syncing', error: null });
    render(<SyncIndicator />);
    expect(screen.getByTitle('sync_syncing')).toBeInTheDocument();
  });

  it('has accessible title for synced state', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'synced', error: null });
    render(<SyncIndicator />);
    expect(screen.getByTitle('sync_synced')).toBeInTheDocument();
  });

  it('has accessible title for error state', () => {
    vi.mocked(useSyncStatus).mockReturnValue({ state: 'error', error: 'Network error' });
    render(<SyncIndicator />);
    expect(screen.getByTitle('sync_error')).toBeInTheDocument();
  });
});
