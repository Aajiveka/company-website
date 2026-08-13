import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppliedJobs } from '../../candidate.api';
import type { AppliedJob } from '../../candidate.types';
import { ModuleHeader } from '../components/ModuleFrame';
import { Card, CardBody, EmptyState, ErrorState, InitialAvatar, Pill, SkeletonRows } from '../components/primitives';
import { avatarTone, dotted, lpa, relativeTime } from '../format';
import { statusView, summarise, type Bucket } from '../applicationStatus';

const FILTERS: { key: Bucket | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needsAction', label: 'Needs action' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'offers', label: 'Offers' },
  { key: 'closed', label: 'Closed' },
];

/** Application Tracker — Figma node 7:8151. */
export default function ApplicationTrackerPage() {
  const { data, isLoading, isError, refetch } = useAppliedJobs();
  const [filter, setFilter] = useState<Bucket | 'all'>('all');
  const [query, setQuery] = useState('');

  const jobs = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => summarise(jobs), [jobs]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (filter !== 'all' && statusView(job.status).bucket !== filter) return false;
      if (!q) return true;
      return `${job.designation} ${job.company}`.toLowerCase().includes(q);
    });
  }, [jobs, filter, query]);

  return (
    <>
      <ModuleHeader title="Application Tracker" />

      {isError ? (
        <Card>
          <ErrorState message="We could not load your applications." onRetry={refetch} />
        </Card>
      ) : isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={4} />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryTile value={counts.active} label="Active" className="border-blue-100 bg-blue-50/70 text-aj-blue" />
            <SummaryTile
              value={counts.interviewing}
              label="Interviewing"
              className="border-violet-100 bg-violet-50/70 text-violet-600"
            />
            <SummaryTile
              value={counts.offers}
              label="Offers"
              className="border-emerald-100 bg-emerald-50/70 text-emerald-600"
            />
            <SummaryTile
              value={counts.needsAction}
              label="Needs you"
              className="border-orange-100 bg-orange-50/70 text-orange-500"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search companies or roles…"
                aria-label="Search applications"
                className="w-full rounded-lg border border-aj-line bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-aj-blue focus:outline-none focus:ring-2 focus:ring-aj-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  aria-pressed={filter === f.key}
                  className={cn(
                    'rounded-full px-4 py-2 text-[13px] font-semibold transition-colors',
                    filter === f.key
                      ? 'bg-aj-blue text-white shadow-aj-raised'
                      : 'border border-aj-line bg-white text-slate-600 hover:border-aj-blue hover:text-aj-blue dark:bg-gray-800 dark:text-gray-300',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length ? (
            <div className="space-y-3">
              {visible.map((job) => (
                <ApplicationRow key={job.jobId} job={job} />
              ))}
            </div>
          ) : (
            <Card>
              <EmptyState
                title={jobs.length ? 'Nothing matches those filters' : 'No applications yet'}
                description={
                  jobs.length
                    ? 'Try a different filter or search term.'
                    : 'Jobs you apply to will show up here so you can track every round.'
                }
                action={
                  jobs.length ? undefined : (
                    <Link
                      to="/jobs"
                      className="rounded-lg bg-aj-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-aj-blue-hover"
                    >
                      Browse jobs
                    </Link>
                  )
                }
              />
            </Card>
          )}
        </>
      )}
    </>
  );
}

function SummaryTile({ value, label, className }: { value: number; label: string; className: string }) {
  return (
    <div className={cn('rounded-xl border px-4 py-3', className)}>
      <div className="font-display text-2xl font-bold leading-tight">{value}</div>
      <div className="text-xs text-slate-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

function ApplicationRow({ job }: { job: AppliedJob }) {
  const view = statusView(job.status);
  const latest = job.statusHistory.at(-1);
  const salary = job.minCtc || job.maxCtc ? `₹${lpa(job.minCtc)?.replace(' LPA', '')}–${lpa(job.maxCtc)}` : null;

  return (
    <Link
      to={`/jobs/${job.jobId}`}
      className="block rounded-xl border border-aj-line bg-white p-4 shadow-aj-card transition-colors hover:border-aj-blue dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-start gap-3">
        <InitialAvatar text={job.company || '?'} className={avatarTone(job.company || 'z')} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">{job.designation}</h3>
            <Pill tone={view.tone}>{view.label}</Pill>
          </div>
          <p className="mt-0.5 truncate text-[13px] text-slate-500">
            {dotted(job.company, job.city, job.workMode, salary)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <ProgressSegments value={view.progress} tone={view.tone} />
            <span className="text-xs text-slate-600 dark:text-gray-300">{latest?.status ?? job.status}</span>
            <span className="ml-auto text-xs text-slate-400">
              {relativeTime(latest?.timestamp ?? job.appliedOn)
                ? `Updated ${relativeTime(latest?.timestamp ?? job.appliedOn)}`
                : null}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/** The six-segment progress indicator under each row. */
function ProgressSegments({ value, tone }: { value: number; tone: string }) {
  const filled = Math.round(value * 6);
  const fill =
    tone === 'green'
      ? 'bg-emerald-500'
      : tone === 'red'
        ? 'bg-red-500'
        : tone === 'amber'
          ? 'bg-amber-500'
          : 'bg-aj-blue';

  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <span key={i} className={cn('h-1 w-5 rounded-full', i < filled ? fill : 'bg-aj-line')} />
      ))}
    </div>
  );
}
