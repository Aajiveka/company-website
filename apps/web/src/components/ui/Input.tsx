import { forwardRef, useId } from 'react';
import { cn } from '@/lib/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/** Labelled text input with inline error, wired for React Hook Form via ref. */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const autoId = useId();
    const inputId = id ?? autoId;
    const errorId = `${inputId}-error`;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-navy">
            {label}
            {props.required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          // aria-invalid alone tells a screen reader something is wrong but not WHAT.
          // Point at the message so it is announced.
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'h-11 w-full rounded-lg border bg-white px-3.5 text-sm outline-none transition',
            'placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30',
            error ? 'border-danger focus:ring-danger/30' : 'border-gray-300 focus:border-primary',
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
Input.displayName = 'Input';
