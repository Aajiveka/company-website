import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Badge, type BadgeTone } from '../Badge';

describe('Badge', () => {
  it('renders children text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  const toneExpectations: [BadgeTone, string][] = [
    ['gray', 'bg-gray-100'],
    ['blue', 'bg-blue-50'],
    ['green', 'bg-green-50'],
    ['amber', 'bg-amber-50'],
    ['red', 'bg-red-50'],
    ['purple', 'bg-purple-50'],
  ];

  it.each(toneExpectations)(
    'applies correct classes for tone "%s"',
    (tone, expectedClass) => {
      render(<Badge tone={tone}>Label</Badge>);
      const badge = screen.getByText('Label');
      expect(badge.className).toContain(expectedClass);
    },
  );

  it('defaults to gray tone when no tone prop is provided', () => {
    render(<Badge>Default</Badge>);
    const el = screen.getByText('Default');
    expect(el.className).toContain('bg-gray-100');
    expect(el.className).toContain('text-gray-700');
  });

  it.each(['gray', 'blue', 'green', 'amber', 'red', 'purple'] as BadgeTone[])(
    'renders without crashing for tone "%s"',
    (tone) => {
      const { container } = render(<Badge tone={tone}>Test</Badge>);
      expect(container.querySelector('span')).toBeInTheDocument();
    },
  );

  it('has correct base styling', () => {
    render(<Badge>Status</Badge>);
    const el = screen.getByText('Status');
    expect(el.tagName).toBe('SPAN');
    expect(el.className).toContain('rounded-full');
    expect(el.className).toContain('text-xs');
    expect(el.className).toContain('font-medium');
  });
});
