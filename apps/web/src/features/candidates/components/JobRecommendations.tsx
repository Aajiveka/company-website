import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { MapPin, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Badge, Button, Card, Skeleton } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

interface RecommendedJob {
  jobId: number;
  designation: string;
  company: string;
  city: string;
  minCtc: number;
  maxCtc: number;
  matchPercentage: number;
  workMode: string;
}

function formatCtc(value: number): string {
  const lakhs = value / 100_000;
  return lakhs % 1 === 0 ? `${lakhs}L` : `${lakhs.toFixed(1)}L`;
}

function matchTone(percentage: number): BadgeTone {
  if (percentage > 80) return 'green';
  if (percentage > 60) return 'amber';
  return 'gray';
}

function useRecommendedJobs() {
  return useQuery({
    queryKey: ['candidate', 'recommendations'],
    queryFn: () =>
      api.get<RecommendedJob[]>('/candidates/me/recommendations').then((r) => r.data),
  });
}

/*
 * There is no body-less quick apply any more.
 *
 * POST /jobs/:id/apply now takes the apply form (fullName, email and phone are required) and
 * stores it as the snapshot the recruiter reads back, so firing it with no body returns 400.
 * Applying is a screen, not a button: this card links to it the same way the job cards and
 * the job detail page do.
 */

function JobCardSkeleton() {
  return (
    <div className="space-y-3 rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-24 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

export default function JobRecommendations() {
  const { t } = useTranslation('dashboard');
  const { data: jobs, isLoading, refetch, isFetching } = useRecommendedJobs();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold text-navy dark:text-white">
            {t('recommendations.heading')}
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          {t('recommendations.refresh')}
        </Button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!isLoading && (!jobs || jobs.length === 0) && (
        <Card className="py-12 text-center">
          <Sparkles className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('recommendations.empty')}
          </p>
        </Card>
      )}

      {!isLoading && jobs && jobs.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.slice(0, 6).map((job) => (
            <Card
              key={job.jobId}
              className="flex flex-col justify-between p-5 transition hover:shadow-md"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-navy dark:text-white">
                    {job.designation}
                  </h3>
                  <Badge tone={matchTone(job.matchPercentage)}>
                    {job.matchPercentage}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {job.company}
                </p>
                <div className="mt-1 flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.city}
                </div>
                <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {`\u20B9${formatCtc(job.minCtc)} - \u20B9${formatCtc(job.maxCtc)}`}
                </p>
                <div className="mt-2">
                  <Badge tone="blue">{job.workMode}</Badge>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/jobs/${job.jobId}`}>
                    {t('recommendations.viewDetails')}
                  </Link>
                </Button>
                <Button size="sm" asChild>
                  <Link to={`/jobs/${job.jobId}/apply`}>
                    {t('recommendations.quickApply')}
                  </Link>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
