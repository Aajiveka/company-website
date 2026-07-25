import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FormFieldProps {
  label: string;
  error?: string;
  touched?: boolean;
  required?: boolean;
  children: React.ReactNode;
  hint?: string;
}

function FormField({ label, error, touched, required, children, hint }: FormFieldProps) {
  const showError = touched && !!error;
  const showSuccess = touched && !error;

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>

      {hint && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}

      <div className="relative">
        <div
          className={cn(
            'rounded-md transition-colors',
            showError && '[&>input]:border-red-500 [&>select]:border-red-500 [&>textarea]:border-red-500',
            showSuccess && '[&>input]:border-green-500 [&>select]:border-green-500 [&>textarea]:border-green-500',
          )}
        >
          {children}
        </div>

        {showSuccess && (
          <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
            <Check className="h-4 w-4 text-green-500" />
          </div>
        )}
      </div>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200 ease-in-out',
          showError ? 'max-h-6 opacity-100' : 'max-h-0 opacity-0',
        )}
      >
        <p className="text-xs text-red-500">{error}</p>
      </div>
    </div>
  );
}

export default FormField;
