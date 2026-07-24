import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Building2,
  Calendar,
  ChevronDown,
  IndianRupee,
  MapPin,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Card, JobCardSkeleton, statusTone } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useAppliedJobs } from '../candidate.api';
import type { AppliedJob } from '../candidate.types';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

const STEPS = ['Applied', 'Shortlisted', 'Interview', 'Selected'] as const;

function stepIndex(status: string): number {
  if (status === 'Applied' || status === 'Mapped') return 0;
  if (status === 'Shortlisted') return 1;
  if (status.startsWith('Interview')) return 2;
  if (status === 'Selected') return 3;
  return -1;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) +
    ', ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function StepProgress({ status }: { status: string }) {
  const { t } = useTranslation('dashboard');
  const current = stepIndex(status);
  const isRejected = status === 'Rejected';

  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, i) => {
        const completed = current > i;
        const active = current === i && !isRejected;
        const pending = current < i || isRejected;

        return (
          <div key={step} className="flex items-center">
            {i > 0 && (
              <div className={cn('h-0.5 w-6 sm:w-10', completed ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600')} />
            )}
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition sm:h-8 sm:w-8',
                  completed && 'bg-green-500 text-white',
                  active && 'bg-primary text-white ring-4 ring-primary/20',
                  pending && 'border-2 border-gray-300 text-gray-400 dark:border-gray-600',
                )}
              >
                {completed ? '\u2713' : i + 1}
              </div>
              <span className={cn(
                'text-[10px] font-medium sm:text-xs',
                completed ? 'text-green-600 dark:text-green-400' : active ? 'text-primary' : 'text-gray-400',
              )}>
                {t(`tracking.${step.toLowerCase()}`)}
              </span>
            </div>
          </div>
        );
      })}

      {isRejected && (
        <>
          <div className="h-0.5 w-6 bg-red-300 sm:w-10" />
          <div className="flex flex-col items-center gap-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white sm:h-8 sm:w-8">
              {'\u2715'}
            </div>
            <span className="text-[10px] font-medium text-red-500 sm:text-xs">{t('tracking.rejected')}</span>
          </div>
        </>
      )}
    </div>
  );
}

function ApplicationCard({ job }: { job: AppliedJob }) {
  const { t } = useTranslation('dashboard');
  const { t: tJobs } = useTranslation('jobs');
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex-1">
          <Link to={`/jobs/${job.jobId}`} className="font-heading text-lg font-semibold text-navy hover:text-primary">
            {job.designation}
          </Link>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            {job.company}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{job.industry}</span>
          <Badge tone={statusTone(job.status)}>{job.status}</Badge>
        </div>
      </div>

      {/* Job details */}
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

      {/* Progress stepper */}
      <div className="mt-5 flex justify-center overflow-x-auto py-2">
        <StepProgress status={job.status} />
      </div>

      {/* Interview details */}
      {job.interview && (
        <div className="mt-4 flex items-center gap-3 rounded-lg bg-purple-50 px-4 py-3 text-sm dark:bg-purple-900/20">
          <Video className="h-5 w-5 shrink-0 text-purple-600 dark:text-purple-400" aria-hidden />
          <div>
            <p className="font-medium text-purple-700 dark:text-purple-300">
              {t('tracking.interviewScheduled')}
            </p>
            <p className="text-purple-600 dark:text-purple-400">
              {formatDateTime(job.interview.scheduledOn)}
              {job.interview.mode && ` · ${job.interview.mode}`}
              {job.interview.location && ` · ${job.interview.location}`}
            </p>
          </div>
        </div>
      )}

      {/* Timeline toggle + content */}
      {job.statusHistory.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
          <button
            onClick={() => setExpanded((o) => !o)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
          >
            <ChevronDown className={cn('h-3.5 w-3.5 transition', expanded && 'rotate-180')} />
            {expanded ? t('tracking.hideTimeline') : t('tracking.viewTimeline')}
          </button>

          {expanded && (
            <div className="mt-3 space-y-0 pl-2">
              {job.statusHistory.map((entry, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      i === job.statusHistory.length - 1 ? 'bg-primary' : 'bg-green-500',
                    )} />
                    {i < job.statusHistory.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-600" />}
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-navy">{entry.status}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(entry.timestamp)}</p>
                    {entry.comments && (
                      <p className="mt-1 text-xs text-gray-500 italic">"{entry.comments}"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Applied date */}
      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <Calendar className="h-3.5 w-3.5" aria-hidden />
          {t('tracking.appliedOn', { date: job.appliedOn })}
        </p>
      </div>
    </Card>
  );
}

/** Candidate — jobs applied to, with status tracking. */
export default function AppliedJobsPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useAppliedJobs();

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('appliedJobs.heading') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('appliedJobs.heading')}</h1>

      {isLoading ? (
        <div className="space-y-4">
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : !data?.length ? (
        <Card className="text-center">
          <p className="py-6 text-navy">{t('appliedJobs.noJobs')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((job) => (
            <ApplicationCard key={job.jobId} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
