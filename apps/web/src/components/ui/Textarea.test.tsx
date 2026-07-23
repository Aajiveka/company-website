import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders with a label', () => {
    render(<Textarea label="Feedback" />);
    expect(screen.getByLabelText('Feedback')).toBeInTheDocument();
  });

  it('shows error message with role="alert"', () => {
    render(<Textarea label="Message" error="Too short" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });

  it('sets aria-invalid when error is present', () => {
    render(<Textarea label="Message" error="Required" />);
    expect(screen.getByLabelText('Message')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when no error', () => {
    render(<Textarea label="Message" />);
    expect(screen.getByLabelText('Message')).toHaveAttribute('aria-invalid', 'false');
  });

  it('shows required asterisk', () => {
    const { container } = render(<Textarea label="Bio" required />);
    expect(container.querySelector('.text-danger')).toHaveTextContent('*');
  });

  it('applies error border style', () => {
    render(<Textarea label="Notes" error="Invalid" />);
    expect(screen.getByLabelText('Notes')).toHaveClass('border-danger');
  });
});
