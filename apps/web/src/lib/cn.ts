import { clsx, type ClassValue } from 'clsx';

/** Tiny className combiner (clsx wrapper) used across UI components. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
