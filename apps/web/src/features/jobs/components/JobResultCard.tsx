import { Link } from 'react-router-dom';
import { Bookmark, Briefcase, CalendarDays, Clock, IndianRupee } from 'lucide-react';
import { cn } from '@/lib/cn';
import { InitialAvatar } from '@/features/candidates/portal/components/primitives';
import { avatarTone, relativeTime } from '@/features/candidates/portal/format';
import { matchTone, type JobMatch } from '../jobMatch';
import type { PublicJob } from '../jobs.types';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

/** "In-office" / "Hybrid" / "Remote" are called out in orange in the design. */
const WORK_MODE_CLASS = 'text-orange-500';

/**
 * One row in the job results list (Figma node 25:3635).
 *
 * Skills, the match badge and the save control are all optional: the same card renders for an
 * anonymous visitor, who has no profile to match against and nowhere to save to.
 */
export function JobResultCard({
  job,
  skills,
  match,
  isSaved,
  onToggleSave,
}: {
  job: PublicJob;
  skills?: string[];
  match?: JobMatch | null;
  isSaved?: boolean;
  onToggleSave?: () => void;
}) {
  const salary = job.minCtc || job.maxCtc ? `${lpa(job.minCtc)}–${lpa(job.maxCtc)} LPA` : null;
  const posted = relativeTime(job.postedOn);
  const exp = (job as { maxExp?: number | null }).maxExp
    ? `${job.minExp}–${(job as { maxExp?: number | null }).maxExp} yrs`
    : job.minExp
      ? `${job.minExp}+ yrs`
      : 'Any experience';

  return (
    <article className="rounded-xl border border-aj-line bg-white p-4 shadow-aj-card transition-colors hover:border-aj-blue sm:p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex gap-4">
        <InitialAvatar text={job.company || '?'} className={avatarTone(job.company || 'j')} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base font-bold text-slate-800 dark:text-gray-100">
                <Link to={`/jobs/${job.jobId}`} className="hover:text-aj-blue">
                  {job.designation}
                </Link>
              </h3>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {job.company}
                {job.city && <> · {job.city}</>}
                {job.workMode && <> · <span className={WORK_MODE_CLASS}>{job.workMode}</span></>}
              </p>
            </div>

            {onToggleSave && (
              <button
                type="button"
                onClick={onToggleSave}
                aria-pressed={!!isSaved}
                aria-label={isSaved ? `Remove ${job.designation} from saved jobs` : `Save ${job.designation}`}
                className={cn(
                  'shrink-0 rounded-lg p-2 transition-colors',
                  isSaved
                    ? 'bg-blue-50 text-aj-blue dark:bg-blue-950'
                    : 'text-slate-300 hover:bg-aj-canvas hover:text-aj-blue dark:hover:bg-gray-700',
                )}
              >
                <Bookmark className={cn('size-5', isSaved && 'fill-current')} aria-hidden />
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-600 dark:text-gray-300">
            {salary && (
              <span className="inline-flex items-center gap-1.5">
                <IndianRupee className="size-4 shrink-0 text-slate-400" aria-hidden />
                <strong className="font-semibold">{salary}</strong>
              </span>
            )}
            <span className="inline-flex items-center gap-1.5">
              <Briefcase className="size-4 shrink-0 text-slate-400" aria-hidden />
              {exp}
            </span>
            {job.employmentType && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4 shrink-0 text-slate-400" aria-hidden />
                {job.employmentType}
              </span>
            )}
            {posted && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="size-4 shrink-0 text-slate-400" aria-hidden />
                {posted}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {(skills ?? []).slice(0, 4).map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-aj-canvas px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-gray-700 dark:text-gray-300"
                >
                  {s}
                </span>
              ))}
            </div>

            {match && <MatchBadge match={match} />}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to={`/jobs/${job.jobId}`}
              className="rounded-lg bg-aj-blue px-4 py-2.5 text-sm font-semibold text-white shadow-aj-raised transition-colors hover:bg-aj-blue-hover"
            >
              View details
            </Link>
            <Link
              to={`/jobs/${job.jobId}/apply`}
              className="rounded-lg border border-aj-blue px-4 py-2.5 text-sm font-semibold text-aj-blue transition-colors hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              Apply now
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function MatchBadge({ match }: { match: JobMatch }) {
  const tone = matchTone(match.percent);
  const cls =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-700'
      : tone === 'blue'
        ? 'bg-blue-50 text-aj-blue'
        : 'bg-slate-100 text-slate-500';

  return (
    <span
      title={match.reasons.join(' · ') || undefined}
      className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold', cls)}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {match.percent}% match
    </span>
  );
}
