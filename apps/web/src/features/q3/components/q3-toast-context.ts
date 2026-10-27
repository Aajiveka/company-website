import { createContext, useContext } from 'react';

export interface ToastApi {
  success: (title: string, body?: string) => void;
  error: (title: string, body?: string) => void;
}

/** Kept apart from Q3Toast.tsx so that file exports components only (fast refresh). */
export const ToastContext = createContext<ToastApi | null>(null);

/** The designs' dark feedback toast. Only works under Q3Shell, which provides it. */
export function useQ3Toast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useQ3Toast must be used inside Q3ToastProvider');
  return ctx;
}
