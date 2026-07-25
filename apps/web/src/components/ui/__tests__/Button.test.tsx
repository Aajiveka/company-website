import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles onClick', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Press</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Press' }));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('shows loading state and disables the button', () => {
    render(<Button isLoading>Saving</Button>);
    const btn = screen.getByRole('button', { name: 'Saving' });
    expect(btn).toBeDisabled();
    // Loader2 icon renders with animate-spin class
    const spinner = btn.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('does not fire onClick when loading', async () => {
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Save
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('renders disabled state', () => {
    render(<Button disabled>Nope</Button>);
    expect(screen.getByRole('button', { name: 'Nope' })).toBeDisabled();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button', { name: 'Primary' });
    expect(btn.className).toContain('bg-primary');
  });

  it('applies outline variant classes', () => {
    render(<Button variant="outline">Outline</Button>);
    const btn = screen.getByRole('button', { name: 'Outline' });
    expect(btn.className).toContain('border');
    expect(btn.className).toContain('text-primary');
  });

  it('applies sm size classes', () => {
    render(<Button size="sm">Small</Button>);
    const btn = screen.getByRole('button', { name: 'Small' });
    expect(btn.className).toContain('h-9');
    expect(btn.className).toContain('px-3');
  });

  it('applies md size classes by default', () => {
    render(<Button>Medium</Button>);
    const btn = screen.getByRole('button', { name: 'Medium' });
    expect(btn.className).toContain('h-11');
    expect(btn.className).toContain('px-5');
  });

  it('applies lg size classes', () => {
    render(<Button size="lg">Large</Button>);
    const btn = screen.getByRole('button', { name: 'Large' });
    expect(btn.className).toContain('h-12');
    expect(btn.className).toContain('px-7');
  });
});
