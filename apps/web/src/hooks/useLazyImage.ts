import { useEffect, useRef, useState } from 'react';

/**
 * Uses IntersectionObserver to detect when an element enters the viewport.
 * Once in view, the element stays marked as visible (observer is disconnected).
 *
 * Useful for lazy-loading images or deferring heavy renders until visible.
 */
export function useLazyImage() {
  const ref = useRef<HTMLElement | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '100px' },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, isInView };
}
