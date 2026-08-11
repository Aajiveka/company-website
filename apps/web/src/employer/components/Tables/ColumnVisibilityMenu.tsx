import { useEffect, useRef, useState } from 'react';
import { Columns2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ColumnOption = {
  key: string;
  label: string;
  /** Actions / locked columns cannot be hidden. */
  locked?: boolean;
};

type Props = {
  columns: ColumnOption[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
  className?: string;
};

/** Compact two-column-lines icon — checklist to show/hide table headers. */
export function ColumnVisibilityMenu({ columns, visibleKeys, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const toggle = (key: string, locked?: boolean) => {
    if (locked) return;
    if (visibleKeys.includes(key)) {
      if (visibleKeys.filter((k) => !columns.find((c) => c.key === k)?.locked).length <= 1) return;
      onChange(visibleKeys.filter((k) => k !== key));
    } else {
      onChange([...visibleKeys, key]);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Show / hide columns"
        aria-label="Show or hide table columns"
        aria-expanded={open}
        className={cn(
          'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50',
          open && 'border-[#1A56DB] text-[#1A56DB]',
        )}
      >
        <Columns2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-52 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">Columns</p>
          <ul className="max-h-64 space-y-0.5 overflow-y-auto">
            {columns.map((col) => {
              const checked = visibleKeys.includes(col.key);
              return (
                <li key={col.key}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-xs text-slate-700 hover:bg-slate-50',
                      col.locked && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-300 text-[#1A56DB] focus:ring-[#1A56DB]"
                      checked={checked}
                      disabled={col.locked}
                      onChange={() => toggle(col.key, col.locked)}
                    />
                    <span>{col.label}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
