import { cn } from '@/lib/cn';

/** Generic shimmer block for skeleton screens. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', className)} />;
}

/** Card-shaped skeleton used while profile/company data loads. */
export function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-xl bg-white p-6 shadow-card">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}
