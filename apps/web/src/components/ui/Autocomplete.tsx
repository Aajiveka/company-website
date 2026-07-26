import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface AutocompleteProps {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}

/**
 * Typeahead input with filtered dropdown suggestions.
 * Supports keyboard navigation (Arrow keys, Enter, Escape).
 */
export function Autocomplete({
  options,
  value,
  onChange,
  placeholder = 'Search…',
  icon,
  'aria-label': ariaLabel,
  className,
}: AutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync external value changes (e.g. URL nav)
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, 20);
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q)).slice(0, 20);
  }, [query, options]);

  // Click-outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const select = useCallback(
    (val: string) => {
      setQuery(val);
      onChange(val);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onChange],
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setQuery(v);
    setIsOpen(true);
    setActiveIndex(-1);
    // If cleared, also clear the selected value
    if (!v) onChange('');
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i < filtered.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : filtered.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          select(filtered[activeIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  // Highlight matching substring
  const highlight = (text: string) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/15 text-inherit">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className ?? ''}`}>
      <div className="flex items-center gap-2">
        {icon}
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `ac-option-${activeIndex}` : undefined}
          className="h-11 w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
          placeholder={placeholder}
          value={query}
          onChange={onInputChange}
          onFocus={() => setIsOpen(true)}
          onKeyDown={onKeyDown}
        />
      </div>

      {isOpen && filtered.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:max-h-64 dark:border-gray-600 dark:bg-gray-800"
        >
          {filtered.map((option, i) => (
            <li
              key={option}
              id={`ac-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              className={`cursor-pointer px-3 py-2.5 text-sm transition ${
                i === activeIndex
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : option === value
                    ? 'bg-primary/5 font-medium text-primary'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // prevent input blur
                select(option);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {highlight(option)}
            </li>
          ))}
        </ul>
      )}

      {isOpen && query.trim() && filtered.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-400 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500">
          No matches
        </div>
      )}
    </div>
  );
}
