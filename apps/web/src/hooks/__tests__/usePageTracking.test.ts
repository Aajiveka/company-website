import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

// Mock react-router-dom
const mockPathname = { pathname: '/initial' };
vi.mock('react-router-dom', () => ({
  useLocation: () => mockPathname,
}));

// Mock analytics
const mockTrackPageView = vi.fn();
vi.mock('@/lib/analytics', () => ({
  trackPageView: (...args: unknown[]) => mockTrackPageView(...args),
}));

import { usePageTracking } from '../usePageTracking';

describe('usePageTracking', () => {
  beforeEach(() => {
    mockTrackPageView.mockClear();
  });

  it('calls trackPageView with the current pathname on mount', () => {
    mockPathname.pathname = '/dashboard';
    renderHook(() => usePageTracking());

    expect(mockTrackPageView).toHaveBeenCalledWith('/dashboard');
    expect(mockTrackPageView).toHaveBeenCalledTimes(1);
  });

  it('calls trackPageView again when pathname changes', () => {
    mockPathname.pathname = '/page-a';
    const { rerender } = renderHook(() => usePageTracking());

    expect(mockTrackPageView).toHaveBeenCalledWith('/page-a');

    mockPathname.pathname = '/page-b';
    rerender();

    expect(mockTrackPageView).toHaveBeenCalledWith('/page-b');
    expect(mockTrackPageView).toHaveBeenCalledTimes(2);
  });
});
