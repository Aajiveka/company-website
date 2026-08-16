import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, Search } from 'lucide-react';
import { useSavedJobs, useUnsaveJob } from '../../candidate.api';
import { Card, CardBody, EmptyState, ErrorState, SkeletonRows } from '../components/primitives';
import { JobResultCard } from '@/features/jobs/components/JobResultCard';

/**
 * Saved Jobs — the destination behind the header's bookmark item.
 *
 * Reuses the search result card so a saved job reads exactly as it did in the list it was
 * saved from, including the Apply action; the bookmark toggle here removes it.
 */
export default function SavedJobsPage() {
  const { data, isLoading, isError, refetch } = useSavedJobs();
  const unsave = useUnsaveJob();
  const [query, setQuery] = useState('');

  const jobs = useMemo(() => data ?? [], [data]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) => `${j.designation} ${j.company}`.toLowerCase().includes(q));
  }, [jobs, query]);

  return (
    <>
      <header>
        <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-gray-100">Saved Jobs</h1>
        <p className="mt-1 text-sm text-slate-500">Roles you bookmarked to come back to</p>
      </header>

      {isError ? (
        <Card className="mt-5">
          <ErrorState message="We could not load your saved jobs." onRetry={refetch} />
        </Card>
      ) : isLoading ? (
        <Card className="mt-5">
          <CardBody>
            <SkeletonRows rows={3} />
          </CardBody>
        </Card>
      ) : jobs.length ? (
        <>
          <div className="relative mt-5">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved jobs…"
              aria-label="Search saved jobs"
              className="w-full rounded-lg border border-aj-line bg-white py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-aj-blue focus:outline-none focus:ring-2 focus:ring-aj-ring dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-gray-200">
            {visible.length} {visible.length === 1 ? 'job' : 'jobs'} saved
          </p>

          <div className="mt-3 space-y-4">
            {visible.map((job) => (
              <JobResultCard
                key={job.jobId}
                job={{ ...job, postedOn: job.postedOn }}
                isSaved
                onToggleSave={() => unsave.mutate(job.jobId)}
              />
            ))}
          </div>
        </>
      ) : (
        <Card className="mt-5">
          <EmptyState
            icon={<Bookmark className="size-10" aria-hidden />}
            title="No saved jobs yet"
            description="Bookmark a role from the job list and it will wait for you here."
            action={
              <Link
                to="/jobs"
                className="rounded-lg bg-aj-blue px-5 py-2.5 text-sm font-semibold text-white hover:bg-aj-blue-hover"
              >
                Browse jobs
              </Link>
            }
          />
        </Card>
      )}
    </>
  );
}
