import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, ChevronRight, MapPin, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/cn';
import { useAnchoredPanel } from './useAnchoredPanel';
import type { LocationCityOption, LocationStateOption } from './LocationSelect';

export interface LocationMultiSelectProps {
  states?: LocationStateOption[];
  cities?: LocationCityOption[];
  /** Selected city ids. */
  value: number[];
  onChange: (cityIds: number[]) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

/**
 * The home page's state → city picker, in multi-select shape.
 *
 * Preferred locations used to render every district in the country as a flat wall of
 * checkboxes. This is the same expand-a-state-to-see-its-districts dropdown the job search
 * bar and {@link LocationSelect} use — only the districts tick on and off, and what is
 * chosen shows up as removable chips under the field.
 */
export function LocationMultiSelect({
  states,
  cities,
  value,
  onChange,
  label,
  placeholder = 'Select Location',
  error,
  required,
}: LocationMultiSelectProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const handleClose = useCallback(() => setIsOpen(false), []);
  const { containerRef, panelRef, triggerRef, panelStyle, onPanelKeyDown, close } = useAnchoredPanel({
    isOpen,
    onClose: handleClose,
  });

  // State → its cities, in the order the masters endpoint returns them. States with no
  // cities are dropped rather than rendered as rows that expand to nothing.
  const groups = useMemo(() => {
    const byStateId = new Map<number, LocationCityOption[]>();
    for (const city of cities ?? []) {
      const list = byStateId.get(city.stateId);
      if (list) list.push(city);
      else byStateId.set(city.stateId, [city]);
    }
    return (states ?? [])
      .map((state) => ({ state, cities: byStateId.get(state.id) ?? [] }))
      .filter((group) => group.cities.length > 0);
  }, [states, cities]);

  const selected = useMemo(() => new Set(value), [value]);

  // Chips follow the user's selection order, not the masters order, so a just-added
  // district lands at the end where they are looking.
  const selectedChips = useMemo(() => {
    const byId = new Map((cities ?? []).map((c) => [c.id, c]));
    return value.flatMap((id) => {
      const city = byId.get(id);
      return city ? [city] : [];
    });
  }, [value, cities]);

  const toggleCity = (id: number) =>
    onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);

  const toggleGroup = (stateId: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(stateId)) next.delete(stateId);
      else next.add(stateId);
      return next;
    });

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

  const ariaLabel = label ?? placeholder;
  const displayText = value.length === 0 ? placeholder : t('multiSelect.selected', { count: value.length });

  return (
    <div className="w-full">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </span>
      )}
      <div ref={containerRef} className="relative w-full">
        <div
          className={cn(
            'flex w-full items-center rounded-lg border bg-white px-3.5 transition dark:bg-gray-800',
            'focus-within:ring-2 focus-within:ring-primary/30',
            error ? 'border-danger' : 'border-gray-300 focus-within:border-primary dark:border-gray-600',
          )}
        >
          <button
            ref={triggerRef}
            type="button"
            aria-label={ariaLabel}
            aria-expanded={isOpen}
            aria-haspopup="listbox"
            className="flex h-11 w-full items-center gap-2 bg-transparent text-sm outline-none"
            onClick={() => setIsOpen((o) => !o)}
            onKeyDown={onTriggerKeyDown}
          >
            <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
            <span
              className={cn(
                'flex-1 truncate text-left',
                value.length ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500',
              )}
            >
              {displayText}
            </span>
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform', isOpen && 'rotate-180')}
            />
          </button>
        </div>

        {isOpen &&
          panelStyle &&
          createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-multiselectable
              aria-label={ariaLabel}
              style={panelStyle}
              className="z-50 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
              onKeyDown={onPanelKeyDown}
            >
              {groups.length === 0 && (
                <div className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                  {t('multiSelect.noOptions')}
                </div>
              )}
              {groups.map(({ state, cities: stateCities }) => {
                const isExpanded = expanded.has(state.id);
                const count = stateCities.reduce((n, c) => (selected.has(c.id) ? n + 1 : n), 0);
                return (
                  <div key={state.id} role="group" aria-label={state.label}>
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => toggleGroup(state.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
                      )}
                      <span className="flex-1 truncate">{state.label}</span>
                      {count > 0 && (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary dark:bg-primary/20">
                          {count}
                        </span>
                      )}
                    </button>
                    {isExpanded &&
                      stateCities.map((city) => {
                        const isSelected = selected.has(city.id);
                        return (
                          <button
                            key={city.id}
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            className={cn(
                              'flex w-full cursor-pointer items-center gap-2.5 py-2.5 pl-9 pr-3 text-left text-sm hover:bg-primary/5 hover:text-primary',
                              isSelected ? 'font-medium text-primary' : 'text-gray-600 dark:text-gray-400',
                            )}
                            onClick={() => toggleCity(city.id)}
                          >
                            <span
                              className={cn(
                                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition',
                                isSelected
                                  ? 'border-primary bg-primary text-white'
                                  : 'border-gray-300 dark:border-gray-500',
                              )}
                              aria-hidden
                            >
                              {isSelected && <Check className="h-3 w-3" strokeWidth={3} />}
                            </span>
                            <span className="truncate">{city.label}</span>
                          </button>
                        );
                      })}
                  </div>
                );
              })}
              {value.length > 0 && (
                <div className="sticky bottom-0 flex items-center justify-between border-t border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('multiSelect.selected', { count: value.length })}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onChange([]);
                      close();
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    {t('multiSelect.clearAll')}
                  </button>
                </div>
              )}
            </div>,
            document.body,
          )}
      </div>

      {selectedChips.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedChips.map((city) => (
            <span
              key={city.id}
              className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 py-0.5 pl-2.5 pr-1 text-xs font-medium text-primary dark:bg-primary/20"
            >
              {city.label}
              <button
                type="button"
                onClick={() => toggleCity(city.id)}
                className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-primary/20"
                aria-label={t('multiSelect.remove', { label: city.label })}
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
