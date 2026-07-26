import { useQueryClient, useMutation } from '@tanstack/react-query';

// ---------------------------------------------------------------------------
// Generic optimistic toggle
// ---------------------------------------------------------------------------

/**
 * Reusable optimistic mutation for toggling a field in a cached list.
 *
 * Examples: save/unsave a job, mark a notification read/unread.
 *
 * @param opts.queryKey  - The query key whose cached list will be updated.
 * @param opts.mutationFn - The API call to perform.
 * @param opts.updateFn  - Pure function that produces the new list from the old one.
 */
export function useOptimisticToggle<T>(opts: {
  queryKey: unknown[];
  mutationFn: (id: string | number) => Promise<unknown>;
  updateFn: (old: T[], id: string | number) => T[];
}) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: opts.mutationFn,
    onMutate: async (id: string | number) => {
      await qc.cancelQueries({ queryKey: opts.queryKey });
      const previous = qc.getQueryData<T[]>(opts.queryKey);
      if (previous) {
        qc.setQueryData(opts.queryKey, opts.updateFn(previous, id));
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        qc.setQueryData(opts.queryKey, context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: opts.queryKey });
    },
  });
}

// ---------------------------------------------------------------------------
// Optimistic list remove
// ---------------------------------------------------------------------------

/**
 * Optimistic mutation that removes an item from a cached list by `id`.
 *
 * Examples: delete a notification, remove a saved job.
 */
export function useOptimisticRemove<T extends { id: string | number }>(opts: {
  queryKey: unknown[];
  mutationFn: (id: string | number) => Promise<unknown>;
}) {
  return useOptimisticToggle<T>({
    ...opts,
    updateFn: (old, id) => old.filter((item) => item.id !== id),
  });
}
