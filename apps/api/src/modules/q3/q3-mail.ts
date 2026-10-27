/**
 * Date formatting for Q3's mails, in IST explicitly — the API container runs in UTC, and a
 * candidate told "3:30 PM" must not turn up at 9 PM. Screens format in the browser instead.
 */
const IST = 'Asia/Kolkata';

/** "Thu, 02 Oct 2026 · 3:30 PM IST" */
export function mailDateTime(d: Date) {
  const date = new Intl.DateTimeFormat('en-GB', {
    timeZone: IST,
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
  return `${date} · ${mailTime(d)} IST`;
}

/** "3:30 PM" */
export function mailTime(d: Date) {
  return new Intl.DateTimeFormat('en-US', { timeZone: IST, hour: 'numeric', minute: '2-digit' }).format(d);
}

/** "Thu, 02 Oct" */
export function mailDate(d: Date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: IST, weekday: 'short', day: '2-digit', month: 'short' }).format(d);
}

/** "rahul.sharma@•••••.com" — the Record decision modal's recipient line. */
export function maskEmail(email: string) {
  const at = email.indexOf('@');
  if (at < 1) return email;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf('.');
  return `${email.slice(0, at)}@•••••${dot >= 0 ? domain.slice(dot) : ''}`;
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
