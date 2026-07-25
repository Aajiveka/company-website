import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts, type Shortcut } from '../useKeyboardShortcuts';

function fireKeydown(
  key: string,
  opts: { ctrlKey?: boolean; metaKey?: boolean; shiftKey?: boolean } = {},
  target: EventTarget = document,
) {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
}

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fires callback on matching keydown', () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKeydown('k', { ctrlKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('does not fire callback when modifier mismatch', () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    // No ctrl key pressed
    fireKeydown('k');
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not fire when focus is in an input element', () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);

    fireKeydown('k', { ctrlKey: true }, input);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it('does not fire when focus is in a textarea', () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: 's', ctrl: true, handler, description: 'Save' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    fireKeydown('s', { ctrlKey: true }, textarea);

    expect(handler).not.toHaveBeenCalled();
    document.body.removeChild(textarea);
  });

  it('cleans up event listener on unmount', () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: 'k', ctrl: true, handler, description: 'Search' },
    ];

    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    fireKeydown('k', { ctrlKey: true });
    expect(handler).not.toHaveBeenCalled();
  });

  it('supports meta key (Cmd on macOS)', () => {
    const handler = vi.fn();
    const shortcuts: Shortcut[] = [
      { key: 'k', meta: true, handler, description: 'Search' },
    ];

    renderHook(() => useKeyboardShortcuts(shortcuts));

    fireKeydown('k', { metaKey: true });
    expect(handler).toHaveBeenCalledOnce();
  });
});
