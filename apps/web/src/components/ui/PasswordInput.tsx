import { forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface PasswordInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
}

/**
 * Password field with a reveal toggle (Figma node 54:3868).
 *
 * Kept separate from `Input` rather than adding a `type="password"` branch to it: the toggle
 * needs its own state and an extra button inside the field, and `Input` is used by ~40 forms
 * that would all pay for markup they never render.
 *
 * The toggle is a real button so it is reachable by keyboard, and it is excluded from the tab
 * order between the field and the submit button — `tabIndex={-1}` — because someone typing a
 * password expects Tab to take them to Login, not to a show/hide control.
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, label, error, id, ...props },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const errorId = `${inputId}-error`;
  const [visible, setVisible] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-gray-200">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          type={visible ? 'text' : 'password'}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            'w-full rounded-lg border bg-white px-3.5 py-2.5 pr-11 text-sm text-slate-800 transition-colors',
            'placeholder:text-slate-400 focus:border-aj-blue focus:outline-none focus:ring-2 focus:ring-aj-ring',
            'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500',
            error ? 'border-red-500' : 'border-aj-line dark:border-gray-700',
            className,
          )}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-gray-200"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
});
