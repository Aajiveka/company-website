import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, type BadgeTone } from '../Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('has correct base styling', () => {
    render(<Badge>Status</Badge>);
    const el = screen.getByText('Status');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toContain('rounded-full');
    expect(el.className).toContain('text-xs');
    expect(el.className).toContain('font-medium');
  });

  it.each<{ tone: BadgeTone; expected: string }>([
    { tone: 'green', expected: 'bg-green-50' },
    { tone: 'amber', expected: 'bg-amber-50' },
    { tone: 'red', expected: 'bg-red-50' },
    { tone: 'blue', expected: 'bg-blue-50' },
    { tone: 'gray', expected: 'bg-gray-100' },
    { tone: 'purple', expected: 'bg-purple-50' },
  ])('applies correct classes for tone=$tone', ({ tone, expected }) => {
    render(<Badge tone={tone}>Label</Badge>);
    const el = screen.getByText('Label');
    expect(el.className).toContain(expected);
  });

  it('defaults to gray tone when no tone is specified', () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText('Default');
    expect(el.className).toContain('bg-gray-100');
    expect(el.className).toContain('text-gray-700');
  });
});
