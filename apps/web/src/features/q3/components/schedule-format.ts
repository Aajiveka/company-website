import { fmtDay, fmtTime, fmtWeekday, isSameDay } from '../q3.format';

/**
 * Slot and interview time wording shared by Slot Scheduling and Interviews, kept apart from
 * the component files so they export components only (fast refresh).
 */

/** "Thu, 02 Oct" — a slot card's day line. */
export const slotDay = (iso: string) => fmtWeekday(iso).replace(' ', ', ');

/** "3:30 – 4:15 PM", or "11:30 AM – 12:15 PM" when the slot crosses noon. */
export function slotRange(iso: string, mins: number) {
  const start = fmtTime(iso);
  const end = fmtTime(new Date(new Date(iso).getTime() + mins * 60_000));
  return start.slice(-2) === end.slice(-2) ? `${start.slice(0, -3)} – ${end}` : `${start} – ${end}`;
}

/** "Today, 9:00 AM" for today, else "30 Sep, 6:10 PM" — checklist and log timestamps. */
export function whenLabel(iso: string) {
  const at = new Date(iso);
  if (isSameDay(at, new Date())) return `Today, ${fmtTime(at)}`;
  return `${fmtDay(at)}, ${fmtTime(at)}`;
}
