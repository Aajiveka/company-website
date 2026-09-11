import { FileText, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AVATAR_TONES, PRIORITY_TONE, STATUS_LABEL, STATUS_TONE, initialsOf } from '../q1.format';
import type { ScreeningPriority, ScreeningStatus } from '../q1.types';

/**
 * Shared Q1 atoms. Every colour here is read off the Figma "Q1 Flow" nodes rather than
 * approximated from Tailwind's ramps — the status pills in particular use four different
 * tint/ink pairs that no stock ramp reproduces.
 */

export function StatusPill({ status, className }: { status: ScreeningStatus; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        STATUS_TONE[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityDot({ priority }: { priority: ScreeningPriority }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', PRIORITY_TONE[priority])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {priority}
    </span>
  );
}

export function CvBadge({ available }: { available: boolean }) {
  return available ? (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-q1-green">
      <FileText className="h-3.5 w-3.5" aria-hidden />
      CV Available
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-q1-amber">
      <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
      CV Missing
    </span>
  );
}

/**
 * The completeness meter in the Profile column. The bar colour steps with the value exactly
 * as the design shows it: green at 100, blue in the middle band, amber below half.
 */
export function ProfileMeter({ value, className }: { value: number; className?: string }) {
  const tone = value >= 100 ? 'bg-q1-green' : value >= 60 ? 'bg-q1-blue' : 'bg-q1-amber';
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-q1-ink">{value}%</p>
      <div
        className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-q1-chip"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Profile completeness"
      >
        <div className={cn('h-full rounded-full transition-[width]', tone)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function Avatar({
  name,
  id,
  className,
}: {
  name: string;
  id: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-display text-sm font-bold',
        AVATAR_TONES[id % AVATAR_TONES.length],
        className ?? 'h-9 w-9',
      )}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

/** The white, hairline-bordered card every Q1 surface is built from. */
export function Q1Card({
  children,
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-q1-line bg-q1-surface shadow-q1-card dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** "—" for anything the candidate has not provided, exactly as the incomplete profile shows. */
export function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  const empty = value == null || value === '' || value === false;
  return (
    <div>
      <dt className="text-xs font-medium text-q1-muted">{label}</dt>
      <dd className={cn('mt-1 text-sm font-medium', empty ? 'text-q1-muted' : 'text-q1-ink dark:text-gray-100')}>
        {empty ? '—' : value}
      </dd>
    </div>
  );
}
