import { createRef } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '../Input';

describe('Input', () => {
  it('renders with placeholder', () => {
    render(<Input placeholder="Enter name" />);
    expect(screen.getByPlaceholderText('Enter name')).toBeInTheDocument();
  });

  it('handles onChange', async () => {
    const onChange = vi.fn();
    render(<Input placeholder="Type here" onChange={onChange} />);
    const input = screen.getByPlaceholderText('Type here');
    await userEvent.type(input, 'hello');
    expect(onChange).toHaveBeenCalledTimes(5);
  });

  it('shows label when provided', () => {
    render(<Input label="Email" placeholder="you@example.com" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Input label="Name" required />);
    const asterisk = screen.getByText('*');
    expect(asterisk).toBeInTheDocument();
  });

  it('applies error styling and shows error message', () => {
    render(<Input label="Password" error="Too short" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
    expect(input.className).toContain('border-danger');
  });

  it('does not show error when error prop is not set', () => {
    render(<Input label="Clean" />);
    const input = screen.getByLabelText('Clean');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('forwards ref', () => {
    const ref = createRef<HTMLInputElement>();
    render(<Input ref={ref} placeholder="ref test" />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(ref.current?.placeholder).toBe('ref test');
  });
});
