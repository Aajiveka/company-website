import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it.each(['primary', 'secondary', 'outline', 'ghost', 'danger', 'accent'] as const)(
    'applies variant class for "%s"',
    (variant) => {
      render(<Button variant={variant}>btn</Button>);
      const btn = screen.getByRole('button');
      const variantClasses: Record<string, string> = {
        primary: 'bg-primary',
        secondary: 'bg-brand',
        outline: 'border-primary',
        ghost: 'text-primary',
        danger: 'bg-danger',
        accent: 'bg-accent',
      };
      expect(btn.className).toContain(variantClasses[variant]);
    },
  );

  it.each(['sm', 'md', 'lg'] as const)('applies size class for "%s"', (size) => {
    render(<Button size={size}>btn</Button>);
    const btn = screen.getByRole('button');
    const sizeClasses: Record<string, string> = {
      sm: 'h-9',
      md: 'h-11',
      lg: 'h-12',
    };
    expect(btn.className).toContain(sizeClasses[size]);
  });

  it('shows loading spinner when isLoading is true', () => {
    render(<Button isLoading>Loading</Button>);
    const btn = screen.getByRole('button');
    const spinner = btn.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('disables button when isLoading', () => {
    render(<Button isLoading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('disables button when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('does not fire onClick when isLoading', () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Save
      </Button>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards onClick handler', () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('applies primary variant by default', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button').className).toContain('bg-primary');
  });

  it('applies md size by default', () => {
    render(<Button>Default</Button>);
    expect(screen.getByRole('button').className).toContain('h-11');
  });
});
