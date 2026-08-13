import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * "← Back to Profile / <Module>" breadcrumb that heads every module screen
 * (Figma: 13px Inter, slate-500 crumb, slate-800 bold current page).
 */
export function ModuleHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-[13px]">
        <Link
          to="/candidate/profile"
          className="inline-flex items-center gap-1.5 text-slate-500 transition-colors hover:text-aj-blue dark:text-gray-400"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Back to Profile
        </Link>
        <span aria-hidden className="text-slate-300">
          /
        </span>
        <h1 className="font-display text-base font-bold text-slate-800 dark:text-gray-100">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export interface TabItem<T extends string> {
  key: T;
  label: string;
  count?: number;
}

/**
 * Pill tab strip (Interviews, Account Settings, the wizard's step chips).
 * Selection is owned by the caller so it can live in the URL where that matters.
 */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
  size = 'md',
}: {
  items: readonly TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="tablist" className={cn('flex flex-wrap items-center gap-2', className)}>
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors',
              size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-[13px]',
              active
                ? 'bg-aj-blue text-white shadow-aj-raised'
                : 'bg-aj-canvas text-slate-600 hover:bg-blue-50 hover:text-aj-blue dark:bg-gray-700 dark:text-gray-300',
            )}
          >
            {item.label}
            {item.count != null && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-[11px]',
                  active ? 'bg-white/20' : 'bg-white dark:bg-gray-800',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
