import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Select } from '@/components/ui/Select';

const options = [
  { label: 'Apple', value: 'apple' },
  { label: 'Banana', value: 'banana' },
  { label: 'Cherry', value: 'cherry' },
];

describe('Select', () => {
  it('renders all options', () => {
    render(<Select options={options} />);
    const selectEl = screen.getByRole('combobox');
    expect(selectEl).toBeInTheDocument();
    expect(screen.getByText('Apple')).toBeInTheDocument();
    expect(screen.getByText('Banana')).toBeInTheDocument();
    expect(screen.getByText('Cherry')).toBeInTheDocument();
  });

  it('renders placeholder option when provided', () => {
    render(<Select options={options} placeholder="Choose fruit" />);
    expect(screen.getByText('Choose fruit')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Select options={options} label="Fruit" />);
    expect(screen.getByText('Fruit')).toBeInTheDocument();
    expect(screen.getByLabelText('Fruit')).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Select options={options} label="Fruit" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('calls onChange when selection changes', () => {
    const onChange = vi.fn();
    render(<Select options={options} onChange={onChange} />);
    const selectEl = screen.getByRole('combobox');
    fireEvent.change(selectEl, { target: { value: 'banana' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('renders error message when provided', () => {
    render(<Select options={options} error="Required field" />);
    expect(screen.getByText('Required field')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('sets aria-invalid when there is an error', () => {
    render(<Select options={options} error="Bad" />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not set aria-invalid when there is no error', () => {
    render(<Select options={options} />);
    expect(screen.getByRole('combobox')).toHaveAttribute('aria-invalid', 'false');
  });

  it('supports custom className', () => {
    render(<Select options={options} className="w-64" />);
    expect(screen.getByRole('combobox').className).toContain('w-64');
  });

  it('renders numeric option values', () => {
    const numOptions = [
      { label: 'One', value: 1 },
      { label: 'Two', value: 2 },
    ];
    render(<Select options={numOptions} />);
    expect(screen.getByText('One')).toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
  });
});
