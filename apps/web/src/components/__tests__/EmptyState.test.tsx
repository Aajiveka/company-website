import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../EmptyState';

const variants = [
  'no-results',
  'no-data',
  'no-jobs',
  'no-messages',
  'error',
] as const;

describe('EmptyState', () => {
  it.each(variants)('renders an SVG for the "%s" variant', (variant) => {
    const { container } = render(
      <EmptyState variant={variant} title={`Title for ${variant}`} />,
    );
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders the title', () => {
    render(<EmptyState variant="no-data" title="Nothing here" />);
    expect(
      screen.getByText('Nothing here'),
    ).toBeInTheDocument();
  });

  it('renders the description when provided', () => {
    render(
      <EmptyState
        variant="no-data"
        title="No data"
        description="Try adjusting your filters"
      />,
    );
    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument();
  });

  it('does not render a description when not provided', () => {
    const { container } = render(
      <EmptyState variant="no-data" title="No data" />,
    );
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(0);
  });

  it('renders action button and fires onClick', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <EmptyState
        variant="error"
        title="Something broke"
        action={{ label: 'Retry', onClick: handleClick }}
      />,
    );

    const button = screen.getByRole('button', { name: 'Retry' });
    expect(button).toBeInTheDocument();

    await user.click(button);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('does not render a button when action is not provided', () => {
    render(<EmptyState variant="no-results" title="No results" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <EmptyState variant="no-data" title="Test" className="mt-8" />,
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('mt-8');
  });
});
