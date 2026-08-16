import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render: (row: T, index: number) => ReactNode;
}

export function DataTable<T>({
  columns,
  rows,
  empty,
  getRowId,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: ReactNode;
  /** Defaults to `id` or `jobId` when present. */
  getRowId?: (row: T) => string | number;
}) {
  if (!rows.length) {
    return <>{empty}</>;
  }

  const resolveId = (row: T, index: number) => {
    if (getRowId) return getRowId(row);
    const r = row as { id?: string | number; jobId?: string | number };
    return r.id ?? r.jobId ?? index;
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200/80 bg-white shadow-sm">
      <table className="min-w-full text-left text-xs">
        <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={cn('h-9 whitespace-nowrap px-3 py-0', col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={resolveId(row, index)} className="h-11 transition hover:bg-slate-50/80">
              {columns.map((col) => (
                <td key={col.key} className={cn('px-3 py-0 align-middle text-slate-700', col.className)}>
                  {col.render(row, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
