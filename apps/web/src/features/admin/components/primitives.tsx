import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { Button, Pagination } from '@/components/ui';

/* ─── Layout pieces ─────────────────────────────────────────────────── */

export function Panel({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        'min-w-0 rounded-xl border border-aj-line bg-white shadow-aj-card dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-2 border-b border-aj-line-soft px-4 py-3 sm:px-5 dark:border-gray-700">
          <div className="min-w-0">
            {title && <h2 className="font-display text-[15px] font-bold text-navy dark:text-white">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('p-4 sm:p-5', bodyClassName)}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  to,
  tone = 'blue',
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  tone?: 'blue' | 'green' | 'amber' | 'violet' | 'red';
}) {
  const tones = {
    blue: 'bg-blue-50 text-aj-blue dark:bg-blue-900/40 dark:text-blue-300',
    green: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    red: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const body = (
    <div className="flex items-start gap-3">
      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', tones[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-display text-2xl font-extrabold tabular-nums text-navy dark:text-white">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
      </div>
    </div>
  );
  const cls =
    'block rounded-xl border border-aj-line bg-white p-4 shadow-aj-card dark:border-gray-700 dark:bg-gray-800';
  return to ? (
    <Link
      to={to}
      className={cn(cls, 'transition hover:border-aj-ring hover:shadow-aj-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aj-blue/40')}
    >
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Label/value rows for a detail page. */
export function Facts({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">{k}</dt>
          <dd className="mt-0.5 break-words text-navy dark:text-gray-100">{v === '' || v == null ? '—' : v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ─── Status pills ──────────────────────────────────────────────────── */

const PILL = {
  gray: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  green: 'bg-green-50 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  amber: 'bg-amber-50 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  red: 'bg-red-50 text-red-700 dark:bg-red-900/40 dark:text-red-200',
  violet: 'bg-violet-50 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
} as const;
export type PillTone = keyof typeof PILL;

export function Pill({ tone = 'gray', children }: { tone?: PillTone; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold', PILL[tone])}>
      {children}
    </span>
  );
}

export function ActivePill({ active }: { active: boolean }) {
  return <Pill tone={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Pill>;
}

/* ─── Tables: a real table from md up, stacked cards below ──────────── */

export interface ColumnDef<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Hidden from the phone card — for columns the card's title already carries. */
  hideOnCard?: boolean;
  /** Takes the card's full width — for long values (a next-step link) that would otherwise
   *  wrap into the neighbouring pair. */
  wideOnCard?: boolean;
}

/**
 * Tables do not survive a 320px screen: the shared Table sets min-w-[640px] and scrolls
 * sideways. Below md each row becomes a card — the first column as its heading, the rest as
 * label/value pairs — so nothing scrolls horizontally and every cell stays a touch target.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading,
  empty,
  selection,
}: {
  columns: ColumnDef<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  empty: React.ReactNode;
  selection?: {
    selected: Set<number>;
    toggle: (id: number) => void;
    toggleAll: (ids: number[]) => void;
    idOf: (row: T) => number;
    selectable?: (row: T) => boolean;
  };
}) {
  if (isLoading) {
    return (
      <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
        ))}
      </div>
    );
  }
  if (!rows.length) return <div className="px-4 py-10 text-center">{empty}</div>;

  const selectableIds = selection ? rows.filter((r) => selection.selectable?.(r) ?? true).map(selection.idOf) : [];
  const allSelected = selection && selectableIds.length > 0 && selectableIds.every((id) => selection.selected.has(id));
  const [head, ...rest] = columns;

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-aj-line bg-aj-surface-soft text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:bg-gray-700/40 dark:text-gray-400">
            <tr>
              {selection && (
                <th scope="col" className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-gray-300"
                    aria-label="Select all on this page"
                    checked={!!allSelected}
                    disabled={!selectableIds.length}
                    onChange={() => selection.toggleAll(selectableIds)}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th key={c.key} scope="col" className={cn('px-4 py-3 font-semibold', c.className)}>
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const id = selection?.idOf(row);
              const can = selection ? (selection.selectable?.(row) ?? true) : false;
              return (
                <tr key={rowKey(row)} className="border-b border-aj-line-soft last:border-0 hover:bg-aj-surface-soft/60 dark:border-gray-700 dark:hover:bg-gray-700/40">
                  {selection && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="Select row"
                        disabled={!can}
                        checked={id != null && selection.selected.has(id)}
                        onChange={() => id != null && selection.toggle(id)}
                      />
                    </td>
                  )}
                  {columns.map((c) => (
                    <td key={c.key} className={cn('px-4 py-3 align-middle text-gray-700 dark:text-gray-200', c.className)}>
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-aj-line-soft md:hidden dark:divide-gray-700">
        {rows.map((row) => {
          const id = selection?.idOf(row);
          const can = selection ? (selection.selectable?.(row) ?? true) : false;
          return (
            <li key={rowKey(row)} className="flex gap-3 px-4 py-3">
              {selection && (
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300"
                  aria-label="Select row"
                  disabled={!can}
                  checked={id != null && selection.selected.has(id)}
                  onChange={() => id != null && selection.toggle(id)}
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-navy dark:text-white">{head!.cell(row)}</div>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  {rest
                    .filter((c) => !c.hideOnCard)
                    .map((c) => (
                      <div key={c.key} className={cn('min-w-0', c.wideOnCard && 'col-span-2')}>
                        <dt className="text-gray-500 dark:text-gray-400">{c.header}</dt>
                        <dd className="mt-0.5 break-words text-gray-800 dark:text-gray-100">{c.cell(row)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function TableFooter({
  page,
  pageCount,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-aj-line-soft px-4 py-3 text-xs text-gray-500 sm:flex-row dark:border-gray-700 dark:text-gray-400">
      <span>
        Showing <strong className="text-navy dark:text-gray-200">{from}–{to}</strong> of{' '}
        <strong className="text-navy dark:text-gray-200">{total.toLocaleString('en-IN')}</strong>
      </span>
      {pageCount > 1 && <Pagination page={page} pageCount={pageCount} onChange={onPage} variant="compact" />}
    </div>
  );
}

/* ─── Filters ───────────────────────────────────────────────────────── */

/** Search box that reports its value 300ms after typing stops. */
export function SearchInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onChange(draft.trim()), 300);
    return () => clearTimeout(t);
  }, [draft, value, onChange]);
  return (
    <label className="relative block w-full sm:max-w-xs">
      <span className="sr-only">{label}</span>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
      <input
        type="search"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-aj-line bg-white pl-9 pr-3 text-sm text-navy outline-none transition placeholder:text-gray-400 focus:border-aj-blue focus:ring-2 focus:ring-aj-blue/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      />
    </label>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block w-full sm:w-auto">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="h-10 w-full rounded-lg border border-aj-line bg-white px-3 text-sm text-navy outline-none focus:border-aj-blue focus:ring-2 focus:ring-aj-blue/20 sm:w-auto dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Segmented status tabs with counts; scrolls inside itself on a phone, never the page. */
export function StatusTabs<V extends string>({
  value,
  onChange,
  tabs,
  label,
}: {
  value: V;
  onChange: (v: V) => void;
  tabs: { value: V; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aj-blue/40',
            value === t.value
              ? 'bg-aj-blue text-white'
              : 'bg-white text-gray-600 ring-1 ring-aj-line hover:bg-aj-surface-soft dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-600',
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={cn('rounded-full px-1.5 text-[11px] font-bold tabular-nums', value === t.value ? 'bg-white/25' : 'bg-gray-100 dark:bg-gray-700')}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ─── States ────────────────────────────────────────────────────────── */

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 px-4 py-10 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" aria-hidden />
      <p className="text-sm text-gray-700 dark:text-gray-200">{getErrorMessage(error, 'Could not load this page.')}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{title}</p>
      {hint && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>}
    </div>
  );
}
