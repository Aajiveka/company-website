import { cn } from '@/lib/cn';

/** Simple surface card matching the reference `.service-card` shadow/rounding. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl bg-white p-4 shadow-card dark:bg-gray-900 dark:shadow-none dark:ring-1 dark:ring-gray-800 sm:p-6', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-navy dark:text-gray-100', className)} {...props} />;
}
