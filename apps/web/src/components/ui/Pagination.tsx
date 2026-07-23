import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface PaginationProps {
  page: number; // 1-based
  pageCount: number;
  onChange: (page: number) => void;
}

/** Compact numeric pagination with prev/next and a windowed page range. */
export function Pagination({ page, pageCount, onChange }: PaginationProps) {
  if (pageCount <= 1) return null;

  const window = 2;
  const pages: number[] = [];
  for (let p = Math.max(1, page - window); p <= Math.min(pageCount, page + window); p++) {
    pages.push(p);
  }

  const btn = 'flex h-10 min-w-10 items-center justify-center rounded-lg border px-2 text-sm transition sm:h-9 sm:min-w-9 dark:text-gray-200';

  return (
    <nav className="flex items-center gap-1" aria-label="Pagination">
      <button
        className={cn(btn, 'border-gray-200 disabled:opacity-40 dark:border-gray-600')}
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages[0] > 1 && <span className="px-1 text-gray-400" aria-label="More pages">…</span>}
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          aria-current={p === page}
          className={cn(
            btn,
            p === page ? 'border-primary bg-primary text-white' : 'border-gray-200 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-700',
          )}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < pageCount && <span className="px-1 text-gray-400" aria-label="More pages">…</span>}
      <button
        className={cn(btn, 'border-gray-200 disabled:opacity-40 dark:border-gray-600')}
        onClick={() => onChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
