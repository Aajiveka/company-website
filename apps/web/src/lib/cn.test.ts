import { describe, expect, it } from 'vitest';
import { cn } from './cn';

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('px-2', 'py-3')).toBe('px-2 py-3');
  });

  it('resolves conflicting tailwind classes (last wins)', () => {
    expect(cn('bg-primary', 'bg-white')).toBe('bg-white');
  });

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('handles undefined and null', () => {
    expect(cn('a', undefined, null, 'b')).toBe('a b');
  });

  it('returns empty string for no input', () => {
    expect(cn()).toBe('');
  });
});
