import { describe, it, expect, beforeEach, vi } from 'vitest';
import { offlineQueue } from '@/lib/offlineQueue';

describe('OfflineQueue', () => {
  beforeEach(() => {
    localStorage.clear();
    // Mock crypto.randomUUID
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('test-uuid-1234' as `${string}-${string}-${string}-${string}-${string}`);
  });

  it('starts with an empty queue', () => {
    expect(offlineQueue.getQueue()).toEqual([]);
    expect(offlineQueue.size).toBe(0);
  });

  it('adds a mutation to the queue', () => {
    offlineQueue.add({ method: 'post', url: '/api/jobs', data: { title: 'Dev' } });

    const queue = offlineQueue.getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].method).toBe('post');
    expect(queue[0].url).toBe('/api/jobs');
    expect(queue[0].data).toEqual({ title: 'Dev' });
    expect(queue[0].id).toBe('test-uuid-1234');
    expect(typeof queue[0].timestamp).toBe('number');
  });

  it('persists to localStorage', () => {
    offlineQueue.add({ method: 'put', url: '/api/test' });

    const stored = JSON.parse(localStorage.getItem('offline-mutation-queue')!);
    expect(stored).toHaveLength(1);
    expect(stored[0].method).toBe('put');
  });

  it('removes a mutation by id', () => {
    offlineQueue.add({ method: 'post', url: '/api/a' });
    expect(offlineQueue.size).toBe(1);

    offlineQueue.remove('test-uuid-1234');
    expect(offlineQueue.size).toBe(0);
  });

  it('clears the entire queue', () => {
    offlineQueue.add({ method: 'post', url: '/api/a' });
    offlineQueue.add({ method: 'delete', url: '/api/b' });
    expect(offlineQueue.size).toBe(2);

    offlineQueue.clear();
    expect(offlineQueue.size).toBe(0);
    expect(localStorage.getItem('offline-mutation-queue')).toBeNull();
  });

  it('returns empty array when localStorage contains invalid JSON', () => {
    localStorage.setItem('offline-mutation-queue', 'not-json');
    expect(offlineQueue.getQueue()).toEqual([]);
  });

  it('reports correct size', () => {
    expect(offlineQueue.size).toBe(0);
    offlineQueue.add({ method: 'post', url: '/api/1' });
    expect(offlineQueue.size).toBe(1);
    offlineQueue.add({ method: 'post', url: '/api/2' });
    expect(offlineQueue.size).toBe(2);
  });
});
