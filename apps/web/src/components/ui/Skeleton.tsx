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

/** Candidate profile page skeleton — avatar + header + skills + 2-column grid. */
export function ProfileSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex flex-col items-center gap-5 rounded-xl bg-white p-6 shadow-card sm:flex-row sm:items-start">
        <Skeleton className="h-28 w-28 rounded-full" />
        <div className="flex-1 space-y-3 text-center sm:text-left">
          <Skeleton className="mx-auto h-7 w-48 sm:mx-0" />
          <Skeleton className="mx-auto h-4 w-32 sm:mx-0" />
          <div className="flex flex-wrap justify-center gap-4 sm:justify-start">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </div>
      {/* Skills */}
      <div className="rounded-xl bg-white p-6 shadow-card">
        <Skeleton className="mb-3 h-6 w-24" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>
      {/* Experience + Education grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-4 rounded-xl bg-white p-6 shadow-card">
            <Skeleton className="h-6 w-28" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-1.5 border-l-2 border-gray-200 pl-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Company profile skeleton — logo + info + description. */
export function CompanyProfileSkeleton() {
  return (
    <div className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-card sm:flex-row sm:items-center">
      <Skeleton className="h-20 w-20 rounded-lg" />
      <div className="flex-1 space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}

/** Document list skeleton — rows with icon, text, and badge. */
export function DocumentListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card sm:p-6"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Job alert list skeleton — icon + keyword/location + badge. */
export function AlertListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-xl bg-white p-4 shadow-card sm:p-6"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-14 rounded-full" />
            <Skeleton className="h-4 w-4 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** CV Manager skeleton — multiple form section cards. */
export function CvManagerSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4 rounded-xl bg-white p-6 shadow-card">
          <Skeleton className="h-6 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 6 }).map((_, j) => (
              <div key={j} className="space-y-1.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-10 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Membership / subscription skeleton. */
export function MembershipSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-14 w-full rounded-lg" />
    </div>
  );
}

/** Job search results skeleton — list of job cards. */
export function JobCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  );
}
