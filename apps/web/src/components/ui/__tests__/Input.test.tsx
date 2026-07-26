import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input } from '../Input';

describe('Input', () => {
  it('renders label text', () => {
    render(<Input label="Email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('shows error message when error prop is set', () => {
    render(<Input label="Name" error="Required field" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required field');
  });

  it('applies aria-invalid when error is present', () => {
    render(<Input label="Name" error="Bad value" />);
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
  });

  it('applies error border styling when error is present', () => {
    render(<Input label="Name" error="Oops" />);
    const input = screen.getByLabelText('Name');
    expect(input.className).toContain('border-danger');
  });

  it('does not show error styling when no error', () => {
    render(<Input label="Name" />);
    const input = screen.getByLabelText('Name');
    expect(input.className).not.toContain('border-danger');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('forwards placeholder prop', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('forwards type prop', () => {
    render(<Input label="Password" type="password" />);
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('forwards disabled prop', () => {
    render(<Input label="Disabled" disabled />);
    expect(screen.getByLabelText('Disabled')).toBeDisabled();
  });

  it('handles onChange events', () => {
    const handleChange = vi.fn();
    render(<Input label="Field" onChange={handleChange} />);
    fireEvent.change(screen.getByLabelText('Field'), { target: { value: 'hello' } });
    expect(handleChange).toHaveBeenCalledOnce();
  });

  it('shows required indicator when required', () => {
    render(<Input label="Name" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });
});
