import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useLazyImage } from '../useLazyImage';

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

  class MockObserver {
    constructor(callback: IntersectionObserverCallback) {
      observerCallback = callback;
      Object.assign(this, observerInstance);
    }
  }
  vi.stubGlobal('IntersectionObserver', MockObserver);
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

  it('creates an IntersectionObserver when ref has an element', () => {
    const el = document.createElement('div');

    renderHook(() => {
      const hook = useLazyImage();
      (hook.ref as React.MutableRefObject<HTMLElement | null>).current = el;
      return hook;
    });

    expect(observerInstance.observe).toHaveBeenCalledWith(el);
  });

  it('sets isInView to true when element intersects', () => {
    const el = document.createElement('div');

    const { result } = renderHook(() => {
      const hook = useLazyImage();
      (hook.ref as React.MutableRefObject<HTMLElement | null>).current = el;
      return hook;
    });

    expect(result.current.isInView).toBe(false);

    act(() => {
      observerCallback(
        [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(result.current.isInView).toBe(true);
  });

  it('unobserves the element after it becomes visible', () => {
    const el = document.createElement('div');

    renderHook(() => {
      const hook = useLazyImage();
      (hook.ref as React.MutableRefObject<HTMLElement | null>).current = el;
      return hook;
    });

    act(() => {
      observerCallback(
        [{ isIntersecting: true, target: el } as unknown as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(observerInstance.unobserve).toHaveBeenCalledWith(el);
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
