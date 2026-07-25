import { useCallback, useEffect, useRef, useState } from 'react';

const THRESHOLD = 80;

/**
 * Pull-to-refresh hook for mobile touch devices.
 *
 * Attach `ref` to the scrollable container. When the user pulls down
 * past 80 px while already scrolled to the top, `onRefresh` fires.
 * `isRefreshing` can be used to render a spinner in the consumer.
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const ref = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const startY = useRef(0);
  const pulling = useRef(false);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      const el = ref.current;
      if (!el || isRefreshing) return;
      if (el.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    },
    [isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      const delta = e.touches[0].clientY - startY.current;
      if (delta > 0) {
        e.preventDefault();
      }
    },
    [isRefreshing],
  );

  const handleTouchEnd = useCallback(
    async (e: TouchEvent) => {
      if (!pulling.current || isRefreshing) return;
      pulling.current = false;

      const delta = e.changedTouches[0].clientY - startY.current;
      if (delta >= THRESHOLD) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
        }
      }
    },
    [isRefreshing, onRefresh],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return { ref, isRefreshing };
}
