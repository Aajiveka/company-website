import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Dropdown } from '@/components/ui/Dropdown';

const items = [
  { label: 'Edit', onSelect: vi.fn() },
  { label: 'Delete', onSelect: vi.fn(), danger: true },
];

describe('Dropdown', () => {
  it('renders the trigger', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('does not show menu items before trigger click', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    expect(screen.queryByText('Edit')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('accepts items prop', () => {
    const { container } = render(<Dropdown trigger={<span>Menu</span>} items={items} />);
    expect(container).toBeTruthy();
  });

  it('renders with custom trigger element', () => {
    render(<Dropdown trigger={<button data-testid="custom-trigger">Open</button>} items={items} />);
    expect(screen.getByTestId('custom-trigger')).toBeInTheDocument();
  });

  it('renders with empty items array', () => {
    render(<Dropdown trigger={<span>Menu</span>} items={[]} />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });

  it('renders with icon items', () => {
    const iconItems = [
      { label: 'Settings', onSelect: vi.fn(), icon: <span>S</span> },
    ];
    render(<Dropdown trigger={<span>Menu</span>} items={iconItems} />);
    expect(screen.getByText('Menu')).toBeInTheDocument();
  });
});
