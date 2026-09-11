import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '../Select';
import { optionsFromChildren } from '../searchable/optionsFromChildren';
import { SEARCHABLE_THRESHOLD } from '../searchable/useOptionSearch';
import { selectOption, selectedValue } from '@/test-utils/selectOption';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }),
}));

/**
 * `Select` picks its own shape from how many options it was given.
 *
 * Short lists stay a native <select> — the OS picker is better on a phone and a search box
 * over four options is noise. Long ones become a combobox, because masters like Function /
 * Department run to ~1,566 rows. These tests pin the switchover and the contract that holds
 * across it: either shape reports back through `onChange` as `e.target.value`.
 */

const opts = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ value: String(i + 1), label: `Option ${i + 1}` }));

describe('Select — native / searchable switchover', () => {
  it('stays a native select at the threshold', () => {
    render(<Select label="Gender" options={opts(SEARCHABLE_THRESHOLD)} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Gender')).toBeInstanceOf(HTMLSelectElement);
  });

  it('becomes a searchable combobox one option past it', () => {
    render(<Select label="District" options={opts(SEARCHABLE_THRESHOLD + 1)} onChange={vi.fn()} />);
    expect(screen.getByLabelText('District')).not.toBeInstanceOf(HTMLSelectElement);
  });

  it('honours an explicit searchable={false} on a long list', () => {
    render(<Select label="District" options={opts(50)} searchable={false} onChange={vi.fn()} />);
    expect(screen.getByLabelText('District')).toBeInstanceOf(HTMLSelectElement);
  });

  it('reports a pick as e.target.value, the same as the native select would', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select label="District" options={opts(50)} onChange={onChange} />);

    await selectOption(user, 'District', '42');

    expect(onChange.mock.calls[0][0].target.value).toBe('42');
  });

  it('filters the list down as you type, and picks from what is left', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Select label="District" options={opts(50)} onChange={onChange} />);

    await user.click(screen.getByLabelText('District'));
    await user.type(screen.getByRole('combobox'), 'Option 7');

    // "Option 7" itself, plus 17/27/37/47 which contain it mid-string.
    expect(screen.getAllByRole('option')).toHaveLength(1);
    await user.click(screen.getByRole('option'));
    expect(onChange.mock.calls[0][0].target.value).toBe('7');
  });

  it('shows the chosen option, not its value', async () => {
    const user = userEvent.setup();
    render(<Select label="District" options={opts(50)} value="12" onChange={vi.fn()} />);

    expect(screen.getByLabelText('District')).toHaveTextContent('Option 12');
    expect(selectedValue('District')).toBe('12');
    await user.click(screen.getByLabelText('District'));
    expect(screen.getByRole('option', { name: /Option 12/ })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('optionsFromChildren', () => {
  it('reads <option> JSX into a flat list, keeping optgroup labels as headings', () => {
    const { options, placeholder, clearable } = optionsFromChildren(
      <>
        <option value="">Select</option>
        <optgroup label="Undergraduate">
          <option value="136">B.Tech</option>
          <option value="137">B.Sc</option>
        </optgroup>
        <option value="2" disabled>
          12th
        </option>
      </>,
    );

    expect(placeholder).toBe('Select');
    expect(clearable).toBe(true);
    expect(options).toEqual([
      { value: '136', label: 'B.Tech', disabled: undefined, group: 'Undergraduate' },
      { value: '137', label: 'B.Sc', disabled: undefined, group: 'Undergraduate' },
      { value: '2', label: '12th', disabled: true, group: undefined },
    ]);
  });

  it('falls back to the label when an option carries no value', () => {
    const { options, clearable } = optionsFromChildren(<option>Anywhere</option>);
    expect(options).toEqual([{ value: 'Anywhere', label: 'Anywhere', disabled: undefined, group: undefined }]);
    expect(clearable).toBe(false);
  });
});
