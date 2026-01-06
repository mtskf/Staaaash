import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GroupCard } from './GroupCard';
import type { Group } from '@/types';

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
  SortableContext: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  verticalListSortingStrategy: {},
}));

// Mock TabCard
vi.mock('./TabCard', () => ({
  SortableTabCard: ({ tab }: { tab: { id: string; title: string } }) => (
    <div data-testid={`tab-${tab.id}`}>{tab.title}</div>
  ),
}));

const mockGroup: Group = {
  id: 'group-1',
  title: 'Test Group',
  items: [
    { id: 'tab-1', title: 'Tab 1', url: 'https://example.com/1' },
    { id: 'tab-2', title: 'Tab 2', url: 'https://example.com/2' },
  ],
  pinned: false,
  collapsed: false,
  order: 0,
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

const defaultProps = {
  group: mockGroup,
  onRemoveGroup: vi.fn(),
  onRemoveTab: vi.fn(),
  onUpdateGroup: vi.fn(),
  onRestore: vi.fn(),
  onRestoreTab: vi.fn(),
  autoFocusName: false,
  isSelected: false,
  selectedTabId: null,
  isRenaming: false,
  onRenameStop: vi.fn(),
  isMerging: false,
};

describe('GroupCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders group title', () => {
    render(<GroupCard {...defaultProps} />);
    expect(screen.getByText('Test Group')).toBeInTheDocument();
  });

  it('renders tabs count using i18n key', () => {
    render(<GroupCard {...defaultProps} />);
    // t() returns the key in test environment
    expect(screen.getByText('tabs_count')).toBeInTheDocument();
  });

  it('renders tab items when not collapsed', () => {
    render(<GroupCard {...defaultProps} />);
    expect(screen.getByTestId('tab-tab-1')).toBeInTheDocument();
    expect(screen.getByTestId('tab-tab-2')).toBeInTheDocument();
  });

  it('hides tab items when collapsed', () => {
    const collapsedGroup = { ...mockGroup, collapsed: true };
    render(<GroupCard {...defaultProps} group={collapsedGroup} />);
    expect(screen.queryByTestId('tab-tab-1')).not.toBeInTheDocument();
  });

  it('calls onRemoveGroup when delete button clicked', () => {
    render(<GroupCard {...defaultProps} />);
    // Find delete button by aria-label (i18n key)
    const deleteButton = screen.getByLabelText('group_delete');
    fireEvent.click(deleteButton);
    expect(defaultProps.onRemoveGroup).toHaveBeenCalledWith('group-1');
  });

  it('calls onRestore when restore button clicked', () => {
    render(<GroupCard {...defaultProps} />);
    const restoreButton = screen.getByLabelText('group_restore_all');
    fireEvent.click(restoreButton);
    expect(defaultProps.onRestore).toHaveBeenCalledWith('group-1');
  });

  it('calls onUpdateGroup with pinned toggle when pin button clicked', () => {
    render(<GroupCard {...defaultProps} />);
    const pinButton = screen.getByLabelText('group_pin');
    fireEvent.click(pinButton);
    expect(defaultProps.onUpdateGroup).toHaveBeenCalledWith('group-1', { pinned: true });
  });

  it('calls onUpdateGroup with collapsed toggle when collapse button clicked', () => {
    render(<GroupCard {...defaultProps} />);
    const collapseButton = screen.getByLabelText('group_collapse');
    fireEvent.click(collapseButton);
    expect(defaultProps.onUpdateGroup).toHaveBeenCalledWith('group-1', { collapsed: true });
  });

  it('shows expand button when collapsed', () => {
    const collapsedGroup = { ...mockGroup, collapsed: true };
    render(<GroupCard {...defaultProps} group={collapsedGroup} />);
    expect(screen.getByLabelText('group_expand')).toBeInTheDocument();
  });

  it('shows unpin button when pinned', () => {
    const pinnedGroup = { ...mockGroup, pinned: true };
    render(<GroupCard {...defaultProps} group={pinnedGroup} />);
    expect(screen.getByLabelText('group_unpin')).toBeInTheDocument();
  });

  it('enters edit mode when title clicked', () => {
    render(<GroupCard {...defaultProps} />);
    const title = screen.getByText('Test Group');
    fireEvent.click(title);
    // Should show input with current title
    expect(screen.getByDisplayValue('Test Group')).toBeInTheDocument();
  });

  it('submits new title on Enter', () => {
    render(<GroupCard {...defaultProps} />);
    const title = screen.getByText('Test Group');
    fireEvent.click(title);

    const input = screen.getByDisplayValue('Test Group');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(defaultProps.onUpdateGroup).toHaveBeenCalledWith('group-1', { title: 'New Title' });
  });

  it('cancels edit on Escape', () => {
    render(<GroupCard {...defaultProps} />);
    const title = screen.getByText('Test Group');
    fireEvent.click(title);

    const input = screen.getByDisplayValue('Test Group');
    fireEvent.change(input, { target: { value: 'New Title' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    // Should revert and exit edit mode
    expect(defaultProps.onUpdateGroup).not.toHaveBeenCalled();
    expect(defaultProps.onRenameStop).toHaveBeenCalled();
  });

  it('shows empty state when group has no tabs', () => {
    const emptyGroup = { ...mockGroup, items: [] };
    render(<GroupCard {...defaultProps} group={emptyGroup} />);
    expect(screen.getByText('drop_tabs_here')).toBeInTheDocument();
  });

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(<GroupCard {...defaultProps} isSelected={true} />);
    const card = container.querySelector('.ring-2');
    expect(card).toBeInTheDocument();
  });
});
