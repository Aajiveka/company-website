import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import type { AppliedJob } from '../../candidate.types';
import { InitialAvatar, Pill } from './primitives';
import { avatarTone, dotted, lpa, relativeTime } from '../format';
import { statusView } from '../applicationStatus';

/**
 * One application row, shared by the in-profile tracker (Figma 7:8151) and the standalone
 * Applications page (28:5178) — the design draws the same row in both, so it lives here
 * rather than being copied into each page and drifting.
 */
export function ApplicationRow({ job }: { job: AppliedJob }) {
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
