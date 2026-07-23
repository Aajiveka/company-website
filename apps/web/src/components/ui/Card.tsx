import { cn } from '@/lib/cn';

/** Simple surface card matching the reference `.service-card` shadow/rounding. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl bg-white p-4 shadow-card sm:p-6 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4 flex items-center justify-between', className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-navy', className)} {...props} />;
}
