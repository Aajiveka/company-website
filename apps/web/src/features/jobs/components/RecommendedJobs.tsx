import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, Briefcase, Building2, IndianRupee, MapPin, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardSkeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { useSavedJobIds, useSaveJob, useUnsaveJob } from '@/features/candidates/candidate.api';
import { useRecommendedJobs } from '../jobs.api';
import type { PublicJob } from '../jobs.types';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

function MiniJobCard({ job, isSaved, onToggleSave }: { job: PublicJob; isSaved: boolean; onToggleSave: () => void }) {
  const { t } = useTranslation('jobs');
  return (
    <Card className="transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <Link to={`/jobs/${job.jobId}`} className="flex-1">
          <h4 className="font-heading text-base font-semibold text-navy hover:text-primary">{job.designation}</h4>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
            <Building2 className="h-3.5 w-3.5 text-primary" aria-hidden />
            {job.company}
          </p>
        </Link>
        <button
          onClick={onToggleSave}
          className={cn('shrink-0 rounded-lg p-1.5', isSaved ? 'text-primary' : 'text-gray-400 hover:text-primary')}
          aria-label={isSaved ? 'Unsave job' : 'Save job'}
        >
          <Bookmark className={cn('h-4 w-4', isSaved && 'fill-current')} />
        </button>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {job.city}
        </span>
        <span className="flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5" aria-hidden />
          {job.minExp === 0 ? t('search.fresher') : `${job.minExp}+ ${t('search.yrs')}`}
        </span>
        <span className="flex items-center gap-1">
          <IndianRupee className="h-3.5 w-3.5" aria-hidden />
          {lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA
        </span>
      </div>
    </Card>
  );
}

/** "Recommended for You" section on candidate dashboard. */
export function RecommendedJobs() {
  const { t } = useTranslation('jobs');
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = useRecommendedJobs(isAuthenticated);
  const { data: savedIds } = useSavedJobIds(isAuthenticated);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const jobs = data?.rows?.slice(0, 4) ?? [];

  if (isLoading) {
    return (
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden />
          {t('recommended.heading')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!jobs.length) {
    return (
      <Card>
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden />
          <div>
            <h3 className="font-semibold text-navy">{t('recommended.heading')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('recommended.noRecommendations')}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-navy">
          <Sparkles className="h-5 w-5 text-accent" aria-hidden />
          {t('recommended.heading')}
        </h2>
        <Link to="/jobs" className="text-sm font-medium text-primary hover:underline">
          {t('recommended.viewAll')}
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {jobs.map((job) => (
          <MiniJobCard
            key={job.jobId}
            job={job}
            isSaved={savedIds?.includes(job.jobId) ?? false}
            onToggleSave={() => {
              if (!isAuthenticated) { navigate('/login'); return; }
              if (savedIds?.includes(job.jobId)) unsaveJob.mutate(job.jobId);
              else saveJob.mutate(job.jobId);
            }}
          />
        ))}
      </div>
    </div>
  );
}
