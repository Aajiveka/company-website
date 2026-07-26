import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOptimisticToggle, useOptimisticRemove } from '@/hooks/useOptimistic';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import type { ReactNode } from 'react';

function createWrapperWithClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, wrapper };
}

describe('useOptimisticToggle', () => {
  it('optimistically updates the cache on mutate', async () => {
    const { queryClient, wrapper } = createWrapperWithClient();

    const key = ['items-toggle'];
    queryClient.setQueryData(key, [
      { id: '1', saved: false },
      { id: '2', saved: false },
    ]);

    const mutationFn = vi.fn().mockResolvedValue({});

    const { result } = renderHook(
      () =>
        useOptimisticToggle<{ id: string; saved: boolean }>({
          queryKey: key,
          mutationFn,
          updateFn: (old, id) =>
            old.map((item) => (item.id === id ? { ...item, saved: !item.saved } : item)),
        }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('1');
    });

    // Check optimistic update happened
    await waitFor(() => {
      const cached = queryClient.getQueryData<{ id: string; saved: boolean }[]>(key);
      expect(cached?.[0].saved).toBe(true);
      expect(cached?.[1].saved).toBe(false);
    });

    expect(mutationFn).toHaveBeenCalledWith('1', expect.anything());
  });
});

describe('useOptimisticRemove', () => {
  it('removes an item from the cache optimistically', async () => {
    const { queryClient, wrapper } = createWrapperWithClient();

    const key = ['items-remove'];
    queryClient.setQueryData(key, [
      { id: '1', name: 'A' },
      { id: '2', name: 'B' },
    ]);

    const mutationFn = vi.fn().mockResolvedValue({});

    const { result } = renderHook(
      () =>
        useOptimisticRemove<{ id: string; name: string }>({
          queryKey: key,
          mutationFn,
        }),
      { wrapper },
    );

    act(() => {
      result.current.mutate('1');
    });

    await waitFor(() => {
      const cached = queryClient.getQueryData<{ id: string; name: string }[]>(key);
      expect(cached).toHaveLength(1);
      expect(cached?.[0].id).toBe('2');
    });
  });
});
