import { useState, useCallback, useEffect, useRef } from 'react';

function storageKey(key: string): string {
  return `draft:${key}`;
}

function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function useFormAutosave<T>(key: string, initialData: T): {
  data: T;
  update: (patch: Partial<T>) => void;
  clear: () => void;
  hasDraft: boolean;
} {
  const [hasDraft] = useState(() => readDraft<T>(key) !== null);
  const [data, setData] = useState<T>(() => readDraft<T>(key) ?? initialData);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestDataRef = useRef(data);

  latestDataRef.current = data;

  const scheduleSave = useCallback(
    (nextData: T) => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey(key), JSON.stringify(nextData));
        } catch {
          // localStorage full or unavailable — silently skip
        }
        timerRef.current = null;
      }, 500);
    },
    [key],
  );

  const update = useCallback(
    (patch: Partial<T>) => {
      setData((prev) => {
        const next = { ...prev, ...patch };
        scheduleSave(next);
        return next;
      });
    },
    [scheduleSave],
  );

  const clear = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    localStorage.removeItem(storageKey(key));
  }, [key]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return { data, update, clear, hasDraft };
}
