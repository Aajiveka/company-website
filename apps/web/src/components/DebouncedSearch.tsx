import { Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { cn } from '@/lib/cn';

export type DebouncedSearchProps = {
  value?: string;
  defaultValue?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
  inputClassName?: string;
  /** Fires immediately on clear (also calls onChange('')). */
  clearable?: boolean;
};

/**
 * Reusable search input that only emits `onChange` after the value settles (debounce).
 * Local typing stays instant; parents should use the emitted value for API queries.
 */
export function DebouncedSearch({
  value,
  defaultValue = '',
  onChange,
  placeholder = 'Search…',
  delay = 350,
  className,
  inputClassName,
  clearable = true,
}: DebouncedSearchProps) {
  const isControlled = value !== undefined;
  const [inner, setInner] = useState(value ?? defaultValue);
  const debounced = useDebounce(inner, delay);

  useEffect(() => {
    if (isControlled && value !== inner) setInner(value);
    // Only sync when parent value changes externally.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className={cn('relative min-w-[12rem] flex-1', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        value={inner}
        onChange={(e) => setInner(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-8 w-full rounded-lg border border-slate-200 py-0 pl-8 pr-8 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20',
          inputClassName,
        )}
        aria-label={placeholder}
      />
      {clearable && inner && (
        <button
          type="button"
          onClick={() => {
            setInner('');
            onChange('');
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
