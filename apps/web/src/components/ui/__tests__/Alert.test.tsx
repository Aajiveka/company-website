import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert', () => {
  it('renders message', () => {
    render(<Alert>Something happened</Alert>);
    expect(screen.getByText('Something happened')).toBeInTheDocument();
  });

  it('has role="alert"', () => {
    render(<Alert>Check</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('defaults to info variant', () => {
    render(<Alert>Default info</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('bg-blue-50');
    expect(el.className).toContain('text-blue-800');
  });

  it('applies success variant styling', () => {
    render(<Alert variant="success">Done</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('bg-green-50');
    expect(el.className).toContain('text-green-800');
  });

  it('applies error variant styling', () => {
    render(<Alert variant="error">Failed</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('bg-red-50');
    expect(el.className).toContain('text-red-800');
  });

  it('applies warning variant styling', () => {
    render(<Alert variant="warning">Caution</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('bg-amber-50');
    expect(el.className).toContain('text-amber-800');
  });

  it('applies info variant styling explicitly', () => {
    render(<Alert variant="info">Note</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('bg-blue-50');
    expect(el.className).toContain('border-blue-200');
  });

  it('merges custom className', () => {
    render(<Alert className="mt-2">Custom</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toContain('mt-2');
  });
});
