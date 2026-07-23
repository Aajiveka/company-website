import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

export interface HierarchicalSelectProps {
  groups: Record<string, string[]>;
  value: string;
  onChange: (leaf: string, group: string) => void;
  placeholder?: string;
  formatValue?: (leaf: string, group: string) => string;
  icon?: React.ReactNode;
  'aria-label'?: string;
}

export function HierarchicalSelect({
  groups,
  value,
  onChange,
  placeholder = 'Select…',
  formatValue,
  icon,
  'aria-label': ariaLabel,
}: HierarchicalSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Reverse-lookup: leaf → group
  const leafToGroup = useMemo(() => {
    const map = new Map<string, string>();
    for (const [group, leaves] of Object.entries(groups)) {
      for (const leaf of leaves) {
        if (!map.has(leaf)) map.set(leaf, group);
      }
    }
    return map;
  }, [groups]);

  const displayText = useMemo(() => {
    if (!value) return placeholder;
    const group = leafToGroup.get(value);
    if (!group) return value;
    return formatValue ? formatValue(value, group) : value;
  }, [value, leafToGroup, formatValue, placeholder]);

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

  const toggleGroup = (group: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const selectLeaf = (leaf: string, group: string) => {
    onChange(leaf, group);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const groupKeys = Object.keys(groups);

  // Collect all visible focusable items for arrow key navigation
  const getFocusableItems = useCallback((): HTMLElement[] => {
    if (!panelRef.current) return [];
    return Array.from(panelRef.current.querySelectorAll<HTMLElement>('button'));
  }, []);

  const onPanelKeyDown = (e: React.KeyboardEvent) => {
    const items = getFocusableItems();
    if (items.length === 0) return;
    const current = document.activeElement as HTMLElement;
    const idx = items.indexOf(current);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = idx < items.length - 1 ? idx + 1 : 0;
      items[next].focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = idx > 0 ? idx - 1 : items.length - 1;
      items[prev].focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      items[0].focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      items[items.length - 1].focus();
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      triggerRef.current?.focus();
    }
  };

  // Keyboard on trigger
  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((o) => !o);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  // Focus first item when panel opens
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const first = panelRef.current.querySelector<HTMLElement>('button');
      first?.focus();
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        type="button"
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="flex h-11 w-full items-center gap-2 bg-transparent text-sm text-gray-700 outline-none dark:text-gray-200"
        onClick={() => setIsOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        {icon}
        <span className={`flex-1 truncate text-left ${value ? 'text-gray-700' : 'text-gray-400'}`}>
          {displayText}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg sm:max-h-72 dark:border-gray-600 dark:bg-gray-800"
          onKeyDown={onPanelKeyDown}
        >
          {groupKeys.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400">No options</div>
          )}
          {groupKeys.map((group) => {
            const isExpanded = expanded.has(group);
            const cities = groups[group];
            return (
              <div key={group} role="group" aria-label={group}>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                  onClick={() => toggleGroup(group)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                  )}
                  {group}
                </button>
                {isExpanded &&
                  cities.map((city) => (
                    <button
                      key={city}
                      type="button"
                      role="option"
                      aria-selected={value === city}
                      className={`w-full cursor-pointer py-2.5 pl-9 pr-3 text-left text-sm hover:bg-primary/5 hover:text-primary ${
                        value === city ? 'bg-primary/10 font-medium text-primary' : 'text-gray-600'
                      }`}
                      onClick={() => selectLeaf(city, group)}
                    >
                      {city}
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
