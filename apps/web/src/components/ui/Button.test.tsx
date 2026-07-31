import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click events', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('is disabled when isLoading is true', () => {
    render(<Button isLoading>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    const { container } = render(<Button isLoading>Save</Button>);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  // The spinner slot means Slot always receives a two-item children array — the `undefined`
  // that `isLoading && …` leaves behind, plus the real child. React.Children.count keeps that
  // undefined, so without Slottable this threw "Slot failed to slot onto its children" and
  // took out every page rendering a Button asChild.
  it('renders asChild as the child element, merging its classes', () => {
    const { container } = render(
      <Button asChild variant="outline">
        <a href="/jobs/1">View details</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'View details' });
    expect(link).toHaveAttribute('href', '/jobs/1');
    expect(link.className).not.toBe('');
    // The <button> is replaced, not wrapped.
    expect(container.querySelector('button')).toBeNull();
  });

  it('keeps the spinner alongside the child when asChild is loading', () => {
    const { container } = render(
      <Button asChild isLoading>
        <a href="/jobs/1">View details</a>
      </Button>,
    );
    const link = screen.getByRole('link');
    expect(link).toHaveTextContent('View details');
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });
});
