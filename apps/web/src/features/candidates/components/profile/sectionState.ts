import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';

/**
 * State and formatting helpers shared by the profile sections.
 *
 * Kept out of section.tsx so that file exports only components — React Fast Refresh
 * requires that, the same constraint that splits button-variants.ts out of Button.tsx.
 */

/**
 * Local copy of a section's server state for a dialog to edit.
 *
 * Re-seeds whenever the dialog is opened or the server value changes, so cancelling an edit
 * and reopening does not resurrect the abandoned draft.
 */
export function useDraft<T>(initial: T, open: boolean) {
  const [draft, setDraft] = useState<T>(initial);
  useEffect(() => {
    if (open) setDraft(initial);
    // `initial` is rebuilt on every render by callers, so it cannot be a dependency without
    // resetting the draft on each keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const patch = (p: Partial<T>) => setDraft((prev) => ({ ...prev, ...p }));
  return [draft, patch, setDraft] as const;
}

/** Turns a mutation error into the API's own message where it sent one. */
export function useSaveHandlers(closeDialog?: () => void) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  return {
    onSuccess: () => {
      notify(t('profile.saved'), 'success');
      closeDialog?.();
    },
    onError: (e: unknown) =>
      notify(
        isAxiosError(e) ? (e.response?.data?.message ?? t('profile.saveError')) : t('profile.saveError'),
        'error',
      ),
  };
}

/** "Mar 2024", "2024" or "" — the profile never shows a day it did not collect. */
export function monthYear(month: number | null | undefined, year: number | null | undefined, locale: string) {
  if (!year) return '';
  if (!month) return String(year);
  const name = new Date(2000, month - 1, 1).toLocaleString(locale, { month: 'short' });
  return `${name} ${year}`;
}

/** Month options for the month/year pickers, named in the active language. */
export function monthOptions(locale: string) {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i, 1).toLocaleString(locale, { month: 'long' }),
  }));
}

/** Years from this year back, for "passed in" / "last used" pickers. */
export function yearOptions(span = 60) {
  const now = new Date().getFullYear();
  return Array.from({ length: span }, (_, i) => ({ value: now - i, label: String(now - i) }));
}
