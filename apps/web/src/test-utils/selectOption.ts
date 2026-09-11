import { screen, waitFor } from '@testing-library/react';
import type userEvent from '@testing-library/user-event';

type User = ReturnType<typeof userEvent.setup>;
type Label = RegExp | string;

/**
 * Drive a dropdown without caring which shape it rendered.
 *
 * `Select` swaps a native `<select>` for a searchable combobox once its option list passes
 * SEARCHABLE_THRESHOLD, so whether a given field is one or the other depends on how big its
 * master list happens to be. Tests go through here rather than calling `user.selectOptions`
 * directly, so a list crossing the threshold stays a fixture detail instead of a broken test.
 */

function field(label: Label): HTMLElement {
  return screen.getByLabelText(label);
}

/** Pick the option whose *value* is `value`. */
export async function selectOption(user: User, label: Label, value: string): Promise<void> {
  const el = field(label);

  if (el instanceof HTMLSelectElement) {
    await user.selectOptions(el, value);
    return;
  }

  await user.click(el);
  // The panel is portaled to document.body, so query the document rather than the trigger.
  const option = await waitFor(() => {
    const found = document.querySelector<HTMLElement>(`[role="option"][data-value="${value}"]`);
    if (!found) throw new Error(`No option with value "${value}" in the "${String(label)}" dropdown`);
    return found;
  });
  await user.click(option);
}

/** Every value the field currently offers, blank placeholder excluded. */
export async function optionValues(user: User, label: Label): Promise<string[]> {
  const el = field(label);

  if (el instanceof HTMLSelectElement) {
    return Array.from(el.options)
      .map((o) => o.value)
      .filter(Boolean);
  }

  await user.click(el);
  const listbox = await screen.findByRole('listbox');
  const values = Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]')).map(
    (o) => o.dataset.value ?? '',
  );
  await user.keyboard('{Escape}');
  return values.filter(Boolean);
}

/** The field's current value — `''` when nothing is chosen. */
export function selectedValue(label: Label): string {
  const el = field(label);
  if (el instanceof HTMLSelectElement) return el.value;
  return el.dataset.value ?? '';
}
