import { useCallback } from 'react';

type LazyImportFn = () => Promise<unknown>;

const routeMap: Record<string, LazyImportFn> = {
  '/jobs': () => import('@/features/jobs/pages/JobSearchPage'),
  '/about': () => import('@/features/public/pages/AboutPage'),
  '/pricing': () => import('@/features/public/pages/PricingPage'),
  '/contact': () => import('@/features/public/pages/ContactPage'),
  '/blogs': () => import('@/features/public/pages/BlogsPage'),
};

const prefetched = new Set<string>();

/**
 * Returns `onMouseEnter` and `onFocus` handlers that dynamically import
 * the route module for the given path, warming the browser module cache.
 *
 * Each path is imported at most once; unknown paths are silently skipped.
 */
export function usePrefetchRoute(path: string) {
  const prefetch = useCallback(() => {
    if (prefetched.has(path)) return;

    const loader = routeMap[path];
    if (!loader) return;

    prefetched.add(path);
    void loader();
  }, [path]);

  return {
    onMouseEnter: prefetch,
    onFocus: prefetch,
  };
}
