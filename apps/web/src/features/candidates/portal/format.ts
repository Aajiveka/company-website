import type { CvMasterOption } from '../candidate.types';

/** Shared display formatting for the portal. Kept together so dates read the same everywhere. */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Jan 2022" — returns null for empty/unparseable input so callers can fall back. */
export function monthYear(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "15 Jul 2024" */
export function longDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2 yrs 6 mos" between two dates; `to` empty means "now". */
export function duration(from: string | null | undefined, to: string | null | undefined): string | null {
  if (!from) return null;
  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return null;
  const end = to ? new Date(to) : new Date();
  if (Number.isNaN(end.getTime())) return null;

  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (months < 0) return null;
  const years = Math.floor(months / 12);
  months %= 12;

  const parts: string[] = [];
  if (years) parts.push(`${years} yr${years > 1 ? 's' : ''}`);
  if (months) parts.push(`${months} mo${months > 1 ? 's' : ''}`);
  return parts.join(' ') || '0 mos';
}

/** Rupees → "24 LPA". */
export function lpa(rupees: number | null | undefined): string | null {
  if (!rupees || rupees <= 0) return null;
  return `${(rupees / 100_000).toFixed(1).replace(/\.0$/, '')} LPA`;
}

/** Looks a master option's label up by id. */
export function labelOf(options: CvMasterOption[] | undefined, id: number | null | undefined): string | null {
  if (id == null) return null;
  return options?.find((o) => o.id === id)?.label ?? null;
}

/**
 * How one education entry is titled — the qualification, not the branch.
 *
 * Back when the masters held four education *levels* and eight courses, either column could
 * stand in for the other and the screens showed whichever was set. Now that they are the
 * qualification and the branch within it, only one of them is the headline: "B.Tech" is what an
 * employer scans a profile for, while "Computer Science and Engineering" on its own never says
 * what was actually awarded. The branch belongs on the detail line with the years and marks.
 */
export function educationTitle(
  degrees: CvMasterOption[] | undefined,
  courses: CvMasterOption[] | undefined,
  entry: { degreeId: number | null; courseTypeId: number | null },
): string {
  return labelOf(degrees, entry.degreeId) ?? labelOf(courses, entry.courseTypeId) ?? 'Qualification';
}

/** Joins the non-empty parts with a middle dot, the separator the design uses throughout. */
export function dotted(...parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' · ');
}

/** Relative "Updated 2 hours ago" wording for tracker/activity rows. */
export function relativeTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} minute${mins > 1 ? 's' : ''} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months > 1 ? 's' : ''} ago`;
  const years = Math.round(months / 12);
  return `${years} year${years > 1 ? 's' : ''} ago`;
}

/** Deterministic tile colour for a company/institution avatar, so a given name always matches. */
const AVATAR_TONES = [
  'bg-aj-blue',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-orange-500',
  'bg-rose-500',
  'bg-sky-600',
  'bg-indigo-600',
];

export function avatarTone(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/** "2014 – 2018", or just the end year when only that is known. */
export function years(start: number | null | undefined, end: number | null | undefined): string | null {
  if (start && end) return `${start} – ${end}`;
  return start ? `${start} – Present` : end ? String(end) : null;
}
