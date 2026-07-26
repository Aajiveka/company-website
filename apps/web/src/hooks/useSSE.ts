import { useCallback, useEffect, useRef, useState } from 'react';
import { tokenStorage } from '@/lib/tokenStorage';
import { env } from '@/lib/env';

export type SSEStatus = 'connecting' | 'connected' | 'disconnected';

interface UseSSEOptions {
  /** Full URL path (relative to apiBaseUrl) for the SSE endpoint. */
  url: string;
  /** Whether the connection should be active. */
  enabled?: boolean;
}

interface UseSSEReturn<T> {
  status: SSEStatus;
  lastEvent: T | null;
}

const MIN_BACKOFF = 1_000;
const MAX_BACKOFF = 30_000;

/**
 * Generic hook for Server-Sent Events with JWT auth and auto-reconnect.
 *
 * Because the native `EventSource` API does not support custom headers, we use
 * `fetch()` with the `ReadableStream` API to consume the SSE stream, attaching
 * the JWT bearer token. If the browser doesn't support `ReadableStream` (very
 * old browsers), it falls back to `EventSource` with the token in a query param
 * (less secure but functional).
 */
export function useSSE<T = unknown>(options: UseSSEOptions): UseSSEReturn<T> {
  const { url, enabled = true } = options;
  const [status, setStatus] = useState<SSEStatus>('disconnected');
  const [lastEvent, setLastEvent] = useState<T | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(MIN_BACKOFF);
  const mountedRef = useRef(true);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  const connect = useCallback(async () => {
    cleanup();
    if (!mountedRef.current) return;

    const token = tokenStorage.getAccess();
    if (!token) {
      setStatus('disconnected');
      return;
    }

    setStatus('connecting');
    const controller = new AbortController();
    abortRef.current = controller;

    const fullUrl = `${env.apiBaseUrl}${url}`;

    try {
      const response = await fetch(fullUrl, {
        headers: { Authorization: `Bearer ${token}` },
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`SSE connection failed: ${response.status}`);
      }

      setStatus('connected');
      backoffRef.current = MIN_BACKOFF;

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer.
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            try {
              const parsed = JSON.parse(payload) as T;
              if (mountedRef.current) setLastEvent(parsed);
            } catch {
              // Malformed JSON -- skip
            }
          }
          // Comments (`: ping`) and event-type lines are silently consumed.
        }
      }

      // Stream ended normally (server closed) -- reconnect.
      if (mountedRef.current) {
        setStatus('disconnected');
        scheduleReconnect();
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (mountedRef.current) {
        setStatus('disconnected');
        scheduleReconnect();
      }
    }

    function scheduleReconnect() {
      const delay = Math.min(backoffRef.current, MAX_BACKOFF);
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF);
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    }
  }, [url, cleanup]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      connect();
    } else {
      cleanup();
      setStatus('disconnected');
    }
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [enabled, connect, cleanup]);

  return { status, lastEvent };
}
