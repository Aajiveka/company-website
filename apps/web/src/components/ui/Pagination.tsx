import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface PaginationProps {
  page: number; // 1-based
  pageCount: number;
  onChange: (page: number) => void;
  className?: string;
  /** Compact slate + brand blue — used in employer portal tables. */
  variant?: 'default' | 'compact';
}

/** Compact numeric pagination with prev/next and a windowed page range. */
export function Pagination({ page, pageCount, onChange, className, variant = 'default' }: PaginationProps) {
  if (pageCount <= 1) return null;

  const window = 2;
  const pages: number[] = [];
  for (let p = Math.max(1, page - window); p <= Math.min(pageCount, page + window); p++) {
    pages.push(p);
  }

  const compact = variant === 'compact';

  const btn = compact
    ? 'flex h-8 min-w-8 items-center justify-center rounded-lg border px-1.5 text-xs font-medium text-slate-700 transition outline-none focus-visible:ring-2 focus-visible:ring-[#1A56DB]/30'
    : 'flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-sm transition sm:h-9 sm:min-w-9 dark:text-gray-200 focus-visible:ring-2 focus-visible:ring-primary/40';

  const idle = compact
    ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
    : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700';

  const active = compact
    ? 'border-[#1A56DB] bg-[#1A56DB] text-white hover:bg-[#1648b8] hover:border-[#1648b8]'
    : 'border-primary bg-primary text-white';

  const navIdle = compact
    ? 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40'
    : 'border-gray-200 disabled:opacity-40 dark:border-gray-600';

  return (
    <nav className={cn('flex items-center gap-1', className)} aria-label="Pagination">
      <button
        type="button"
        className={cn(btn, navIdle)}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
      {pages[0] > 1 && (
        <span className={cn('px-1', compact ? 'text-slate-400' : 'text-gray-400 dark:text-gray-500')} aria-label="More pages">
          …
        </span>
      )}
      {pages.map((p) => (
        <button
          type="button"
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page ? 'page' : undefined}
          className={cn(btn, p === page ? active : idle)}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < pageCount && (
        <span className={cn('px-1', compact ? 'text-slate-400' : 'text-gray-400 dark:text-gray-500')} aria-label="More pages">
          …
        </span>
      )}
      <button
        type="button"
        className={cn(btn, navIdle)}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      </button>
    </nav>
  );
}
