import { describe, it, expect } from 'vitest';
import { cn } from '../cn';

describe('cn', () => {
  it('merges simple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    expect(cn('bg-primary', 'bg-white')).toBe('bg-white');
  });

  it('handles conditional classes via clsx syntax', () => {
    expect(cn('base', false && 'hidden', 'extra')).toBe('base extra');
  });

  it('handles arrays', () => {
    expect(cn(['px-2', 'py-1'], 'text-sm')).toBe('px-2 py-1 text-sm');
  });

  it('handles objects', () => {
    expect(cn({ 'bg-red-500': true, 'bg-blue-500': false })).toBe('bg-red-500');
  });

  it('returns empty string for no input', () => {
    expect(cn()).toBe('');
  });

  it('resolves padding conflicts', () => {
    expect(cn('p-4', 'p-6')).toBe('p-6');
  });
});
