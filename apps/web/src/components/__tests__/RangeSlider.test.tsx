import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RangeSlider } from '../ui/RangeSlider';

describe('RangeSlider', () => {
  const defaultProps = {
    min: 0,
    max: 100,
    value: [20, 80] as [number, number],
    onChange: vi.fn(),
  };

  it('renders with label and formatted values', () => {
    render(
      <RangeSlider
        {...defaultProps}
        label="Salary"
        formatValue={(v) => `${v}K`}
      />,
    );
    expect(screen.getByText('Salary')).toBeInTheDocument();
    expect(screen.getByText('20K - 80K')).toBeInTheDocument();
  });

  it('renders label with default string formatter', () => {
    render(<RangeSlider {...defaultProps} label="Range" />);
    expect(screen.getByText('20 - 80')).toBeInTheDocument();
  });

  it('has two slider handles with correct aria attributes', () => {
    render(<RangeSlider {...defaultProps} label="Experience" />);

    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);

    const minSlider = screen.getByRole('slider', { name: 'Experience minimum' });
    expect(minSlider).toHaveAttribute('aria-valuemin', '0');
    expect(minSlider).toHaveAttribute('aria-valuemax', '80');
    expect(minSlider).toHaveAttribute('aria-valuenow', '20');

    const maxSlider = screen.getByRole('slider', { name: 'Experience maximum' });
    expect(maxSlider).toHaveAttribute('aria-valuemin', '20');
    expect(maxSlider).toHaveAttribute('aria-valuemax', '100');
    expect(maxSlider).toHaveAttribute('aria-valuenow', '80');
  });

  it('handles have correct aria-valuenow', () => {
    render(
      <RangeSlider
        {...defaultProps}
        value={[10, 90]}
        label="Price"
        formatValue={(v) => `$${v}`}
      />,
    );

    const minSlider = screen.getByRole('slider', { name: 'Price minimum' });
    const maxSlider = screen.getByRole('slider', { name: 'Price maximum' });

    expect(minSlider).toHaveAttribute('aria-valuenow', '10');
    expect(minSlider).toHaveAttribute('aria-valuetext', '$10');
    expect(maxSlider).toHaveAttribute('aria-valuenow', '90');
    expect(maxSlider).toHaveAttribute('aria-valuetext', '$90');
  });

  it('renders active track between handles', () => {
    const { container } = render(
      <RangeSlider {...defaultProps} value={[25, 75]} />,
    );

    // Active track has left: 25% and right: 25% (100 - 75)
    const activeTrack = container.querySelector('.bg-primary') as HTMLElement;
    expect(activeTrack).toBeInTheDocument();
    expect(activeTrack.style.left).toBe('25%');
    expect(activeTrack.style.right).toBe('25%');
  });

  it('uses "Range" as default label for aria when no label prop', () => {
    render(<RangeSlider {...defaultProps} />);

    expect(screen.getByRole('slider', { name: 'Range minimum' })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Range maximum' })).toBeInTheDocument();
  });

  it('positions handles correctly based on value', () => {
    const { container } = render(
      <RangeSlider {...defaultProps} value={[0, 100]} />,
    );

    const sliders = container.querySelectorAll('[role="slider"]');
    expect((sliders[0] as HTMLElement).style.left).toBe('0%');
    expect((sliders[1] as HTMLElement).style.left).toBe('100%');
  });
});
