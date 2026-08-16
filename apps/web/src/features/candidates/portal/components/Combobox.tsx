import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/cn';
import { Input } from './primitives';

export interface ComboboxOption {
  id: number;
  label: string;
  /** Secondary line — the institution's city, so two similarly named colleges are tellable apart. */
  hint?: string | null;
}

/**
 * Free-text input with suggestions.
 *
 * Deliberately NOT a picker: the value is whatever is typed, and choosing a suggestion only
 * fills the box. The institution master cannot ever be complete — India has tens of thousands
 * of colleges — so a control that refused unknown values would block real candidates from
 * naming the real place they studied, which is worse than the odd spelling variant.
 *
 * The control itself is the portal's `Input`, unchanged, so the field is pixel-identical to
 * every other text field on the step; only the dropdown is added. `components/ui/Autocomplete`
 * was not reused because it is skinned for the teal public site and renders its own bare
 * `<input>`, which would not match the wizard's field height, radius or border.
 */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  invalid,
  loading,
  emptyHint,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: ComboboxOption[];
  placeholder?: string;
  invalid?: boolean;
  loading?: boolean;
  /** Shown when nothing matched, to make clear that typing a new name is fine. */
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  // An exact hit means the candidate has already picked this one; re-offering it is noise.
  const suggestions = useMemo(
    () => options.filter((o) => o.label.toLowerCase() !== value.trim().toLowerCase()),
    [options, value],
  );

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    if (active < 0) return;
    const item = listRef.current?.children[active] as HTMLElement | undefined;
    // Optional call: keeping the highlighted row in view is a nicety, and jsdom has no
    // scrollIntoView at all — throwing here would break the arrow-key path outright.
    item?.scrollIntoView?.({ block: 'nearest' });
  }, [active]);

  const pick = (option: ComboboxOption) => {
    onChange(option.label);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' && !open) {
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter') {
      // Only swallow Enter when a suggestion is highlighted — otherwise it must still submit
      // the step, which is what every other field on the form does.
      if (active >= 0 && suggestions[active]) {
        e.preventDefault();
        pick(suggestions[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActive(-1);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={placeholder}
        invalid={invalid}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />

      {open && (suggestions.length > 0 || (!loading && value.trim() && emptyHint)) && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 top-full z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-aj-line bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
        >
          {suggestions.map((o, i) => (
            <li
              key={o.id}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: click fires after blur, which closes the list first.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={cn(
                'cursor-pointer px-3.5 py-2 text-sm text-slate-700 dark:text-gray-200',
                i === active && 'bg-blue-50 text-aj-blue dark:bg-blue-950',
              )}
            >
              <span className="block truncate">{o.label}</span>
              {o.hint && <span className="block truncate text-xs text-slate-400">{o.hint}</span>}
            </li>
          ))}
          {suggestions.length === 0 && emptyHint && (
            <li className="px-3.5 py-2 text-xs text-slate-400">{emptyHint}</li>
          )}
        </ul>
      )}
    </div>
  );
}
