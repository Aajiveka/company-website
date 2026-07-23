import { cn } from '@/lib/cn';

/** Generic shimmer block for skeleton screens. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)} />;
}

/** Card-shaped skeleton used while profile/company data loads. */
export function CardSkeleton() {
  return (
    <div className="space-y-4 rounded-xl bg-white p-6 shadow-card dark:bg-gray-900">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

/** Skeleton for a profile page (avatar + name + meta rows). */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-5 rounded-xl bg-white p-6 shadow-card sm:flex-row sm:items-start dark:bg-gray-900">
        <Skeleton className="h-28 w-28 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      <div className="rounded-xl bg-white p-6 shadow-card dark:bg-gray-900">
        <Skeleton className="mb-3 h-5 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}

/** Skeleton for a job detail page. */
export function JobDetailSkeleton() {
  return (
    <div className="rounded-xl bg-white p-6 shadow-card dark:bg-gray-900">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <div className="mt-6 flex flex-wrap gap-6">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="mt-8 h-10 w-32 rounded-lg" />
    </div>
  );
}

/** Skeleton for a list of cards (alerts, documents, etc.). */
export function ListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-card sm:p-6 dark:bg-gray-900">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-7 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a company profile header. */
export function CompanyProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card sm:flex-row sm:items-center dark:bg-gray-900">
      <Skeleton className="h-20 w-20 rounded-lg" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-28" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
