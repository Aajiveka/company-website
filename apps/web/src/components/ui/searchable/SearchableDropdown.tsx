import { useCallback, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAnchoredPanel } from '../useAnchoredPanel';
import { SearchField } from './SearchField';
import { useComboboxKeys } from './useComboboxKeys';
import { norm, useOptionSearch, type SearchOption } from './useOptionSearch';

export interface SearchableDropdownProps {
  options: readonly SearchOption[];
  /** Selected option's value. `''` shows the placeholder. */
  value: string;
  onValueChange: (value: string) => void;
  /** Placed on the trigger button so a sibling `<label htmlFor>` points at it. */
  id?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  /** Show a clear (×) button once something is chosen. */
  clearable?: boolean;
  'aria-label'?: string;
  /**
   * id of the visible `<label>`. Required whenever one exists: the trigger is a `<button>`,
   * and `<label for>` does not name a button — accname takes a button's name from its
   * contents, so without this every field announces as its placeholder.
   */
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
  /** Skins the closed trigger — the portal, public and employer themes each pass their own. */
  triggerClassName?: string;
  /** Renders to the right of the value, before the chevron. */
  icon?: React.ReactNode;
  /**
   * When set, a query that matches no option exactly gets an "Add “…”" row at the foot of the
   * list, and picking it hands the typed text here. The caller decides what a new entry is —
   * usually it adds an option for it and selects that.
   */
  onCreate?: (label: string) => void;
}

/**
 * A `<select>` you can type into: trigger button, portaled panel, search box, filtered listbox.
 *
 * The panel is portaled to `document.body` via {@link useAnchoredPanel} so it escapes the
 * `overflow-hidden` scroll containers the profile wizard and job cards put around their fields.
 */
export function SearchableDropdown({
  options,
  value,
  onValueChange,
  id,
  placeholder,
  searchPlaceholder,
  disabled = false,
  invalid = false,
  clearable = false,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  'aria-describedby': ariaDescribedBy,
  triggerClassName,
  icon,
  onCreate,
}: SearchableDropdownProps) {
  const { t } = useTranslation('common');
  const listId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
  }, []);

  const { containerRef, panelRef, triggerRef, panelStyle, close } = useAnchoredPanel({
    isOpen,
    onClose: handleClose,
    autoFocusRef: searchRef,
  });

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const { items, hiddenCount } = useOptionSearch(options, query);

  const createLabel = query.replace(/\s+/g, ' ').trim();
  const canCreate =
    !!onCreate && !!createLabel && !options.some((o) => norm(o.label) === norm(createLabel));
  // The "Add" row sits after the matches, so it is addressed as the index one past them.
  const count = items.length + (canCreate ? 1 : 0);

  const pick = useCallback(
    (index: number) => {
      if (canCreate && index === items.length) {
        onCreate?.(createLabel);
        close();
        setQuery('');
        return;
      }
      const option = items[index];
      if (!option || option.disabled) return;
      onValueChange(option.value);
      close();
      setQuery('');
    },
    [items, onValueChange, close, canCreate, onCreate, createLabel],
  );

  const { activeIndex, setActiveIndex, onKeyDown, optionId, activeId } = useComboboxKeys({
    count,
    listId,
    onPick: pick,
    onClose: close,
  });

  const onTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen(true);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // The panel sits in a portal with no label of its own. Prefer pointing at the field's
  // visible <label>; fall back to the aria-label, and only then to the placeholder.
  const panelLabelledBy = ariaLabel ? undefined : ariaLabelledBy;
  const panelLabel = panelLabelledBy ? undefined : (ariaLabel ?? placeholder);

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabel ? undefined : ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        // The trigger shows a label; tests and e2e need the value behind it.
        data-value={value}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
        className={cn('flex w-full items-center gap-2 text-left', triggerClassName)}
      >
        {icon}
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            !selected && 'text-gray-400 dark:text-gray-500',
          )}
        >
          {selected?.label ?? placeholder ?? t('multiSelect.placeholder')}
        </span>
        {clearable && selected && !disabled && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={t('multiSelect.remove', { label: selected.label })}
            className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            onClick={(e) => {
              e.stopPropagation();
              onValueChange('');
            }}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-gray-400 transition-transform',
            isOpen && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {isOpen &&
        panelStyle &&
        createPortal(
          <div
            ref={panelRef}
            style={panelStyle}
            className="z-50 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-800"
          >
            <SearchField
              ref={searchRef}
              value={query}
              onChange={setQuery}
              onKeyDown={onKeyDown}
              controls={listId}
              activeDescendant={activeId}
              placeholder={searchPlaceholder}
              aria-label={panelLabel ? `${panelLabel} — ${t('multiSelect.search')}` : undefined}
              aria-labelledby={panelLabelledBy}
            />

            <ul id={listId} role="listbox" aria-label={panelLabel} aria-labelledby={panelLabelledBy} className="py-1">
              {items.length === 0 && !canCreate && (
                <li className="px-3 py-2 text-sm text-gray-400 dark:text-gray-500">
                  {t('multiSelect.noOptions')}
                </li>
              )}
              {items.map((option, i) => {
                const isSelected = option.value === value;
                const isActive = i === activeIndex;
                const heading = option.group && option.group !== items[i - 1]?.group;
                return (
                  <li key={`${option.group ?? ''}:${option.value}`}>
                    {heading && (
                      <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                        {option.group}
                      </div>
                    )}
                    <div
                      id={optionId(i)}
                      role="option"
                      aria-selected={isSelected}
                      data-value={option.value}
                      aria-disabled={option.disabled || undefined}
                      className={cn(
                        'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm',
                        isActive && 'bg-primary/5',
                        isSelected ? 'font-medium text-primary' : 'text-gray-700 dark:text-gray-300',
                        option.disabled && 'cursor-not-allowed opacity-50',
                      )}
                      onMouseEnter={() => setActiveIndex(i)}
                      // mousedown, not click: the search input's blur would close the panel first.
                      onMouseDown={(e) => {
                        e.preventDefault();
                        pick(i);
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">{option.label}</span>
                      {option.hint && (
                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                          {option.hint}
                        </span>
                      )}
                      {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden />}
                    </div>
                  </li>
                );
              })}
              {canCreate && (
                <li>
                  <div
                    id={optionId(items.length)}
                    role="option"
                    aria-selected={false}
                    className={cn(
                      'flex cursor-pointer items-center gap-2 border-t border-gray-100 px-3 py-2 text-sm font-medium text-primary dark:border-gray-700',
                      activeIndex === items.length && 'bg-primary/5',
                    )}
                    onMouseEnter={() => setActiveIndex(items.length)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(items.length);
                    }}
                  >
                    <Plus className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">
                      {t('multiSelect.add', { label: createLabel })}
                    </span>
                  </div>
                </li>
              )}
              {hiddenCount > 0 && (
                <li className="border-t border-gray-100 px-3 py-2 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
                  {t('multiSelect.more', { count: hiddenCount })}
                </li>
              )}
            </ul>
          </div>,
          document.body,
        )}
    </div>
  );
}
