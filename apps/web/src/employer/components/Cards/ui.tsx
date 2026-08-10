import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { brand } from '@/employer/constants/brand';

/** Compact page title row — actions stay visible above the fold. */
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
    </div>
  );
}

/** Dense KPI tile for metric rows. */
export function StatCard({
  label,
  value,
  delta,
  icon,
}: {
  label: string;
  value: string | number;
  delta?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', brand.bgSoft, brand.text)}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-slate-500">{label}</p>
          <div className="flex items-baseline gap-1.5">
            <p className="text-lg font-semibold tabular-nums text-slate-900">{value}</p>
            {delta && <span className={cn('text-[11px] font-medium', brand.text)}>{delta}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
      <p className="text-sm font-semibold text-slate-800">{title}</p>
      {description && <p className="mt-0.5 max-w-sm text-xs text-slate-500">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function EmployerBadge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
}) {
  const tones = {
    neutral: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-50 text-emerald-700',
    warning: 'bg-amber-50 text-amber-700',
    danger: 'bg-rose-50 text-rose-700',
    primary: `${brand.bgSoft} ${brand.text}`,
  };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className,
  type = 'button',
  onClick,
  disabled,
}: {
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium text-white shadow-sm transition',
        brand.bg,
        brand.bgHover,
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className,
  type = 'button',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  type?: 'button' | 'submit';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={cn(
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function SimpleBarChart({
  title,
  values,
  labels,
}: {
  title: string;
  values: number[];
  labels?: string[];
}) {
  const max = Math.max(...values, 1);
  const months = labels ?? ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-xs font-semibold text-slate-800">{title}</h3>
      <div className="flex h-28 items-end gap-1">
        {values.map((v, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5">
            <div
              className={cn('w-full rounded-t transition-all', brand.bg)}
              style={{ height: `${(v / max) * 100}%`, minHeight: 3, opacity: 0.75 + (i % 3) * 0.08 }}
              title={String(v)}
            />
            <span className="text-[9px] text-slate-400">{months[i] ?? i + 1}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Shared compact form-field look for employer pages. */
export const fieldClass =
  'h-8 w-full rounded-md border border-slate-200 bg-white px-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-[#1A56DB] focus:ring-1 focus:ring-[#1A56DB]/25';

export const labelClass = 'mb-1 block text-[11px] font-medium text-slate-600';

export const sectionClass = 'rounded-lg border border-slate-200/80 bg-white p-3 shadow-sm';
