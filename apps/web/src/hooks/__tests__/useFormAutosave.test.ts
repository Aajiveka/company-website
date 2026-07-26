import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormAutosave } from '../useFormAutosave';

describe('useFormAutosave', () => {
  const mockStorage: Record<string, string> = {};

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete mockStorage[key];
      }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    for (const key of Object.keys(mockStorage)) {
      delete mockStorage[key];
    }
  });

  it('returns initial data when no draft exists', () => {
    const { result } = renderHook(() =>
      useFormAutosave('test-form', { name: 'Alice' }),
    );
    expect(result.current.data).toEqual({ name: 'Alice' });
    expect(result.current.hasDraft).toBe(false);
  });

  it('update() saves to localStorage after debounce', () => {
    const { result } = renderHook(() =>
      useFormAutosave('test-form', { name: '' }),
    );

    act(() => {
      result.current.update({ name: 'Bob' });
    });

    // Before debounce, localStorage.setItem should not have been called
    expect(localStorage.setItem).not.toHaveBeenCalled();

    // Advance timers past the 500ms debounce
    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(localStorage.setItem).toHaveBeenCalledWith(
      'draft:test-form',
      JSON.stringify({ name: 'Bob' }),
    );
  });

  it('clear() removes the draft from localStorage', () => {
    const { result } = renderHook(() =>
      useFormAutosave('test-form', { name: '' }),
    );

    act(() => {
      result.current.clear();
    });

    expect(localStorage.removeItem).toHaveBeenCalledWith('draft:test-form');
  });

  it('hasDraft is true when draft exists in localStorage', () => {
    mockStorage['draft:existing'] = JSON.stringify({ name: 'Saved' });

    const { result } = renderHook(() =>
      useFormAutosave('existing', { name: '' }),
    );

    expect(result.current.hasDraft).toBe(true);
    expect(result.current.data).toEqual({ name: 'Saved' });
  });

  it('debounces multiple rapid updates', () => {
    const { result } = renderHook(() =>
      useFormAutosave('test-form', { name: '' }),
    );

    act(() => {
      result.current.update({ name: 'A' });
    });
    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => {
      result.current.update({ name: 'AB' });
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Only the last value should have been saved
    expect(localStorage.setItem).toHaveBeenCalledTimes(1);
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'draft:test-form',
      JSON.stringify({ name: 'AB' }),
    );
  });
});
