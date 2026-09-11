import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  /** id of the listbox this input filters. */
  controls: string;
  /** id of the highlighted row, for screen readers. */
  activeDescendant?: string;
  expanded?: boolean;
  placeholder?: string;
  'aria-label'?: string;
  /** id of the field's visible `<label>`, when there is one to point at. */
  'aria-labelledby'?: string;
  /** Styles the sticky row, so the panel can wear the public, portal or employer skin. */
  className?: string;
  inputClassName?: string;
}

/**
 * The search row that sits at the top of a dropdown panel.
 *
 * It is the combobox proper — the surrounding trigger button only opens the panel — so the
 * `role`/`aria-*` set lives here rather than on the trigger.
 */
export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(function SearchField(
  {
    value,
    onChange,
    onKeyDown,
    controls,
    activeDescendant,
    expanded = true,
    placeholder,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    className,
    inputClassName,
  },
  ref,
) {
  const { t } = useTranslation('common');
  return (
    <div
      className={cn(
        'sticky top-0 z-10 flex items-center gap-2 border-b border-gray-100 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
      <input
        ref={ref}
        type="text"
        role="combobox"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? t('multiSelect.search')}
        aria-label={ariaLabelledBy ? undefined : (ariaLabel ?? placeholder ?? t('multiSelect.search'))}
        aria-labelledby={ariaLabelledBy}
        aria-controls={controls}
        aria-expanded={expanded}
        aria-autocomplete="list"
        aria-activedescendant={activeDescendant}
        autoComplete="off"
        className={cn(
          'h-6 w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500',
          inputClassName,
        )}
      />
    </div>
  );
});
