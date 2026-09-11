import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LocationSelect } from '../LocationSelect';
import { LocationMultiSelect } from '../LocationMultiSelect';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, o?: Record<string, unknown>) => (o ? `${k}:${JSON.stringify(o)}` : k) }),
}));

/**
 * The state → city pickers.
 *
 * These render 764 districts under 36 states, so browsing means expanding one state at a time.
 * The search box is the whole point of these tests: typing has to flatten the tree to
 * "City, State" matches, and clearing has to put the tree back — including, for the
 * multi-select, without losing what was already ticked.
 */

const STATES = [
  { id: 5, label: 'Bihar' },
  { id: 21, label: 'Maharashtra' },
  { id: 29, label: 'Kerala' },
];

const CITIES = [
  { id: 101, label: 'Patna', stateId: 5 },
  { id: 102, label: 'Gaya', stateId: 5 },
  { id: 201, label: 'Pune', stateId: 21 },
  { id: 202, label: 'Mumbai', stateId: 21 },
  { id: 203, label: 'Nagpur', stateId: 21 },
  { id: 301, label: 'Punalur', stateId: 29 },
  { id: 302, label: 'Kochi', stateId: 29 },
  { id: 303, label: 'Kollam', stateId: 29 },
  { id: 304, label: 'Thrissur', stateId: 29 },
  { id: 305, label: 'Kannur', stateId: 29 },
  { id: 306, label: 'Alappuzha', stateId: 29 },
];

const listbox = () => screen.getByRole('listbox');
const optionNames = () =>
  within(listbox())
    .getAllByRole('option')
    .map((o) => o.textContent);

describe('LocationSelect', () => {
  it('filters to flat "city, state" matches as you type', async () => {
    const user = userEvent.setup();
    render(<LocationSelect states={STATES} cities={CITIES} value={null} onChange={vi.fn()} label="Current Location" />);

    await user.click(screen.getByRole('button', { name: 'Current Location' }));
    await user.type(screen.getByRole('combobox'), 'pun');

    // Both matches surface without either state having been expanded, each tagged by state.
    expect(optionNames()).toEqual(['PuneMaharashtra', 'PunalurKerala']);
  });

  it('ranks a word-start match above one buried mid-word', async () => {
    const user = userEvent.setup();
    render(<LocationSelect states={STATES} cities={CITIES} value={null} onChange={vi.fn()} label="Current Location" />);

    await user.click(screen.getByRole('button', { name: 'Current Location' }));
    await user.type(screen.getByRole('combobox'), 'nag');

    // "Nagpur" starts with the query; nothing else should outrank it.
    expect(optionNames()[0]).toBe('NagpurMaharashtra');
  });

  it('restores the state tree when the search box is cleared', async () => {
    const user = userEvent.setup();
    render(<LocationSelect states={STATES} cities={CITIES} value={null} onChange={vi.fn()} label="Current Location" />);

    await user.click(screen.getByRole('button', { name: 'Current Location' }));
    const search = screen.getByRole('combobox');
    await user.type(search, 'pun');
    await user.clear(search);

    // Back to collapsed states: group headers are present, individual cities are not.
    expect(within(listbox()).getByRole('group', { name: 'Bihar' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /Patna/ })).not.toBeInTheDocument();
  });

  // The dropdown speaks labels but the form stores ids, and two states can share a city name.
  it('reports the id of the matched city, not just its name', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LocationSelect states={STATES} cities={CITIES} value={null} onChange={onChange} label="Current Location" />);

    await user.click(screen.getByRole('button', { name: 'Current Location' }));
    await user.type(screen.getByRole('combobox'), 'punalur');
    await user.click(screen.getByRole('option', { name: /Punalur/ }));

    expect(onChange).toHaveBeenCalledWith(301);
  });
});

describe('LocationMultiSelect', () => {
  it('keeps earlier selections while searching for the next one', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationMultiSelect
        states={STATES}
        cities={CITIES}
        value={[101]}
        onChange={onChange}
        label="Preferred Cities"
      />,
    );

    // The chip for the already-chosen city is there before the panel is even opened.
    expect(screen.getByText('Patna')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Preferred Cities' }));
    await user.type(screen.getByRole('combobox'), 'pune');
    await user.click(screen.getByRole('option', { name: /Pune/ }));

    // Appended, not replaced — the panel stays open so several cities can be picked in a row.
    expect(onChange).toHaveBeenCalledWith([101, 201]);
  });

  it('ticks a searched city as selected so a second click removes it', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <LocationMultiSelect
        states={STATES}
        cities={CITIES}
        value={[201]}
        onChange={onChange}
        label="Preferred Cities"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Preferred Cities' }));
    await user.type(screen.getByRole('combobox'), 'pune');

    const option = screen.getByRole('option', { name: /Pune/ });
    expect(option).toHaveAttribute('aria-selected', 'true');

    await user.click(option);
    expect(onChange).toHaveBeenCalledWith([]);
  });
});
