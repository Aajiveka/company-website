interface QueuedMutation {
  id: string;
  method: 'post' | 'put' | 'patch' | 'delete';
  url: string;
  data?: unknown;
  timestamp: number;
}

class OfflineQueue {
  private readonly STORAGE_KEY = 'offline-mutation-queue';

  getQueue(): QueuedMutation[] {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch { return []; }
  }

  add(mutation: Omit<QueuedMutation, 'id' | 'timestamp'>): void {
    const queue = this.getQueue();
    queue.push({ ...mutation, id: crypto.randomUUID(), timestamp: Date.now() });
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
  }

  remove(id: string): void {
    const queue = this.getQueue().filter(m => m.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
  }

  clear(): void { localStorage.removeItem(this.STORAGE_KEY); }

  get size(): number { return this.getQueue().length; }
}

export const offlineQueue = new OfflineQueue();
export type { QueuedMutation };
