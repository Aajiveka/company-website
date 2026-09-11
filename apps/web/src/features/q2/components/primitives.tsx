import { Building2, Check, FileText, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  AVATAR_TONES,
  STATUS_LABEL,
  STATUS_TONE,
  initialsOf,
  matchTone,
  profileTone,
  weightLabel,
} from '../q2.format';
import type { MatchReviewStatus } from '../q2.types';

/**
 * Shared Q2 atoms. Every colour is read off the Figma "Q2" nodes rather than approximated
 * from Tailwind's ramps — the emerald family in particular (#009966 / #00bc7d / #008236) is
 * not `emerald-600/500/700`.
 */

/** The white, hairline-bordered card every Q2 surface is built from. */
export function Q2Card({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-xl border border-q2-line bg-q2-surface shadow-q2-card dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * The match ring — the percentage inside a circular gauge, used in every applicant table.
 *
 * Drawn as an SVG donut rather than a conic-gradient div so the arc is crisp at every size
 * and the value is exposed to assistive tech as a progressbar. `pathLength={100}` lets the
 * dash array be written in percent directly, which keeps the arc independent of the radius.
 */
export function MatchRing({
  score,
  size = 40,
  className,
}: {
  score: number;
  size?: number;
  className?: string;
}) {
  const tone = matchTone(score);
  const stroke = size >= 56 ? 4 : 3;
  const r = (size - stroke) / 2;
  return (
    <span
      className={cn('relative inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="JD match"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-q2-chip dark:stroke-gray-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${Math.max(0, Math.min(100, score))} 100`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          className={cn('stroke-current transition-[stroke-dasharray]', tone.ring)}
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center font-display font-extrabold tabular-nums',
          tone.text,
        )}
        style={{ fontSize: size * 0.29 }}
      >
        {score}
        <span className="font-bold" style={{ fontSize: size * 0.2 }}>
          %
        </span>
      </span>
    </span>
  );
}

/** "Relevant" / "Not Relevant" — the pill beside a ranked applicant's name. */
export function RelevancePill({ relevant }: { relevant: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        relevant
          ? 'bg-q2-emerald-soft text-q2-emerald-ink'
          : 'bg-q2-red-soft text-q2-red',
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {relevant ? 'Relevant' : 'Not Relevant'}
    </span>
  );
}

/** The Status column's pill on All Applicants. */
export function StatusPill({ status }: { status: MatchReviewStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        STATUS_TONE[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}

/** The soft blue chips the job header and Job Description panel list attributes in. */
export function JobChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-md bg-q2-blue-soft px-2 py-1 text-xs font-medium text-q2-blue dark:bg-q2-blue/20">
      {children}
    </span>
  );
}

/** A skill tag. Green on the candidate side, blue on the job side, as the design has them. */
export function SkillTag({ tone = 'blue', children }: { tone?: 'blue' | 'green'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-1 text-xs font-medium',
        tone === 'green'
          ? 'bg-q2-emerald-soft text-q2-emerald-ink'
          : 'bg-q2-blue-soft text-q2-blue',
      )}
    >
      {children}
    </span>
  );
}

/** "Profile 100%" — green only at 100, amber otherwise, with the warning icon below it. */
export function ProfileBadge({ value }: { value: number }) {
  const complete = value >= 100;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', profileTone(value))}>
      {complete ? (
        <Check className="h-3 w-3" aria-hidden />
      ) : (
        <TriangleAlert className="h-3 w-3" aria-hidden />
      )}
      Profile {value}%
    </span>
  );
}

/** "CV available" / "CV missing". */
export function CvBadge({ available }: { available: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] font-medium',
        available ? 'text-q2-emerald-ink' : 'text-q2-amber',
      )}
    >
      {available ? <Check className="h-3 w-3" aria-hidden /> : <FileText className="h-3 w-3" aria-hidden />}
      {available ? 'CV available' : 'CV missing'}
    </span>
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
        'inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold',
        AVATAR_TONES[Math.abs(id) % AVATAR_TONES.length],
        className ?? 'h-9 w-9 text-xs',
      )}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

/** The company line under a job title, with the small building glyph the design uses. */
export function CompanyLine({ company, className }: { company: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs text-q2-muted', className)}>
      <Building2 className="h-3 w-3 shrink-0" aria-hidden />
      <span className="truncate">{company}</span>
    </span>
  );
}

/**
 * One row of the Candidate Scoring panel: the checkbox, the label, the bar, its weight and
 * the sub-score. The bar is a plain div rather than `<progress>` because the design fills it
 * with the criterion's own emerald wash and `<progress>` cannot be styled consistently.
 */
export function ScoreRow({
  label,
  score,
  weight,
  included,
  disabled,
  onToggle,
}: {
  label: string;
  score: number;
  weight: number;
  included: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  const id = `q2-crit-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div className="flex items-center gap-3">
      <input
        id={id}
        type="checkbox"
        checked={included}
        disabled={disabled}
        onChange={(e) => onToggle(e.target.checked)}
        className="h-4 w-4 shrink-0 cursor-pointer rounded border-q2-muted-light text-q2-emerald accent-q2-emerald focus:ring-2 focus:ring-q2-emerald/30 disabled:cursor-not-allowed"
      />
      <label
        htmlFor={id}
        className={cn(
          'w-32 shrink-0 cursor-pointer text-[13px] font-medium sm:w-36',
          included ? 'text-q2-ink dark:text-gray-100' : 'text-q2-ink-soft dark:text-gray-300',
        )}
      >
        {label}
      </label>
      <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-q2-chip dark:bg-gray-700">
        <div
          className={cn(
            'h-full rounded-full transition-[width]',
            included ? 'bg-q2-emerald' : 'bg-q2-emerald/45',
          )}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-medium text-q2-muted tabular-nums">
        {weightLabel(weight)}
      </span>
      <span
        className={cn(
          'w-8 shrink-0 text-right text-[13px] font-bold tabular-nums',
          included ? 'text-q2-ink dark:text-gray-100' : 'text-q2-ink-soft dark:text-gray-300',
        )}
      >
        {score}
      </span>
    </div>
  );
}

/** The ✓ Matched / ✕ Missing headings on Resume × JD Coverage. */
export function CoverageHeading({
  kind,
  count,
}: {
  kind: 'matched' | 'missing';
  count: number;
}) {
  const matched = kind === 'matched';
  return (
    <p
      className={cn(
        'flex items-center gap-1.5 text-xs font-semibold',
        matched ? 'text-q2-emerald-ink' : 'text-q2-red',
      )}
    >
      {matched ? <Check className="h-3.5 w-3.5" aria-hidden /> : <X className="h-3.5 w-3.5" aria-hidden />}
      {matched ? 'Matched' : 'Missing'} ({count})
    </p>
  );
}

/** A labelled value in the candidate / job detail grids. */
export function DetailField({
  icon: Icon,
  label,
  value,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  label: string;
  value?: React.ReactNode;
}) {
  const empty = value == null || value === '' || value === false;
  return (
    <div className="flex items-baseline gap-2">
      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 self-start text-q2-muted-light" />}
      <span className="w-24 shrink-0 text-[13px] text-q2-muted">{label}</span>
      <span
        className={cn(
          'min-w-0 break-words text-[13px] font-medium',
          empty ? 'text-q2-muted' : 'text-q2-ink dark:text-gray-100',
        )}
      >
        {empty ? '—' : value}
      </span>
    </div>
  );
}

/** A section label, as the design sets them: 11px, uppercase, tracked. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold uppercase tracking-wide text-q2-muted',
        className,
      )}
    >
      {children}
    </p>
  );
}
