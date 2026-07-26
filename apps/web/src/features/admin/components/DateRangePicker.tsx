import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export interface DateRange {
  from: string;
  to: string;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function firstOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

function firstOfLastMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString().slice(0, 10);
}

function lastOfLastMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 0).toISOString().slice(0, 10);
}

function firstOfYear(): string {
  return new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
}

interface Preset {
  label: string;
  from: string;
  to: string;
}

/**
 * Two native date inputs with quick-select preset buttons.
 * Supports dark mode via Tailwind dark: classes.
 */
export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const { t } = useTranslation('dashboard');
  const [validationHint, setValidationHint] = useState('');

  // Auto-clear the validation hint after a brief display
  useEffect(() => {
    if (!validationHint) return;
    const timer = window.setTimeout(() => setValidationHint(''), 3000);
    return () => clearTimeout(timer);
  }, [validationHint]);

  const handleFromChange = useCallback(
    (from: string) => {
      if (value.to && from > value.to) {
        // Auto-correct: set "to" equal to the new "from"
        onChange({ from, to: from });
        setValidationHint('"From" was after "To" — adjusted "To" to match.');
      } else {
        onChange({ ...value, from });
      }
    },
    [value, onChange],
  );

  const handleToChange = useCallback(
    (to: string) => {
      if (value.from && to < value.from) {
        // Auto-correct: set "from" equal to the new "to"
        onChange({ from: to, to });
        setValidationHint('"To" was before "From" — adjusted "From" to match.');
      } else {
        onChange({ ...value, to });
      }
    },
    [value, onChange],
  );

  const presets: Preset[] = useMemo(
    () => [
      { label: t('dateRange.last7days'), from: daysAgoStr(7), to: todayStr() },
      { label: t('dateRange.last30days'), from: daysAgoStr(30), to: todayStr() },
      { label: t('dateRange.thisMonth'), from: firstOfMonth(), to: todayStr() },
      { label: t('dateRange.lastMonth'), from: firstOfLastMonth(), to: lastOfLastMonth() },
      { label: t('dateRange.thisYear'), from: firstOfYear(), to: todayStr() },
    ],
    [t],
  );

  const isPresetActive = useCallback(
    (p: Preset) => value.from === p.from && value.to === p.to,
    [value],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      {/* Date inputs */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('dateRange.from')}
          </label>
          <input
            type="date"
            value={value.from}
            onChange={(e) => handleFromChange(e.target.value)}
            max={value.to || undefined}
            aria-label="Start date"
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 sm:px-3 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('dateRange.to')}
          </label>
          <input
            type="date"
            value={value.to}
            min={value.from || undefined}
            onChange={(e) => handleToChange(e.target.value)}
            aria-label="End date"
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 sm:px-3 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange({ from: p.from, to: p.to })}
            aria-pressed={isPresetActive(p)}
            className={`rounded-md px-2 py-1.5 sm:px-2.5 text-xs font-medium transition ${
              isPresetActive(p)
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {validationHint && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{validationHint}</p>
      )}
    </div>
  );
}
