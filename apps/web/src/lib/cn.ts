import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine class names, letting a caller's `className` actually win.
 *
 * This used to be clsx alone, which meant `<Button className="bg-white">` produced
 * `bg-primary bg-white` and the winner depended on CSS source order. tailwind-merge
 * resolves conflicting utilities so the last one applies, which is what every call site
 * already assumed.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
