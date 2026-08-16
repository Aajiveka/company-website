import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAppliedJobs } from '../../candidate.api';
import { Card, CardBody, EmptyState, ErrorState, SkeletonRows } from '../components/primitives';
import { ApplicationRow } from '../components/ApplicationRow';
import { statusView, summarise, type Bucket } from '../applicationStatus';

const FILTERS: { key: Bucket | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'needsAction', label: 'Needs action' },
  { key: 'inProgress', label: 'In progress' },
  { key: 'offers', label: 'Offers' },
  { key: 'closed', label: 'Closed' },
];

/**
 * Applications — Figma node 28:5178.
 *
 * The standalone, top-level version of the tracker: same data and same rows, but reached from
 * the header rather than from the profile rail, so it carries its own page heading instead of
 * a "Back to Profile" crumb.
 */
export default function ApplicationsPage() {
  const { data, isLoading, isError, refetch } = useAppliedJobs();
  const [filter, setFilter] = useState<Bucket | 'all'>('all');
  const [query, setQuery] = useState('');

  const jobs = useMemo(() => (Array.isArray(data) ? data : []), [data]);
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
      <header>
        <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-gray-100">Applications</h1>
        <p className="mt-1 text-sm text-slate-500">
          Track every job you&apos;ve applied to through each recruitment stage
        </p>
      </header>

      {isError ? (
        <Card className="mt-5">
          <ErrorState message="We could not load your applications." onRetry={refetch} />
        </Card>
      ) : isLoading ? (
        <Card className="mt-5">
          <CardBody>
            <SkeletonRows rows={4} />
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-3 gap-3">
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
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
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
            <div className="mt-4 space-y-3">
              {visible.map((job) => (
                <ApplicationRow key={job.jobId} job={job} />
              ))}
            </div>
          ) : (
            <Card className="mt-4">
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
