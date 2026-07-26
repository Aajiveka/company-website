import { useEffect, useRef } from 'react';
import type { FieldErrors } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert } from './Alert';

export interface ErrorSummaryProps {
  /** The `formState.errors` object from react-hook-form. */
  errors: FieldErrors;
  /** Heading text shown above the error list. */
  heading?: string;
  /** Optional map of field names to human-readable labels. */
  labels?: Record<string, string>;
  /** Optional className for the wrapper. */
  className?: string;
}

/**
 * Flatten nested react-hook-form errors into a list of
 * `{ field, message }` pairs.
 */
function flattenErrors(
  errors: FieldErrors,
  prefix = '',
): { field: string; message: string }[] {
  const result: { field: string; message: string }[] = [];
  for (const [key, value] of Object.entries(errors)) {
    if (!value) continue;
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value.message === 'string') {
      result.push({ field: path, message: value.message });
    } else if (typeof value === 'object') {
      result.push(...flattenErrors(value as FieldErrors, path));
    }
  }
  return result;
}

/**
 * Displays a summary of all form validation errors at the top of a form.
 * Improves accessibility by giving screen-reader users a single location to
 * discover all issues without tabbing through every field.
 *
 * Renders nothing when there are no errors.
 */
export function ErrorSummary({
  errors,
  heading,
  labels,
  className,
}: ErrorSummaryProps) {
  const { t } = useTranslation('common');
  const resolvedHeading = heading ?? t('validation.fixErrors');
  const ref = useRef<HTMLDivElement>(null);
  const items = flattenErrors(errors);

  // Move focus to the summary when errors first appear so screen readers
  // announce it immediately.
  useEffect(() => {
    if (items.length > 0 && ref.current) {
      ref.current.focus();
    }
  }, [items.length]);

  if (items.length === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-label={resolvedHeading}
      className={className}
    >
      <Alert variant="error">
        <p className="mb-1 font-medium">{resolvedHeading}</p>
        <ul className="list-disc space-y-0.5 pl-4">
          {items.map(({ field, message }) => (
            <li key={field}>
              {labels?.[field] ? (
                <span className="font-medium">{labels[field]}:</span>
              ) : null}{' '}
              {message}
            </li>
          ))}
        </ul>
      </Alert>
    </div>
  );
}
