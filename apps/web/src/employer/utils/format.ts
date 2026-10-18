/**
 * Employer date + salary labels, matching the Q1/Q2 panels ("28 Aug 2026").
 *
 * The month comes from a fixed table for the same reason Q1/Q2 use one: `toLocaleDateString`
 * renders September as "Sept" on current ICU builds and "Sep" on older ones.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * A bare "YYYY-MM-DD" is a calendar date; `new Date()` would read it as UTC midnight and
 * show the previous day west of Greenwich.
 */
function parse(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = ymd ? new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "28 Aug 2026" */
export function dateLabel(value: string | Date | null | undefined): string {
  const d = parse(value);
  if (!d) return '—';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** "2 Sep 2026, 10:30 AM" */
export function dateTimeLabel(value: string | Date | null | undefined): string {
  const d = parse(value);
  if (!d) return '—';
  const hours = d.getHours();
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const hour12 = String(hours % 12 || 12).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${dateLabel(d)}, ${hour12}:${minutes} ${suffix}`;
}

/** "6 - 12 Lacs" — CTC is stored in rupees. */
export function ctcLacsLabel(minCtc: number, maxCtc: number): string {
  const lakhs = (rupees: number) => Number((rupees / 100_000).toFixed(2));
  return `${lakhs(minCtc)} - ${lakhs(maxCtc)} Lacs`;
}
