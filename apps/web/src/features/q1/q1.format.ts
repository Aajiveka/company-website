/**
 * Q1 label + formatting helpers.
 *
 * Separate from `components/primitives.tsx` so that file exports only components — mixing
 * the two trips the repo's `react-refresh/only-export-components` rule, which lint runs at
 * `--max-warnings 0`.
 */
import type { ScreeningStatus } from './q1.types';

/** Human labels for the stored status values. */
export const STATUS_LABEL: Record<ScreeningStatus, string> = {
  New: 'New',
  Screening: 'Screening',
  Incomplete: 'Incomplete',
  FollowUp: 'Follow-up',
  NoResponse: 'No Response',
  Verified: 'Verified',
  NotInterested: 'Not Interested',
};

export const STATUS_TONE: Record<ScreeningStatus, string> = {
  New: 'bg-q1-blue-soft text-q1-blue',
  Screening: 'bg-q1-chip text-q1-slate',
  Incomplete: 'bg-q1-amber-soft text-q1-amber',
  FollowUp: 'bg-q1-amber-soft text-q1-amber',
  NoResponse: 'bg-q1-chip text-q1-slate',
  Verified: 'bg-q1-green-soft text-q1-green',
  NotInterested: 'bg-q1-red-soft text-q1-red',
};

export const PRIORITY_TONE: Record<'High' | 'Medium' | 'Low', string> = {
  High: 'text-q1-red',
  Medium: 'text-q1-amber',
  Low: 'text-q1-muted',
};

/** Deterministic tint for an initials avatar, so a candidate keeps the same colour. */
export const AVATAR_TONES = [
  'bg-q1-blue-soft text-q1-blue',
  'bg-q1-green-soft text-q1-green',
  'bg-q1-amber-soft text-q1-amber',
  'bg-q1-violet-soft text-q1-violet',
  'bg-q1-red-soft text-q1-red',
];

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

/** yrs / mos formatting used by the queue and the profile hero. */
export function experienceLabel(years: number | null): string {
  if (years == null || years <= 0) return 'Fresher';
  return `${years} ${years === 1 ? 'yr' : 'yrs'}`;
}

/**
 * "02 Sep, 10:30 AM" — the Received column's format.
 *
 * The month comes from a fixed table rather than `toLocaleDateString('en-GB', { month: 'short' })`,
 * which renders September as "Sept" on current ICU builds and "Sep" on older ones. The design
 * says "Sep", and a column that changes shape with the runtime's ICU version is not worth the
 * one line it saves.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function receivedLabel(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const hours = d.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = String(hours % 12 || 12).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day} ${MONTHS[d.getMonth()]}, ${hour12}:${minutes} ${suffix}`;
}

/** "1h 24m" — the Avg. screening time KPI. */
export function durationLabel(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

/** "Good morning/afternoon/evening, Q1" — the greeting the dashboard opens with. */
export function greeting(t: (k: string) => string, now = new Date()): string {
  const h = now.getHours();
  if (h < 12) return t('q1.greeting.morning');
  if (h < 17) return t('q1.greeting.afternoon');
  return t('q1.greeting.evening');
}
