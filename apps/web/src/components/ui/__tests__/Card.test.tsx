import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies className prop', () => {
    render(<Card className="mt-4">Styled</Card>);
    const el = screen.getByText('Styled');
    expect(el.className).toContain('mt-4');
  });

  it('has default styling', () => {
    render(<Card>Default</Card>);
    const el = screen.getByText('Default');
    expect(el.className).toContain('rounded-xl');
    expect(el.className).toContain('bg-white');
    expect(el.className).toContain('shadow-card');
  });

  it('renders as a div', () => {
    render(<Card>Div check</Card>);
    expect(screen.getByText('Div check').tagName).toBe('DIV');
  });
});

describe('CardHeader', () => {
  it('renders children and has flex layout', () => {
    render(<CardHeader>Header content</CardHeader>);
    const el = screen.getByText('Header content');
    expect(el.className).toContain('flex');
    expect(el.className).toContain('items-center');
  });
});

describe('CardTitle', () => {
  it('renders as an h3 with proper styling', () => {
    render(<CardTitle>Title text</CardTitle>);
    const el = screen.getByText('Title text');
    expect(el.tagName).toBe('H3');
    expect(el.className).toContain('font-semibold');
  });
});
