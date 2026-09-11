/**
 * Q2 label + formatting helpers.
 *
 * Separate from `components/primitives.tsx` so that file exports only components — mixing the
 * two trips the repo's `react-refresh/only-export-components` rule, which lint runs at
 * `--max-warnings 0`.
 */
import type { MatchReviewStatus } from './q2.types';

export const STATUS_LABEL: Record<MatchReviewStatus, string> = {
  New: 'New',
  Forwarded: 'Forwarded to Q3',
  SentBackToQ1: 'Sent back to Q1',
  Rejected: 'Rejected',
};

export const STATUS_TONE: Record<MatchReviewStatus, string> = {
  New: 'bg-q2-blue-soft text-q2-blue',
  Forwarded: 'bg-q2-emerald-soft text-q2-emerald-ink',
  SentBackToQ1: 'bg-q2-amber-soft text-q2-amber',
  Rejected: 'bg-q2-red-soft text-q2-red',
};

/**
 * The match ring's colour bands, read off the All Applicants frame: 95/94/94/92 draw green,
 * 75/72/69 blue, 51/50 amber and 43 red. So the steps are 90, 60 (the relevance cut) and 50.
 */
export function matchTone(score: number): { ring: string; text: string } {
  if (score >= 90) return { ring: 'text-q2-emerald', text: 'text-q2-emerald-ink' };
  if (score >= 60) return { ring: 'text-q2-blue', text: 'text-q2-blue' };
  if (score >= 50) return { ring: 'text-q2-amber', text: 'text-q2-amber' };
  return { ring: 'text-q2-red', text: 'text-q2-red' };
}

/**
 * The Profile column's tone. Only 100% prints green in the designs — 90%, 82% and everything
 * below render amber — so this is a two-state scale, not the ring's four.
 */
export function profileTone(value: number): string {
  return value >= 100 ? 'text-q2-emerald-ink' : 'text-q2-amber';
}

/** The Top Match column is green above the relevance cut and muted below it. */
export function topMatchTone(score: number): string {
  return score >= 60 ? 'text-q2-emerald-ink' : 'text-q2-muted';
}

/** Deterministic tint for an initials avatar, so a candidate keeps the same colour. */
export const AVATAR_TONES = [
  'bg-q2-amber-soft text-q2-amber',
  'bg-q2-emerald-soft text-q2-emerald-ink',
  'bg-q2-blue-soft text-q2-blue',
  'bg-q2-red-soft text-q2-red',
  'bg-q2-chip-cool text-q2-ink-slate',
];

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** "6 – 10 yrs" — the Experience column, with the design's en dash and spacing. */
export function expRangeLabel(min: number | null, max: number | null): string {
  if (min == null && max == null) return '—';
  if (min != null && max != null) return `${min} – ${max} yrs`;
  const only = min ?? max;
  return `${only} yrs`;
}

/** "10 yrs" / "Fresher" — a candidate's own experience. */
export function experienceLabel(years: number | null): string {
  if (years == null || years <= 0) return 'Fresher';
  return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
}

/**
 * "₹24 – 32 LPA".
 *
 * CTC is stored in rupees, and the design writes lakhs per annum with the unit stated once at
 * the end. A range whose two ends round to the same lakh collapses to "₹24 LPA" rather than
 * printing "₹24 – 24 LPA".
 */
export function ctcLabel(minCTC: number, maxCTC: number): string {
  if (!minCTC && !maxCTC) return '—';
  const lakh = (n: number) => {
    const l = n / 100_000;
    return Number.isInteger(l) ? String(l) : l.toFixed(1);
  };
  const lo = lakh(minCTC);
  const hi = lakh(maxCTC);
  if (!minCTC || lo === hi) return `₹${hi} LPA`;
  if (!maxCTC) return `₹${lo} LPA`;
  return `₹${lo} – ${hi} LPA`;
}

/** "30 days" — notice period. */
export function noticeLabel(days: number | null): string {
  if (days == null) return '—';
  if (days === 0) return 'Immediate';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}

/**
 * "28 Aug 2026" — the Posted On row.
 *
 * The month comes from a fixed table for the same reason Q1's does: `toLocaleDateString`
 * renders September as "Sept" on current ICU builds and "Sep" on older ones, and the design
 * says "Aug"/"Sep".
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function postedOnLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "w 30%" — the weight chip beside each scoring criterion. */
export function weightLabel(weight: number): string {
  return `w ${Math.round(weight * 100)}%`;
}

/**
 * "240 KB" — the resume card's file size.
 *
 * KB and MB in the decimal sense the design's "240 KB" implies, and the unit the file is
 * naturally described in: a CV is KB, so MB only appears above 1 MB.
 */
export function fileSizeLabel(bytes: number | null): string | null {
  if (bytes == null || bytes < 0) return null;
  if (bytes < 1000) return `${bytes} B`;
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

/**
 * "Click to preview · 2 pages · 240 KB".
 *
 * The design shows all three parts, but page count and size are unknown for a CV uploaded
 * before those columns existed and whose backfill has not run or could not read the object.
 * Each part is dropped independently rather than the line collapsing to a placeholder, so the
 * card degrades to "Click to preview · 240 KB" or just "Click to preview".
 */
export function resumeMetaLabel(
  prefix: string,
  pageCount: number | null,
  sizeBytes: number | null,
): string {
  const pages = pageCount == null ? null : `${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`;
  const size = fileSizeLabel(sizeBytes);
  return [prefix, pages, size].filter(Boolean).join(' · ');
}
