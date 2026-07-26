import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CommandPalette from '@/components/CommandPalette';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Track navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

beforeAll(() => {
  // jsdom lacks scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

function renderPalette() {
  return render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );
}

describe('CommandPalette', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('does not render when closed', () => {
    renderPalette();
    expect(screen.queryByPlaceholderText('commandPalette.placeholder')).not.toBeInTheDocument();
  });

  it('opens when Ctrl+K is pressed', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByPlaceholderText('commandPalette.placeholder')).toBeInTheDocument();
  });

  it('opens when Meta+K is pressed', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', metaKey: true });
    });
    expect(screen.getByPlaceholderText('commandPalette.placeholder')).toBeInTheDocument();
  });

  it('closes when Ctrl+K is pressed again', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByPlaceholderText('commandPalette.placeholder')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    expect(screen.queryByPlaceholderText('commandPalette.placeholder')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    const input = screen.getByPlaceholderText('commandPalette.placeholder');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('commandPalette.placeholder')).not.toBeInTheDocument();
  });

  it('shows pages and actions sections', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    expect(screen.getByText('commandPalette.pages')).toBeInTheDocument();
    expect(screen.getByText('commandPalette.actions')).toBeInTheDocument();
  });

  it('filters items by query', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    const input = screen.getByPlaceholderText('commandPalette.placeholder');
    fireEvent.change(input, { target: { value: 'nav.home' } });
    expect(screen.getByText('nav.home')).toBeInTheDocument();
  });

  it('shows no results message when query matches nothing', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    const input = screen.getByPlaceholderText('commandPalette.placeholder');
    fireEvent.change(input, { target: { value: 'xyznonexistent' } });
    expect(screen.getByText('commandPalette.noResults')).toBeInTheDocument();
  });

  it('navigates on Enter key', () => {
    renderPalette();
    act(() => {
      fireEvent.keyDown(document, { key: 'k', ctrlKey: true });
    });
    const input = screen.getByPlaceholderText('commandPalette.placeholder');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });
});
