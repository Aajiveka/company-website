import { cn } from '@/lib/cn';

export type BadgeTone = 'gray' | 'blue' | 'green' | 'amber' | 'red' | 'purple';

const tones: Record<BadgeTone, string> = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  purple: 'bg-purple-50 text-purple-700',
};

/** Small status pill. Map domain statuses to a tone via `statusTone`. */
export function Badge({ tone = 'gray', children }: { tone?: BadgeTone; children: React.ReactNode }) {
  return (
    <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  );
}

/** Shared status → tone mapping used across dashboards. */
// eslint-disable-next-line react-refresh/only-export-components
export function statusTone(status: string): BadgeTone {
  const map: Record<string, BadgeTone> = {
    Applied: 'blue',
    Shortlisted: 'amber',
    Interview: 'purple',
    Rejected: 'red',
    Selected: 'green',
    Verified: 'green',
    Uploaded: 'blue',
    Pending: 'amber',
    // A job is Active or Closed — spClientGetJoblisting derives exactly those two from
    // tblClientJobs.StatusID. "Open" was a mock invention.
    Active: 'green',
    Approved: 'green',
    Closed: 'gray',
  };
  return map[status] ?? 'gray';
}
