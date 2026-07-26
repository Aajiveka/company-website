import { useCallback, useMemo } from 'react';

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
  const presets: Preset[] = useMemo(
    () => [
      { label: 'Last 7 days', from: daysAgoStr(7), to: todayStr() },
      { label: 'Last 30 days', from: daysAgoStr(30), to: todayStr() },
      { label: 'This month', from: firstOfMonth(), to: todayStr() },
      { label: 'Last month', from: firstOfLastMonth(), to: lastOfLastMonth() },
      { label: 'This year', from: firstOfYear(), to: todayStr() },
    ],
    [],
  );

  const isPresetActive = useCallback(
    (p: Preset) => value.from === p.from && value.to === p.to,
    [value],
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      {/* Date inputs */}
      <div className="flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            From
          </label>
          <input
            type="date"
            value={value.from}
            onChange={(e) => onChange({ ...value, from: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            To
          </label>
          <input
            type="date"
            value={value.to}
            onChange={(e) => onChange({ ...value, to: e.target.value })}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
              isPresetActive(p)
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
