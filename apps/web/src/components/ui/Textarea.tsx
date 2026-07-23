import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  required?: boolean;
}

/** Labelled textarea with inline error, wired for React Hook Form via ref. */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, required, id, ...props }, ref) => {
    const autoId = useId();
    const textareaId = id ?? autoId;
    const errorId = `${textareaId}-error`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
            {label}
            {required && <span className="ml-0.5 text-danger">*</span>}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition',
            'placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30',
            'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500',
            error ? 'border-danger focus:ring-danger/30' : 'border-gray-300 focus:border-primary dark:border-gray-700',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';
