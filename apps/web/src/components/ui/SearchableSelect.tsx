import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Check, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useComboboxKeys } from './searchable/useComboboxKeys';
import { useOptionSearch, type SearchOption } from './searchable/useOptionSearch';

export type SearchableSelectOption = {
  id: string | number;
  label: string;
};

export type SearchableSelectProps = {
  options: SearchableSelectOption[];
  value: string | number | null | undefined;
  onChange: (id: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  clearable?: boolean;
  /** Show rose border when parent validation failed. */
  invalid?: boolean;
  className?: string;
  /** Applied to the closed trigger (matches employer `fieldClass` when passed). */
  triggerClassName?: string;
  emptyText?: string;
  'aria-label'?: string;
};

/**
 * Combobox-style select: type to filter options, keyboard-friendly.
 * Use anywhere a long master list needs search (Position, City, Industry, …).
 */
export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select…',
  searchPlaceholder = 'Search…',
  disabled = false,
  required = false,
  clearable = false,
  invalid = false,
  className,
  triggerClassName,
  emptyText = 'No matches',
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(
    () => options.find((o) => String(o.id) === String(value ?? '')),
    [options, value],
  );

  const searchOptions = useMemo<SearchOption[]>(
    () => options.map((o) => ({ value: String(o.id), label: o.label })),
    [options],
  );
  const { items: filtered, hiddenCount } = useOptionSearch(searchOptions, query);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const pick = useCallback(
    (id: string | number) => {
      onChange(String(id));
      setOpen(false);
      setQuery('');
    },
    [onChange],
  );

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  const { activeIndex, setActiveIndex, onKeyDown: onSearchKeyDown, optionId, activeId } =
    useComboboxKeys({
      count: filtered.length,
      listId,
      onPick: (i) => {
        const option = filtered[i];
        if (option) pick(option.value);
      },
      onClose: () => setOpen(false),
    });

  return (
    <div ref={rootRef} className={cn('relative w-full', className)}>
      {/* Hidden native input so HTML5 required works with form submit */}
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="pointer-events-none absolute h-0 w-0 opacity-0"
          value={value == null ? '' : String(value)}
          onChange={() => undefined}
          required
        />
      )}

      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel ?? placeholder}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'mt-0.5 flex h-8 w-full items-center gap-1.5 rounded-lg border bg-white px-2.5 text-left text-xs text-slate-800 outline-none transition',
          'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400',
          invalid
            ? 'border-rose-500 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
            : 'border-slate-500 focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20',
          open && !invalid && 'border-[#1A56DB] ring-2 ring-[#1A56DB]/20',
          open && invalid && 'ring-2 ring-rose-500/20',
          triggerClassName,
        )}
        aria-invalid={invalid || undefined}
      >
        <span className={cn('min-w-0 flex-1 truncate', !selected && 'text-slate-400')}>
          {selected?.label ?? placeholder}
        </span>
        {clearable && selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label="Clear"
            className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={clear}
            onKeyDown={() => undefined}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-slate-100 px-2 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <input
              ref={searchRef}
              type="text"
              role="combobox"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onSearchKeyDown}
              placeholder={searchPlaceholder}
              className="h-7 w-full bg-transparent text-xs text-slate-800 outline-none placeholder:text-slate-400"
              aria-controls={listId}
              aria-expanded
              aria-autocomplete="list"
              aria-activedescendant={activeId}
              autoComplete="off"
            />
          </div>

          <ul
            id={listId}
            ref={listRef}
            role="listbox"
            className="max-h-52 overflow-y-auto py-1"
          >
            {filtered.length === 0 && (
              <li className="px-2.5 py-2 text-xs text-slate-400">{emptyText}</li>
            )}
            {filtered.map((opt, i) => {
              const isSelected = opt.value === String(value ?? '');
              const isActive = i === activeIndex;
              return (
                <li
                  key={opt.value}
                  id={optionId(i)}
                  role="option"
                  aria-selected={isSelected}
                  data-value={opt.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs transition',
                    isActive && 'bg-slate-100',
                    isSelected && 'font-medium text-[#1A56DB]',
                    !isSelected && 'text-slate-700',
                  )}
                  onMouseEnter={() => setActiveIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(opt.value);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[#1A56DB]" aria-hidden />}
                </li>
              );
            })}
            {hiddenCount > 0 && (
              <li className="border-t border-slate-100 px-2.5 py-2 text-xs text-slate-400">
                +{hiddenCount}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
