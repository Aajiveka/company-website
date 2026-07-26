import { Skeleton } from '@/components/ui/Skeleton';

interface PageSkeletonProps {
  variant?: 'list' | 'grid' | 'detail' | 'form';
}

function ListSkeleton() {
  return (
    <div className="space-y-3 rounded-xl bg-white p-4 shadow-card sm:p-6 dark:bg-gray-800">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
        <Skeleton className="h-5 w-1/4" />
        <Skeleton className="h-5 w-1/6" />
      </div>
      {/* Rows */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl bg-white p-5 shadow-card dark:bg-gray-800">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow-card sm:p-6 dark:bg-gray-800">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      {/* Image placeholder */}
      <Skeleton className="h-48 w-full rounded-lg" />
      {/* Text lines */}
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

function FormSkeletonVariant() {
  return (
    <div className="space-y-4 rounded-xl bg-white p-4 shadow-card sm:p-6 dark:bg-gray-800">
      <Skeleton className="h-6 w-40" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <Skeleton className="h-10 w-28 rounded-lg" />
      </div>
    </div>
  );
}

const variants = {
  list: ListSkeleton,
  grid: GridSkeleton,
  detail: DetailSkeleton,
  form: FormSkeletonVariant,
} as const;

function PageSkeleton({ variant = 'list' }: PageSkeletonProps) {
  const Component = variants[variant];
  return <Component />;
}

export default PageSkeleton;
