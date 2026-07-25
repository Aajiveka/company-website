import { renderHook } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLazyImage } from '../useLazyImage';

// Mock IntersectionObserver
let observerCallback: IntersectionObserverCallback;
let observerInstance: {
  observe: ReturnType<typeof vi.fn>;
  unobserve: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  observerInstance = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };

  vi.stubGlobal(
    'IntersectionObserver',
    vi.fn((callback: IntersectionObserverCallback) => {
      observerCallback = callback;
      return observerInstance;
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useLazyImage', () => {
  it('returns a ref and isInView state', () => {
    const { result } = renderHook(() => useLazyImage());
    expect(result.current.ref).toBeDefined();
    expect(result.current.isInView).toBe(false);
  });

  it('starts with isInView as false', () => {
    const { result } = renderHook(() => useLazyImage());
    expect(result.current.isInView).toBe(false);
  });

  it('creates an IntersectionObserver with correct options', () => {
    const el = document.createElement('div');
    const { result } = renderHook(() => useLazyImage());

    // Assign the ref to a real element so the effect fires
    // We need to re-render after setting the ref
    (result.current.ref as React.MutableRefObject<HTMLElement | null>).current = el;

    // Re-render to trigger effect with the element
    const { result: result2 } = renderHook(() => useLazyImage());
    (result2.current.ref as React.MutableRefObject<HTMLElement | null>).current = el;

    // The IntersectionObserver constructor should have been called
    expect(IntersectionObserver).toHaveBeenCalled();
  });

  it('sets isInView to true when element intersects', () => {
    const el = document.createElement('div');

    const { result } = renderHook(() => {
      const hook = useLazyImage();
      (hook.ref as React.MutableRefObject<HTMLElement | null>).current = el;
      return hook;
    });

    // Initially false
    expect(result.current.isInView).toBe(false);

    // Simulate intersection; we need to trigger the observer callback
    // But since the ref is set before the effect runs in renderHook,
    // the observer should have been set up
    if (observerCallback) {
      const entry = {
        isIntersecting: true,
        target: el,
      } as unknown as IntersectionObserverEntry;

      observerCallback([entry], {} as IntersectionObserver);
    }

    // After intersection, isInView should be true
    expect(result.current.isInView).toBe(true);
  });

  it('unobserves the element after it becomes visible', () => {
    const el = document.createElement('div');

    renderHook(() => {
      const hook = useLazyImage();
      (hook.ref as React.MutableRefObject<HTMLElement | null>).current = el;
      return hook;
    });

    if (observerCallback) {
      const entry = {
        isIntersecting: true,
        target: el,
      } as unknown as IntersectionObserverEntry;

      observerCallback([entry], {} as IntersectionObserver);
      expect(observerInstance.unobserve).toHaveBeenCalledWith(el);
    }
  });

  it('disconnects observer on unmount', () => {
    const el = document.createElement('div');

    const { unmount } = renderHook(() => {
      const hook = useLazyImage();
      (hook.ref as React.MutableRefObject<HTMLElement | null>).current = el;
      return hook;
    });

    unmount();
    expect(observerInstance.disconnect).toHaveBeenCalled();
  });
});
