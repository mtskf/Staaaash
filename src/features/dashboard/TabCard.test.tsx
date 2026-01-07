import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TabCard } from './TabCard';
import type { TabItem } from '@/types';

// Mock dnd-kit
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}));

const mockTab: TabItem = {
  id: 'tab-1',
  title: 'Test Tab',
  url: 'https://example.com',
  favIconUrl: 'https://example.com/favicon.ico',
};

const defaultProps = {
  tab: mockTab,
  onRemove: vi.fn(),
  onRestore: vi.fn(),
};

describe('TabCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tab title', () => {
    render(<TabCard {...defaultProps} />);
    expect(screen.getByText('Test Tab')).toBeInTheDocument();
  });

  it('renders favicon when favIconUrl is provided', () => {
    render(<TabCard {...defaultProps} />);
    const img = document.querySelector('img[src="https://example.com/favicon.ico"]');
    expect(img).toBeInTheDocument();
  });

  it('renders Globe fallback when favIconUrl is missing', () => {
    const tabWithoutFavicon = { ...mockTab, favIconUrl: undefined };
    render(<TabCard {...defaultProps} tab={tabWithoutFavicon} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    // Globe icon should be rendered (it's an SVG, not an img)
    const svg = document.querySelector('svg.lucide-globe');
    expect(svg).toBeInTheDocument();
  });

  it('renders Globe fallback when favIconUrl is empty string', () => {
    const tabWithEmptyFavicon = { ...mockTab, favIconUrl: '' };
    render(<TabCard {...defaultProps} tab={tabWithEmptyFavicon} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    const svg = document.querySelector('svg.lucide-globe');
    expect(svg).toBeInTheDocument();
  });

  it('shows Globe fallback when image fails to load', () => {
    render(<TabCard {...defaultProps} />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();

    // Simulate image load error
    fireEvent.error(img!);

    // After error, Globe should be shown instead of img
    expect(document.querySelector('img')).not.toBeInTheDocument();
    const svg = document.querySelector('svg.lucide-globe');
    expect(svg).toBeInTheDocument();
  });

  it('retries favicon when URL changes after error', () => {
    const { rerender } = render(<TabCard {...defaultProps} />);
    const img = document.querySelector('img');
    expect(img).toBeInTheDocument();

    // Simulate image load error
    fireEvent.error(img!);
    expect(document.querySelector('img')).not.toBeInTheDocument();

    // Update favIconUrl
    const tabWithNewFavicon = { ...mockTab, favIconUrl: 'https://example.com/new-favicon.ico' };
    rerender(<TabCard {...defaultProps} tab={tabWithNewFavicon} />);

    // Should try to load the new favicon
    const newImg = document.querySelector('img[src="https://example.com/new-favicon.ico"]');
    expect(newImg).toBeInTheDocument();
  });

  it('calls onRemove when remove button is clicked', () => {
    render(<TabCard {...defaultProps} />);
    const removeButton = screen.getByLabelText('tab_remove');
    fireEvent.click(removeButton);
    expect(defaultProps.onRemove).toHaveBeenCalledWith('tab-1');
  });

  it('calls onRestore when restore button is clicked', () => {
    render(<TabCard {...defaultProps} />);
    const restoreButton = screen.getByLabelText('tab_restore');
    fireEvent.click(restoreButton);
    expect(defaultProps.onRestore).toHaveBeenCalledWith('tab-1');
  });
});
