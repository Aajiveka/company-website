import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiSelect } from '../ui/MultiSelect';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));
import type { MultiSelectOption } from '../ui/MultiSelect';

const OPTIONS: MultiSelectOption[] = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular' },
  { label: 'Svelte', value: 'svelte' },
];

describe('MultiSelect', () => {
  let onChange: (value: string[]) => void;

  beforeEach(() => {
    onChange = vi.fn();
  });

  it('renders placeholder when no items selected', () => {
    render(
      <MultiSelect options={OPTIONS} value={[]} onChange={onChange} placeholder="Pick skills" />,
    );
    expect(screen.getByText('Pick skills')).toBeInTheDocument();
  });

  it('renders default placeholder when none specified', () => {
    render(<MultiSelect options={OPTIONS} value={[]} onChange={onChange} />);
    expect(screen.getByText('multiSelect.placeholder')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<MultiSelect options={OPTIONS} value={[]} onChange={onChange} />);
    const trigger = screen.getByRole('button', { expanded: false });
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // All options visible
    OPTIONS.forEach((opt) => {
      expect(screen.getByText(opt.label)).toBeInTheDocument();
    });
  });

  it('selects an option (adds chip) and calls onChange', () => {
    render(<MultiSelect options={OPTIONS} value={[]} onChange={onChange} />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));

    // Select React option via mousedown
    const reactOption = screen.getByText('React');
    fireEvent.mouseDown(reactOption);

    expect(onChange).toHaveBeenCalledWith(['react']);
  });

  it('shows chips for selected values', () => {
    render(
      <MultiSelect options={OPTIONS} value={['react', 'vue']} onChange={onChange} />,
    );
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vue')).toBeInTheDocument();
  });

  it('removes a chip (deselects option) and calls onChange', () => {
    render(
      <MultiSelect options={OPTIONS} value={['react', 'vue']} onChange={onChange} />,
    );

    const removeReact = screen.getByLabelText('Remove React');
    fireEvent.click(removeReact);

    expect(onChange).toHaveBeenCalledWith(['vue']);
  });

  it('filters options by search text', () => {
    render(<MultiSelect options={OPTIONS} value={[]} onChange={onChange} />);

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText('multiSelect.search');
    fireEvent.change(searchInput, { target: { value: 'ang' } });

    // Only Angular should match
    expect(screen.getByText('Angular')).toBeInTheDocument();
    expect(screen.queryByText('React')).not.toBeInTheDocument();
    expect(screen.queryByText('Vue')).not.toBeInTheDocument();
    expect(screen.queryByText('Svelte')).not.toBeInTheDocument();
  });

  it('shows "No options found" when search matches nothing', () => {
    render(<MultiSelect options={OPTIONS} value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button'));

    const searchInput = screen.getByPlaceholderText('multiSelect.search');
    fireEvent.change(searchInput, { target: { value: 'zzzzz' } });

    expect(screen.getByText('multiSelect.noOptions')).toBeInTheDocument();
  });

  it('calls onChange with updated values when toggling off', () => {
    const { container } = render(
      <MultiSelect options={OPTIONS} value={['react', 'vue']} onChange={onChange} />,
    );

    // Click the trigger div (has aria-haspopup)
    const trigger = container.querySelector('[aria-haspopup="listbox"]')!;
    fireEvent.click(trigger);

    // Deselect React via clicking option
    const reactOption = screen.getByRole('option', { selected: true, name: /React/ });
    fireEvent.mouseDown(reactOption);

    expect(onChange).toHaveBeenCalledWith(['vue']);
  });

  it('closes dropdown on click outside', () => {
    render(
      <div>
        <span data-testid="outside">Outside</span>
        <MultiSelect options={OPTIONS} value={[]} onChange={onChange} />
      </div>,
    );

    // Open dropdown
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('shows overflow count when selected exceeds maxDisplay', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        value={['react', 'vue', 'angular', 'svelte']}
        onChange={onChange}
        maxDisplay={2}
      />,
    );

    expect(screen.getByText('multiSelect.more')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        value={[]}
        onChange={onChange}
        label="Skills"
      />,
    );
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('renders error message when provided', () => {
    render(
      <MultiSelect
        options={OPTIONS}
        value={[]}
        onChange={onChange}
        error="Required field"
      />,
    );
    expect(screen.getByText('Required field')).toBeInTheDocument();
  });

  it('shows selected count footer and Clear all button', () => {
    const { container } = render(
      <MultiSelect options={OPTIONS} value={['react']} onChange={onChange} />,
    );

    const trigger = container.querySelector('[aria-haspopup="listbox"]')!;
    fireEvent.click(trigger);

    expect(screen.getByText('multiSelect.selected')).toBeInTheDocument();
    expect(screen.getByText('multiSelect.clearAll')).toBeInTheDocument();

    fireEvent.click(screen.getByText('multiSelect.clearAll'));
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
