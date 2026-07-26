import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectProps {
  options: MultiSelectOption[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  className?: string;
  maxDisplay?: number;
}

/**
 * Multi-select dropdown with checkboxes and removable chips.
 * Includes search/filter within the dropdown. Supports dark mode.
 */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  label,
  error,
  className = '',
  maxDisplay = 5,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Focus search input when opening
  useEffect(() => {
    if (isOpen) searchInputRef.current?.focus();
  }, [isOpen]);

  const filtered = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [search, options]);

  const toggle = useCallback(
    (optionValue: string) => {
      if (value.includes(optionValue)) {
        onChange(value.filter((v) => v !== optionValue));
      } else {
        onChange([...value, optionValue]);
      }
    },
    [value, onChange],
  );

  const remove = useCallback(
    (optionValue: string) => {
      onChange(value.filter((v) => v !== optionValue));
    },
    [value, onChange],
  );

  const selectedLabels = useMemo(() => {
    const labelMap = new Map(options.map((o) => [o.value, o.label]));
    return value.map((v) => ({ value: v, label: labelMap.get(v) ?? v }));
  }, [value, options]);

  const displayedChips = selectedLabels.slice(0, maxDisplay);
  const overflowCount = selectedLabels.length - maxDisplay;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex min-h-[2.5rem] w-full items-center gap-1.5 rounded-lg border px-3 py-1.5 text-left text-sm transition ${
          error
            ? 'border-red-400 focus:ring-red-200'
            : 'border-gray-200 focus:ring-primary/20 dark:border-gray-600'
        } bg-white focus:outline-none focus:ring-2 dark:bg-gray-800`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex flex-1 flex-wrap items-center gap-1">
          {value.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500">{placeholder}</span>
          ) : (
            <>
              {displayedChips.map((item) => (
                <span
                  key={item.value}
                  className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20"
                >
                  {item.label}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(item.value);
                    }}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    aria-label={`Remove ${item.label}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {overflowCount > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{overflowCount} more
                </span>
              )}
            </>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
          {/* Search */}
          <div className="border-b border-gray-100 p-2 dark:border-gray-700">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 dark:border-gray-600">
              <Search className="h-3.5 w-3.5 text-gray-400" aria-hidden />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="h-8 w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
              />
            </div>
          </div>

          {/* Options */}
          <ul role="listbox" className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-center text-sm text-gray-400 dark:text-gray-500">
                No options found
              </li>
            ) : (
              filtered.map((option) => {
                const checked = value.includes(option.value);
                return (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={checked}
                    className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      toggle(option.value);
                    }}
                  >
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
                        checked
                          ? 'border-primary bg-primary text-white'
                          : 'border-gray-300 dark:border-gray-500'
                      }`}
                    >
                      {checked && (
                        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={`${checked ? 'font-medium text-primary' : 'text-gray-700 dark:text-gray-200'}`}>
                      {option.label}
                    </span>
                  </li>
                );
              })
            )}
          </ul>

          {/* Footer with count */}
          {value.length > 0 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-3 py-2 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">{value.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-primary hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
