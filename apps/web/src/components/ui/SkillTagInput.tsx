import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type SkillTagOption = {
  id?: number;
  label: string;
};

export type SkillTagInputProps = {
  options: { id: number; label: string }[];
  value: SkillTagOption[];
  onChange: (next: SkillTagOption[]) => void;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  /** Suggestions shown on focus when the query is empty. */
  suggestCount?: number;
  'aria-label'?: string;
};

function norm(s: string) {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Skills combobox: focus suggests masters, typing filters, Enter/click adds.
 * Labels not in the master list can still be added (custom skills).
 */
export function SkillTagInput({
  options,
  value,
  onChange,
  disabled = false,
  invalid = false,
  placeholder = 'Search or add a skill…',
  className,
  inputClassName,
  suggestCount = 5,
  'aria-label': ariaLabel = 'Skills',
}: SkillTagInputProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const selectedKeys = useMemo(() => new Set(value.map((v) => norm(v.label))), [value]);

  const suggestions = useMemo(() => {
    const q = norm(query);
    const available = options.filter((o) => !selectedKeys.has(norm(o.label)));
    if (!q) return available.slice(0, suggestCount);
    return available.filter((o) => norm(o.label).includes(q)).slice(0, 8);
  }, [options, query, selectedKeys, suggestCount]);

  const exactInMasters = useMemo(() => {
    const q = norm(query);
    if (!q) return null;
    return options.find((o) => norm(o.label) === q) ?? null;
  }, [options, query]);

  const canAddCustom = Boolean(norm(query)) && !selectedKeys.has(norm(query)) && !exactInMasters;

  const menuItems = useMemo(() => {
    const items: { key: string; label: string; skill: SkillTagOption }[] = suggestions.map((o) => ({
      key: `id-${o.id}`,
      label: o.label,
      skill: { id: o.id, label: o.label },
    }));
    if (canAddCustom) {
      items.push({
        key: `custom-${norm(query)}`,
        label: `Add “${query.trim()}”`,
        skill: { label: query.trim().slice(0, 100) },
      });
    }
    return items;
  }, [suggestions, canAddCustom, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  const addSkill = (skill: SkillTagOption) => {
    const label = skill.label.trim().slice(0, 100);
    if (!label || selectedKeys.has(norm(label))) return;
    onChange([...value, { ...skill, label }]);
    setQuery('');
    setOpen(true);
    inputRef.current?.focus();
  };

  const removeSkill = (label: string) => {
    onChange(value.filter((v) => norm(v.label) !== norm(label)));
  };

  const commitQuery = () => {
    const label = query.trim().slice(0, 100);
    if (!label) return;
    if (exactInMasters) {
      addSkill({ id: exactInMasters.id, label: exactInMasters.label });
      return;
    }
    addSkill({ label });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !query && value.length) {
      removeSkill(value[value.length - 1]!.label);
      return;
    }
    if (e.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      if (!menuItems.length) return;
      setActiveIndex((i) => (i + 1) % menuItems.length);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!menuItems.length) return;
      setActiveIndex((i) => (i - 1 + menuItems.length) % menuItems.length);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (open && menuItems[activeIndex]) {
        addSkill(menuItems[activeIndex]!.skill);
        return;
      }
      commitQuery();
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <input
        ref={inputRef}
        type="text"
        disabled={disabled}
        value={query}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        autoComplete="off"
        maxLength={100}
        className={cn(
          'mt-0.5 h-8 w-full rounded-lg border bg-white px-2.5 text-xs text-slate-800 outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20 disabled:bg-slate-50',
          invalid ? 'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-500',
          inputClassName,
        )}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
      />

      {open && !disabled && menuItems.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {menuItems.map((item, idx) => (
            <li key={item.key} role="option" aria-selected={idx === activeIndex}>
              <button
                type="button"
                className={cn(
                  'flex w-full px-2.5 py-1.5 text-left text-xs text-slate-700',
                  idx === activeIndex ? 'bg-[#1A56DB]/10 text-[#1A56DB]' : 'hover:bg-slate-50',
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => addSkill(item.skill)}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((s) => (
            <span
              key={norm(s.label)}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 py-1 pl-2 pr-1 text-[11px] font-medium text-slate-700"
            >
              <span className="truncate">{s.label}</span>
              <button
                type="button"
                disabled={disabled}
                aria-label={`Remove ${s.label}`}
                className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-slate-500 transition hover:bg-slate-200 hover:text-slate-800 disabled:opacity-40"
                onClick={() => removeSkill(s.label)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
