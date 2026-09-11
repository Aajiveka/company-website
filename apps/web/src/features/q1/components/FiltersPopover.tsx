import { useEffect, useRef, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { DEFAULT_FILTERS, EXPERIENCE_BANDS, PRIORITY_FILTERS, type QueueFilters } from '../q1.types';

const EXP_LABEL: Record<(typeof EXPERIENCE_BANDS)[number], string> = {
  all: 'All',
  fresher: 'Fresher',
  '1-3': '1–3 yrs',
  '4-7': '4–7 yrs',
  '8+': '8+ yrs',
};

/** The 288×278 Filters popover: priority chips, experience chips, and a CV-only switch. */
export function FiltersPopover({
  value,
  onChange,
}: {
  value: QueueFilters;
  onChange: (next: QueueFilters) => void;
}) {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const active =
    value.priority !== 'all' || value.experience !== 'all' || value.cvOnly ? true : false;

  const chip = (selected: boolean) =>
    cn(
      'rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40',
      selected
        ? 'bg-q1-blue text-white'
        : 'bg-q1-chip text-q1-ink-soft hover:bg-q1-blue-soft hover:text-q1-blue dark:bg-gray-700 dark:text-gray-200',
    );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg border px-3.5 text-xs font-semibold transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40',
          active
            ? 'border-q1-blue bg-q1-blue-soft text-q1-blue'
            : 'border-q1-line text-q1-ink-soft hover:bg-q1-chip dark:border-gray-600 dark:text-gray-200',
        )}
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        {t('q1.filters.title')}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={t('q1.filters.title')}
          className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-q1-line bg-q1-surface p-4 shadow-q1-pop dark:border-gray-700 dark:bg-gray-800"
        >
          <p className="font-display text-sm font-bold text-q1-ink dark:text-white">
            {t('q1.filters.title')}
          </p>

          <p className="mt-3 text-xs font-semibold text-q1-ink-soft dark:text-gray-300">
            {t('q1.filters.priority')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {PRIORITY_FILTERS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => onChange({ ...value, priority: p })}
                className={chip(value.priority === p)}
              >
                {p}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs font-semibold text-q1-ink-soft dark:text-gray-300">
            {t('q1.filters.experience')}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {EXPERIENCE_BANDS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => onChange({ ...value, experience: e })}
                className={chip(value.experience === e)}
              >
                {EXP_LABEL[e]}
              </button>
            ))}
          </div>

          <label className="mt-4 flex items-center justify-between gap-3 text-sm font-medium text-q1-ink dark:text-gray-100">
            {t('q1.filters.cvOnly')}
            <input
              type="checkbox"
              checked={value.cvOnly}
              onChange={(e) => onChange({ ...value, cvOnly: e.target.checked })}
              className="h-4 w-4 rounded border-q1-line text-q1-blue focus:ring-q1-blue/30"
            />
          </label>

          {active && (
            <button
              type="button"
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="mt-4 w-full rounded-lg border border-q1-line py-2 text-xs font-semibold text-q1-ink-soft hover:bg-q1-chip dark:border-gray-600 dark:text-gray-200"
            >
              {t('q1.filters.clear')}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
