import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COUNTRIES, DEFAULT_COUNTRY_ISO2, flagEmoji, type Country } from '@/lib/countryCodes';

export interface PhoneInputProps {
  label?: string;
  /** ISO 3166-1 alpha-2 of the selected country. */
  country: string;
  onCountryChange: (iso2: string) => void;
  /** National number — digits only, no country code. */
  value: string;
  onChange: (nationalNumber: string) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
  /** Search box placeholder inside the country list. */
  searchPlaceholder?: string;
  noMatchesText?: string;
}

/**
 * Mobile number field with a country-code picker.
 *
 * The country is tracked by ISO code, not by dial code: +1 alone cannot tell the United States
 * from Canada or Jamaica, so selecting by dial would make the flag and the highlighted row jump
 * to whichever country happened to come first. Only the dial code is submitted.
 *
 * The list is ~250 entries, so it is searchable by country name and by code. Non-digits are
 * stripped from the number as it is typed — people paste numbers with spaces, dashes and
 * brackets, and none of that survives to the API anyway.
 */
export function PhoneInput({
  label,
  country,
  onCountryChange,
  value,
  onChange,
  error,
  placeholder,
  required,
  autoComplete = 'tel-national',
  searchPlaceholder = 'Search country or code',
  noMatchesText = 'No matches',
}: PhoneInputProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected: Country =
    COUNTRIES.find((c) => c.iso2 === country) ??
    COUNTRIES.find((c) => c.iso2 === DEFAULT_COUNTRY_ISO2)!;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    // A leading '+' is how people type a dial code; matching on the bare digits too means
    // "971" and "+971" both find the UAE.
    const digits = q.replace(/^\+/, '');
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.iso2.toLowerCase() === q ||
        c.dial.includes(digits),
    );
  }, [query]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Opening lands the caret in the search box — with this many countries, typing is the only
  // practical way to get to one.
  useEffect(() => {
    if (isOpen) searchRef.current?.focus();
    else setQuery('');
  }, [isOpen]);

  const select = (iso2: string) => {
    onCountryChange(iso2);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </label>
      )}
      <div ref={containerRef} className="relative">
        <div
          className={cn(
            'flex h-11 w-full items-center rounded-lg border bg-white transition dark:bg-gray-800',
            'focus-within:ring-2 focus-within:ring-primary/30',
            error ? 'border-danger' : 'border-gray-300 focus-within:border-primary dark:border-gray-600',
          )}
        >
          <button
            ref={triggerRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            aria-label={`Country code: ${selected.name} ${selected.dial}`}
            className="flex h-full shrink-0 items-center gap-1.5 rounded-l-lg pl-3 pr-2 text-sm text-gray-700 outline-none hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
            onClick={() => setIsOpen((o) => !o)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
              } else if (e.key === 'Escape') {
                setIsOpen(false);
              }
            }}
          >
            <span aria-hidden className="text-base leading-none">{flagEmoji(selected.iso2)}</span>
            <span className="tabular-nums">{selected.dial}</span>
            <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', isOpen && 'rotate-180')} aria-hidden />
          </button>

          <span className="h-6 w-px shrink-0 bg-gray-200 dark:bg-gray-600" aria-hidden />

          <input
            id={inputId}
            type="tel"
            inputMode="numeric"
            autoComplete={autoComplete}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error ? errorId : undefined}
            className="h-full w-full min-w-0 rounded-r-lg bg-transparent px-3 text-sm outline-none dark:text-gray-100"
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
          />
        </div>

        {isOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[16rem] rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800">
            <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 dark:border-gray-700">
              <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
              <input
                ref={searchRef}
                type="text"
                className="w-full bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-gray-100"
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setIsOpen(false);
                    triggerRef.current?.focus();
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (filtered.length > 0) select(filtered[0].iso2);
                  }
                }}
              />
            </div>
            <ul role="listbox" aria-label={label} className="max-h-60 overflow-y-auto py-1">
              {filtered.map((c) => (
                <li key={c.iso2}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={c.iso2 === selected.iso2}
                    className={cn(
                      'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-primary/5 hover:text-primary',
                      c.iso2 === selected.iso2
                        ? 'bg-primary/10 font-medium text-primary'
                        : 'text-gray-700 dark:text-gray-200',
                    )}
                    onClick={() => select(c.iso2)}
                  >
                    <span aria-hidden className="text-base leading-none">{flagEmoji(c.iso2)}</span>
                    <span className="flex-1 truncate">{c.name}</span>
                    <span className="shrink-0 tabular-nums text-gray-400">{c.dial}</span>
                  </button>
                </li>
              ))}
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">{noMatchesText}</li>
              )}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
