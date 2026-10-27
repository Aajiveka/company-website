import type { HiringStage, NextDue, PipelineRow } from './q3.types';

/**
 * Presentation helpers for the Q3 workspace. Dates are formatted in the browser's own clock —
 * the API sends ISO instants precisely so "Today, 3:00 PM" means the coordinator's today.
 */

export type Tone = 'blue' | 'violet' | 'amber' | 'green' | 'red' | 'gray';

/** Pill background + ink per tone, read off the Figma badges. */
export const TONE_PILL: Record<Tone, string> = {
  blue: 'bg-q3-blue-soft text-q3-blue',
  violet: 'bg-q3-violet-soft text-q3-violet',
  amber: 'bg-q3-amber-soft text-q3-amber',
  green: 'bg-q3-green-soft text-q3-green',
  red: 'bg-q3-red-soft text-q3-red',
  gray: 'bg-q3-chip text-q3-muted',
};

/** Text colour for a NEXT DUE primary line or a KPI badge. */
export const TONE_TEXT: Record<Tone, string> = {
  blue: 'text-q3-blue',
  violet: 'text-q3-violet',
  amber: 'text-q3-amber',
  green: 'text-q3-green',
  red: 'text-q3-red',
  gray: 'text-q3-ink',
};

/** The avatar palette the designs rotate through (green, blue, violet, amber, red). */
const AVATAR: Tone[] = ['green', 'blue', 'violet', 'amber', 'red'];

/** Stable per name, so one person has one colour on every screen. */
export function avatarTone(name: string): Tone {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR[h % AVATAR.length];
}

export function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return ((parts[0][0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// ── Dates ──────────────────────────────────────────────────────────────

const d = (iso: string | Date) => (iso instanceof Date ? iso : new Date(iso));

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const pad2 = (n: number) => String(n).padStart(2, '0');

/**
 * "30 Sep". Month names are spelled out here rather than taken from Intl: current ICU data
 * abbreviates September as "Sept" in en-GB, and the designs write "Sep".
 */
export const fmtDay = (iso: string | Date) => {
  const x = d(iso);
  return `${pad2(x.getDate())} ${MONTHS[x.getMonth()]}`;
};

/** "3:00 PM" */
export const fmtTime = (iso: string | Date) =>
  d(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/** "30 Sep, 11:40 AM" */
export const fmtDayTime = (iso: string | Date) => `${fmtDay(iso)}, ${fmtTime(iso)}`;

/** "Thu 02 Oct" */
export const fmtWeekday = (iso: string | Date) => `${WEEKDAYS[d(iso).getDay()]} ${fmtDay(iso)}`;

/** "Thu, 02 Oct 2026" */
export const fmtLongDay = (iso: string | Date) => `${WEEKDAYS[d(iso).getDay()]}, ${fmtDay(iso)} ${d(iso).getFullYear()}`;

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Today" / "Tomorrow" / "Yesterday" / "Thu 02 Oct" */
export function relativeDay(iso: string | Date, now = new Date()) {
  const x = d(iso);
  const day = 86_400_000;
  if (isSameDay(x, now)) return 'Today';
  if (isSameDay(x, new Date(now.getTime() + day))) return 'Tomorrow';
  if (isSameDay(x, new Date(now.getTime() - day))) return 'Yesterday';
  return fmtWeekday(x);
}

/** "Today, 3:00 PM" */
export const relativeDayTime = (iso: string | Date) => `${relativeDay(iso)}, ${fmtTime(iso)}`;

/** "Sent today, 4:40 PM" style: "today, 4:40 PM" or "30 Sep, 9:00 AM". */
export function sentAt(iso: string) {
  return isSameDay(d(iso), new Date()) ? `today, ${fmtTime(iso)}` : fmtDayTime(iso);
}

/** Minutes until `iso` (negative once passed). */
export const minutesUntil = (iso: string, now = Date.now()) => Math.round((d(iso).getTime() - now) / 60_000);

/** "in 45 min", "in 2 h", "now" */
export function inLabel(iso: string) {
  const m = minutesUntil(iso);
  if (m <= 0) return 'now';
  if (m < 60) return `in ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `in ${h} h` : `in ${Math.round(h / 24)} d`;
}

/** YYYY-MM-DD in local time. */
export function isoDate(x: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
}

// ── Misc ───────────────────────────────────────────────────────────────

/** "1.2 MB", "640 KB" */
export function fmtSize(bytes: number | null | undefined) {
  if (bytes == null) return '';
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "10 yrs", "Fresher", or '' when unknown. */
export function expLabel(totalExp: number | null | undefined) {
  if (totalExp == null) return '';
  if (totalExp === 0) return 'Fresher';
  return `${totalExp} yr${totalExp === 1 ? '' : 's'}`;
}

/** The meeting provider a link belongs to — "Virtual · Google Meet". */
export function linkHost(url: string | null | undefined) {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('meet.google')) return 'Google Meet';
    if (host.includes('teams.')) return 'Microsoft Teams';
    if (host.includes('zoom.')) return 'Zoom';
    if (host.includes('jit.si')) return 'Jitsi Meet';
    return host;
  } catch {
    return null;
  }
}

/** A link without the scheme, as the designs print it: "meet.google.com/xpa-rmqk-tdv". */
export const bareLink = (url: string) => url.replace(/^https?:\/\//i, '').replace(/\/$/, '');

/** Join non-empty parts with the designs' " · ". */
export const dot = (...parts: Array<string | null | undefined | false>) => parts.filter(Boolean).join(' · ');

// ── Stages ─────────────────────────────────────────────────────────────

export const STAGE_TABS: Array<{ key: PipelineRow['stage'] | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'Referred', label: 'Referred' },
  { key: 'CompanyReview', label: 'Company Review' },
  { key: 'Scheduling', label: 'Scheduling' },
  { key: 'Interview', label: 'Interview' },
  { key: 'Decision', label: 'Decision' },
  { key: 'Documents', label: 'Documents' },
  { key: 'Offer', label: 'Offer' },
];

/** The STAGE pill on the Candidate Pipeline. */
export function stagePill(stage: HiringStage, detail: PipelineRow['stageDetail']): { label: string; tone: Tone } {
  switch (stage) {
    case 'Referred':
      return { label: 'Referred', tone: 'blue' };
    case 'CompanyReview':
      return { label: 'Company Review', tone: 'amber' };
    case 'Scheduling':
      return { label: 'Scheduling', tone: 'violet' };
    case 'Interview':
      return { label: 'Interview', tone: 'blue' };
    case 'Decision':
      return detail === 'OnHold' ? { label: 'On hold', tone: 'gray' } : { label: 'Awaiting result', tone: 'amber' };
    case 'Documents':
      return { label: 'Documents', tone: 'blue' };
    case 'Offer':
      return detail === 'OfferAccepted' ? { label: 'Offer accepted', tone: 'green' } : { label: 'Offer', tone: 'green' };
    case 'Returned':
      return { label: 'Returned to Q2', tone: 'red' };
    case 'Closed':
      return detail === 'Joined' ? { label: 'Joined', tone: 'green' } : { label: 'Closed', tone: 'gray' };
  }
}

/** Where a pipeline row opens — the screen for its stage. */
export function stageHref(stage: HiringStage, mapId: number) {
  switch (stage) {
    case 'Referred':
      return '/q3/referred';
    case 'CompanyReview':
      return `/q3/company-review?mapId=${mapId}`;
    case 'Scheduling':
      return `/q3/scheduling/${mapId}`;
    case 'Interview':
      return '/q3/interviews';
    case 'Decision':
      return `/q3/decisions/${mapId}`;
    case 'Documents':
      return `/q3/documents/${mapId}`;
    case 'Offer':
    case 'Closed':
      return `/q3/offers/${mapId}`;
    case 'Returned':
      return '/q3/returned';
  }
}

/** The NEXT DUE column's two lines. */
export function nextDueLines(n: NextDue): { primary: string; secondary: string; tone: Tone } {
  const plural = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;
  switch (n.kind) {
    case 'awaitingValidation':
      return { primary: 'Awaiting validation', secondary: `Referred ${fmtDay(n.at)}`, tone: 'gray' };
    case 'reviewDay':
      return {
        primary: `Day ${n.day} of 14`,
        secondary: n.expiresAt ? `Auto-expires ${fmtDay(n.expiresAt)}` : plural(n.daysLeft, 'day') + ' left',
        tone: n.daysLeft <= 2 ? 'red' : 'amber',
      };
    case 'slotsAwaited':
      return { primary: 'Slots awaited', secondary: n.since ? `Since ${fmtDay(n.since)}` : 'From the company', tone: 'amber' };
    case 'slotPending':
      return { primary: 'Slot pending', secondary: n.attempts ? `Contacted ${n.attempts}×` : 'Not contacted yet', tone: 'amber' };
    case 'noShow':
      return { primary: 'No-show', secondary: 'Reschedule needed', tone: 'red' };
    case 'rescheduleAsked':
      return { primary: 'Reschedule asked', secondary: 'Needs new slots', tone: 'violet' };
    case 'interviewAt':
      return {
        primary: n.at ? relativeDayTime(n.at) : 'Scheduled',
        secondary: dot(n.mode, linkHost(n.link)),
        tone: 'gray',
      };
    case 'resultOverdue':
      return { primary: `Overdue ${plural(n.days, 'day')}`, secondary: 'Nudge company', tone: 'red' };
    case 'resultDue':
      return { primary: n.at ? `Result due ${fmtDay(n.at)}` : 'Awaiting result', secondary: 'Awaiting company', tone: 'gray' };
    case 'onHold':
      return { primary: 'On hold', secondary: n.since ? `Since ${fmtDay(n.since)}` : 'Company decision', tone: 'gray' };
    case 'docsMissing':
      return {
        primary: `${plural(n.count, 'doc')} missing`,
        secondary: n.requestedAt
          ? isSameDay(new Date(n.requestedAt), new Date())
            ? 'Re-requested today'
            : `Requested ${fmtDay(n.requestedAt)}`
          : 'Requested',
        tone: 'amber',
      };
    case 'docsToVerify':
      return { primary: `${n.count} to verify`, secondary: 'Uploaded by candidate', tone: 'blue' };
    case 'docsWithCompany':
      return n.at
        ? { primary: 'With company', secondary: `Forwarded ${fmtDay(n.at)}`, tone: 'gray' }
        : { primary: 'Ready to forward', secondary: 'All verified', tone: 'blue' };
    case 'generateOffer':
      return { primary: 'Generate offer', secondary: 'Docs approved', tone: 'blue' };
    case 'offerSent':
      return { primary: 'Offer sent', secondary: n.at ? `Sent ${fmtDay(n.at)}` : 'Awaiting response', tone: 'gray' };
    case 'joins':
      return { primary: n.at ? `Joins ${fmtDay(n.at)}` : 'Offer accepted', secondary: 'Joining process', tone: 'gray' };
    case 'joined':
      return { primary: 'Joined', secondary: n.at ? fmtDay(n.at) : '', tone: 'green' };
    case 'expired':
      return { primary: 'Expired Day 14', secondary: 'Status sent to Q2', tone: 'gray' };
    case 'returned':
      return { primary: n.at ? `Returned ${fmtDay(n.at)}` : 'Returned', secondary: n.reason ?? 'To Q2', tone: 'gray' };
    case 'rejected':
      return { primary: 'Closed', secondary: 'Not selected', tone: 'gray' };
  }
}
