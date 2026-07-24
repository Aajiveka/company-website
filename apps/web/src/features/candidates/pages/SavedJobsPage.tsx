import { Link } from 'react-router-dom';
import { Bookmark, Briefcase, Building2, IndianRupee, MapPin, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Card, JobCardSkeleton, useToast } from '@/components/ui';
import { useSavedJobs, useUnsaveJob } from '../candidate.api';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

export default function SavedJobsPage() {
  const { t } = useTranslation('dashboard');
  const { t: tJobs } = useTranslation('jobs');
  const { data: jobs, isLoading } = useSavedJobs();
  const unsave = useUnsaveJob();
  const { notify } = useToast();

  const onUnsave = (jobId: number) =>
    unsave.mutate(jobId, {
      onSuccess: () => notify(t('savedJobs.removed'), 'success'),
    });

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('savedJobs.heading') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('savedJobs.heading')}</h1>

      {isLoading ? (
        <div className="space-y-4">
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : !jobs?.length ? (
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-6">
            <Bookmark className="h-10 w-10 text-gray-300" aria-hidden />
            <p className="text-navy">{t('savedJobs.noJobs')}</p>
            <p className="text-sm text-gray-500">{t('savedJobs.browseHint')}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.jobId} className="transition hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <Link to={`/jobs/${job.jobId}`} className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-navy hover:text-primary">{job.designation}</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                    <Building2 className="h-4 w-4 text-primary" aria-hidden />
                    {job.company}
                  </p>
                </Link>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {job.industry}
                  </span>
                  <button
                    onClick={() => onUnsave(job.jobId)}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/20"
                    aria-label={t('savedJobs.remove')}
                    disabled={unsave.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600">
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-gray-400" aria-hidden />
                  {job.city}
                </span>
                <span className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4 text-gray-400" aria-hidden />
                  {job.minExp === 0 ? tJobs('search.fresher') : `${job.minExp}+ ${tJobs('search.yrs')}`} · {job.workMode} · {job.employmentType}
                </span>
                <span className="flex items-center gap-1.5">
                  <IndianRupee className="h-4 w-4 text-gray-400" aria-hidden />
                  {lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <p className="text-xs text-gray-500">
                  {t('savedJobs.savedOn', { date: job.savedOn })}
                </p>
                <Link
                  to={`/jobs/${job.jobId}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('savedJobs.viewDetails')} →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
