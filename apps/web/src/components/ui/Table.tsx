import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  /** Cell renderer; defaults to `row[key]`. */
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyMessage?: string;
}

/** Generic, typed data table with a loading skeleton and empty state. */
export function Table<T>({
  columns,
  data,
  rowKey,
  isLoading,
  emptyMessage = 'No records found.',
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-gray-200 bg-brand-soft text-navy">
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cn('px-4 py-3 font-semibold', c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {columns.map((c) => (
                  <td key={c.key} className="px-4 py-3">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={rowKey(row)} className="border-b border-gray-100 transition hover:bg-gray-50">
                {columns.map((c) => (
                  <td key={c.key} className={cn('px-4 py-3', c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
