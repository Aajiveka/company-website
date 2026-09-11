import { forwardRef, useId, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { SearchableDropdown } from './searchable/SearchableDropdown';
import { SEARCHABLE_THRESHOLD, type SearchOption } from './searchable/useOptionSearch';

export interface SelectOption {
  label: string;
  value: string | number;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  /**
   * Force the searchable combobox on or off. Defaults to on above
   * {@link SEARCHABLE_THRESHOLD} options.
   */
  searchable?: boolean;
}

/**
 * Native select styled to match the reference dropdowns — until the list gets long.
 *
 * Past {@link SEARCHABLE_THRESHOLD} options it renders a searchable combobox instead, because
 * masters like Function / Department (~1,566 rows) and Districts (~764) cannot be browsed by
 * scrolling. Both shapes take `value` and report back through `onChange` as `e.target.value`,
 * so call sites are unaffected.
 *
 * The searchable shape has no `<select>` element, so a forwarded `ref` is null and
 * `register()` will not bind to it. Use react-hook-form's `<Controller>` for long lists.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, searchable, id, ...props }, ref) => {
    const autoId = useId();
    const selectId = id ?? autoId;
    const errorId = `${selectId}-error`;

    const isSearchable =
      !props.multiple && (searchable ?? options.length > SEARCHABLE_THRESHOLD);

    const searchOptions = useMemo<SearchOption[]>(
      () => options.map((o) => ({ value: String(o.value), label: o.label })),
      [options],
    );

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            // The searchable trigger is a <button>, which <label for> does not name.
            id={`${selectId}-label`}
            className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200"
          >
            {label}
            {props.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </label>
        )}
        {isSearchable ? (
          <SearchableDropdown
            options={searchOptions}
            value={props.value == null ? '' : String(props.value)}
            onValueChange={(next) =>
              // Call sites only read `e.target.value`; hand them the same shape a <select> would.
              props.onChange?.({
                target: { value: next, name: props.name },
              } as React.ChangeEvent<HTMLSelectElement>)
            }
            id={selectId}
            placeholder={placeholder}
            disabled={props.disabled}
            invalid={!!error}
            clearable={!!placeholder && !props.required}
            aria-label={props['aria-label']}
            aria-labelledby={label ? `${selectId}-label` : undefined}
            aria-describedby={error ? errorId : undefined}
            triggerClassName={cn(
              'h-11 rounded-lg border bg-white px-3.5 text-sm text-gray-700 outline-none transition dark:bg-gray-800 dark:text-gray-100',
              'focus:ring-2 focus:ring-primary/30',
              error ? 'border-danger' : 'border-gray-300 focus:border-primary dark:border-gray-600',
              className,
            )}
          />
        ) : (
          <div className="relative">
            <select
              id={selectId}
              ref={ref}
              aria-invalid={!!error}
              aria-describedby={error ? errorId : undefined}
              className={cn(
                'h-11 w-full appearance-none rounded-lg border bg-white px-3.5 pr-9 text-sm outline-none transition dark:bg-gray-800 dark:text-gray-100',
                'focus:ring-2 focus:ring-primary/30',
                error ? 'border-danger' : 'border-gray-300 focus:border-primary dark:border-gray-600',
                className,
              )}
              {...props}
            >
              {placeholder && <option value="">{placeholder}</option>}
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500"
              aria-hidden
            />
          </div>
        )}
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = 'Select';
