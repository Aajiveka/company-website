import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from './Alert';

describe('Alert', () => {
  it('renders with role="alert"', () => {
    render(<Alert>Something happened</Alert>);
    expect(screen.getByRole('alert')).toHaveTextContent('Something happened');
  });

  it('defaults to info variant', () => {
    const { container } = render(<Alert>Info</Alert>);
    expect(container.firstChild).toHaveClass('border-blue-200');
  });

  it('renders error variant', () => {
    const { container } = render(<Alert variant="error">Error</Alert>);
    expect(container.firstChild).toHaveClass('border-red-200');
  });

  it('renders success variant', () => {
    const { container } = render(<Alert variant="success">Success</Alert>);
    expect(container.firstChild).toHaveClass('border-green-200');
  });
});
