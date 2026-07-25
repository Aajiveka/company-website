import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Card, CardHeader, CardTitle } from '../Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="my-custom-class">Content</Card>);
    const el = screen.getByText('Content');
    expect(el).toHaveClass('my-custom-class');
  });

  it('has default card styling', () => {
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
  it('renders children', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('has flex layout classes', () => {
    render(<CardHeader>Header</CardHeader>);
    const el = screen.getByText('Header');
    expect(el.className).toContain('flex');
    expect(el.className).toContain('items-center');
  });

  it('applies custom className', () => {
    render(<CardHeader className="extra">Header</CardHeader>);
    expect(screen.getByText('Header')).toHaveClass('extra');
  });
});

describe('CardTitle', () => {
  it('renders as an h3 element', () => {
    render(<CardTitle>My Title</CardTitle>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('My Title');
  });

  it('applies custom className', () => {
    render(<CardTitle className="custom-title">Title</CardTitle>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveClass('custom-title');
  });

  it('has proper font styling', () => {
    render(<CardTitle>Styled</CardTitle>);
    const el = screen.getByText('Styled');
    expect(el.className).toContain('font-semibold');
  });
});
