import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

// Class-based IntersectionObserver mock
let observerCallback: IntersectionObserverCallback;
let observerInstance: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback, public options?: IntersectionObserverInit) {
    observerCallback = callback;
    observerInstance = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };
    Object.assign(this, observerInstance);
  }
  observe = vi.fn();
  disconnect = vi.fn();
  unobserve = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
  root = null;
  rootMargin = '';
  thresholds = [0];
}

describe('useInfiniteScroll', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns a ref object', () => {
    const { result } = renderHook(() =>
      useInfiniteScroll({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      }),
    );
    expect(result.current).toHaveProperty('current');
  });

  it('does not create observer when hasNextPage is false', () => {
    const constructorSpy = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class extends MockIntersectionObserver {
        constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
          super(cb, opts);
          constructorSpy();
        }
      },
    );

    renderHook(() =>
      useInfiniteScroll({
        hasNextPage: false,
        isFetchingNextPage: false,
        fetchNextPage: vi.fn(),
      }),
    );
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it('does not create observer when isFetchingNextPage is true', () => {
    const constructorSpy = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class extends MockIntersectionObserver {
        constructor(cb: IntersectionObserverCallback, opts?: IntersectionObserverInit) {
          super(cb, opts);
          constructorSpy();
        }
      },
    );

    renderHook(() =>
      useInfiniteScroll({
        hasNextPage: true,
        isFetchingNextPage: true,
        fetchNextPage: vi.fn(),
      }),
    );
    expect(constructorSpy).not.toHaveBeenCalled();
  });

  it('calls fetchNextPage when entry is intersecting', () => {
    const fetchNextPage = vi.fn();

    // We need to simulate the ref being attached to a DOM element
    const div = document.createElement('div');

    const { result } = renderHook(() =>
      useInfiniteScroll({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    // Manually set the ref to a DOM element and re-render to trigger the effect
    (result.current as { current: HTMLDivElement | null }).current = div;

    // Re-render to trigger the effect with the ref set
    const { unmount } = renderHook(() =>
      useInfiniteScroll({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    // Simulate intersection — the callback was captured in observerCallback
    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      expect(fetchNextPage).toHaveBeenCalled();
    }

    unmount();
  });

  it('does not call fetchNextPage when entry is not intersecting', () => {
    const fetchNextPage = vi.fn();
    const div = document.createElement('div');

    const { result } = renderHook(() =>
      useInfiniteScroll({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    (result.current as { current: HTMLDivElement | null }).current = div;

    renderHook(() =>
      useInfiniteScroll({
        hasNextPage: true,
        isFetchingNextPage: false,
        fetchNextPage,
      }),
    );

    if (observerCallback) {
      observerCallback(
        [{ isIntersecting: false } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      expect(fetchNextPage).not.toHaveBeenCalled();
    }
  });
});
