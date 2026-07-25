import { useEffect } from 'react';
import { offlineQueue } from '@/lib/offlineQueue';
import { api } from '@/lib/axios';
import { useOnlineStatus } from './useOffline';

export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();

  useEffect(() => {
    if (!isOnline) return;
    const queue = offlineQueue.getQueue();
    if (queue.length === 0) return;

    (async () => {
      for (const mutation of queue) {
        try {
          await api({ method: mutation.method, url: mutation.url, data: mutation.data });
          offlineQueue.remove(mutation.id);
        } catch {
          break; // Stop on first failure, retry later
        }
      }
    })();
  }, [isOnline]);
}
