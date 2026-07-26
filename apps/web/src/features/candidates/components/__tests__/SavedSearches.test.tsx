import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SavedSearches } from '../SavedSearches';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// Mock lucide-react icons to simple spans
vi.mock('lucide-react', () => ({
  Bookmark: (props: Record<string, unknown>) => <svg data-testid="bookmark-icon" {...props} />,
  Search: (props: Record<string, unknown>) => <svg data-testid="search-icon" {...props} />,
  Trash2: (props: Record<string, unknown>) => <svg data-testid="trash-icon" {...props} />,
  Plus: (props: Record<string, unknown>) => <svg data-testid="plus-icon" {...props} />,
  X: (props: Record<string, unknown>) => <svg data-testid="x-icon" {...props} />,
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock @/components/ui - Button, Card, Modal, useToast
vi.mock('@/components/ui', () => ({
  Button: (props: { children?: ReactNode; onClick?: () => void; disabled?: boolean; variant?: string }) => (
    <button onClick={props.onClick} disabled={props.disabled}>
      {props.children}
    </button>
  ),
  Card: (props: { children?: ReactNode; className?: string }) => (
    <div className={props.className} data-testid="card">
      {props.children}
    </div>
  ),
  Modal: ({
    open,
    title,
    children,
  }: {
    open: boolean;
    onClose?: () => void;
    title?: string;
    children: ReactNode;
  }) =>
    open ? (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        {children}
      </div>
    ) : null,
  useToast: () => ({ notify: vi.fn() }),
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: () => 'test-uuid-1234',
});

const STORAGE_KEY = 'aajiveka_saved_searches';

describe('SavedSearches', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    localStorage.clear();
  });

  it('renders empty state when no saved searches and no current search', () => {
    render(<SavedSearches />);
    expect(
      screen.getByText('savedSearches.emptyState'),
    ).toBeInTheDocument();
  });

  it('does not show save button when there is no current search', () => {
    render(<SavedSearches />);
    expect(screen.queryByText('savedSearches.saveCurrentSearch')).not.toBeInTheDocument();
  });

  it('shows save button when there is a current search query', () => {
    render(<SavedSearches currentQuery="React developer" />);
    expect(screen.getByText('savedSearches.saveCurrentSearch')).toBeInTheDocument();
  });

  it('shows save button when there are current filters', () => {
    render(<SavedSearches currentFilters={{ location: 'Mumbai' }} />);
    expect(screen.getByText('savedSearches.saveCurrentSearch')).toBeInTheDocument();
  });

  it('saves a new search to localStorage', () => {
    render(<SavedSearches currentQuery="Frontend dev" currentFilters={{ location: 'Delhi' }} />);

    // Click save button to open modal
    fireEvent.click(screen.getByText('savedSearches.saveCurrentSearch'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Type a name
    const nameInput = screen.getByPlaceholderText('savedSearches.searchNamePlaceholder');
    fireEvent.change(nameInput, { target: { value: 'My Search' } });

    // Click Save
    const saveButtons = screen.getAllByText('savedSearches.save');
    const saveBtn = saveButtons.find(
      (btn) => btn.tagName === 'BUTTON' && !btn.hasAttribute('disabled'),
    );
    fireEvent.click(saveBtn!);

    // Check localStorage was updated
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('My Search');
    expect(stored[0].query).toBe('Frontend dev');
    expect(stored[0].filters).toEqual({ location: 'Delhi' });

    // The search now shows in the list
    expect(screen.getByText('My Search')).toBeInTheDocument();
  });

  it('displays saved searches list from localStorage', () => {
    const searches = [
      {
        id: 'id-1',
        name: 'React roles',
        query: 'React',
        filters: {},
        createdAt: '2025-01-15T00:00:00Z',
      },
      {
        id: 'id-2',
        name: 'Backend jobs',
        query: 'Node.js',
        filters: { location: 'Bangalore' },
        createdAt: '2025-02-20T00:00:00Z',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));

    render(<SavedSearches />);

    expect(screen.getByText('React roles')).toBeInTheDocument();
    expect(screen.getByText('Backend jobs')).toBeInTheDocument();
    expect(screen.getByText('savedSearches.title')).toBeInTheDocument();
  });

  it('deletes a saved search', () => {
    const searches = [
      {
        id: 'id-1',
        name: 'React roles',
        query: 'React',
        filters: {},
        createdAt: '2025-01-15T00:00:00Z',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));

    render(<SavedSearches />);
    expect(screen.getByText('React roles')).toBeInTheDocument();

    const deleteBtn = screen.getByLabelText('Delete React roles');
    fireEvent.click(deleteBtn);

    expect(screen.queryByText('React roles')).not.toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored).toHaveLength(0);
  });

  it('applies a saved search by navigating', () => {
    const searches = [
      {
        id: 'id-1',
        name: 'Remote React',
        query: 'React developer',
        filters: { location: 'Mumbai', workModes: ['Remote'] },
        createdAt: '2025-01-15T00:00:00Z',
      },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));

    render(<SavedSearches />);

    // Click the search entry to apply
    fireEvent.click(screen.getByText('Remote React'));

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    const navArg = mockNavigate.mock.calls[0][0];
    expect(navArg.pathname).toBe('/jobs');
    expect(navArg.search).toContain('designation=React+developer');
    expect(navArg.search).toContain('location=Mumbai');
    expect(navArg.search).toContain('workModes=Remote');
  });

  it('does not save when name is empty', () => {
    render(<SavedSearches currentQuery="test" />);

    fireEvent.click(screen.getByText('savedSearches.saveCurrentSearch'));

    // Save button should be disabled when name is empty
    const saveButtons = screen.getAllByText('savedSearches.save');
    const saveBtn = saveButtons.find(
      (btn) => btn.tagName === 'BUTTON',
    );
    expect(saveBtn).toHaveAttribute('disabled');
  });
});
