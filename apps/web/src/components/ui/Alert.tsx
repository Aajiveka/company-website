import { AlertCircle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

const styles: Record<AlertVariant, { cls: string; Icon: typeof Info }> = {
  success: { cls: 'bg-green-50 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800', Icon: CheckCircle2 },
  error: { cls: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800', Icon: XCircle },
  warning: { cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800', Icon: AlertCircle },
  info: { cls: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800', Icon: Info },
};

export interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', children, className }: AlertProps) {
  const { cls, Icon } = styles[variant];
  return (
    <div className={cn('flex items-start gap-2 rounded-lg border p-3 text-sm', cls, className)} role="alert">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}
