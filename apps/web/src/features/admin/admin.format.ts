import type { PipelineStage } from './admin.types';
import type { PillTone } from './components/primitives';

export const STAGE_TONE: Record<PipelineStage, PillTone> = {
  Screening: 'blue',
  WithQ3: 'violet',
  CompanyReview: 'amber',
  Interview: 'violet',
  Selection: 'green',
  Joined: 'green',
  Closed: 'gray',
};

export const JOB_TONE: Record<string, PillTone> = { Active: 'green', Closed: 'gray', Archived: 'gray', Draft: 'amber' };

/* ─── Formatting ────────────────────────────────────────────────────── */

export function fmtDate(iso: string | null | undefined, withTime = false) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return d < 30 ? `${d}d ago` : fmtDate(iso);
}

export function fmtInr(n: number) {
  return `₹${n.toLocaleString('en-IN')}`;
}

/** CTC is stored in rupees per year; shown in lakhs the way the job pages show it. */
export function fmtCtc(min: number, max: number) {
  const l = (n: number) => `${(n / 100_000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;
  if (!min && !max) return '—';
  return min === max || !max ? l(min) : `${l(min)} – ${l(max)}`;
}

/**
 * Audit actions are machine names ("q3.round_decision"). The known ones get a sentence;
 * anything new still reads sensibly through the generic fallback rather than as raw text.
 */
const ACTION_LABEL: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.logout': 'Signed out',
  'register.verified': 'Completed registration',
  'register.otp_sent': 'Requested a sign-up code',
  'password.reset_requested': 'Requested a password reset',
  'password.reset_completed': 'Set a new password',
  'admin.user_created': 'Created a staff account',
  'admin.user_updated': 'Updated an account',
  'admin.users_bulk_updated': 'Updated several accounts',
  'admin.users_bulk_deleted': 'Deactivated several accounts',
  'admin.password_reset_sent': 'Sent a password reset link',
  'admin.job_closed': 'Closed a job',
  'admin.job_reopened': 'Reopened a job',
  'admin.employer_reviewed': 'Reviewed an employer registration',
  'admin.settings_updated': 'Changed platform settings',
  'admin.blog_post_created': 'Created a blog post',
  'admin.blog_post_updated': 'Edited a blog post',
  'admin.blog_post_deleted': 'Deleted a blog post',
  'job.applied': 'Applied to a job',
  'job.status': 'Changed a job’s status',
  'candidate.decision': 'Recorded a candidate decision',
  'q1.candidate_verified': 'Verified a candidate (Q1)',
  'q1.status_updated': 'Updated screening status (Q1)',
  'q1.candidate_contacted': 'Logged a candidate contact (Q1)',
  'q2.forwarded_to_q3': 'Forwarded an application to Q3',
  'q2.sent_back_to_q1': 'Sent an application back to Q1',
  'q2.rejected': 'Rejected an application (Q2)',
  'cv.referred_to_q3': 'Referred a CV to Q3',
  'cv.forwarded_to_company': 'Sent a CV to the company',
  'cv.returned_to_q2': 'Returned a CV to Q2',
  'applicant.decision': 'Employer decided on an applicant',
  'interview.scheduled': 'Scheduled an interview',
  'interview.round_created': 'Created an interview round',
  'q3.interview_confirmed': 'Confirmed an interview',
  'q3.interview_rescheduled': 'Rescheduled an interview',
  'q3.interview_conducted': 'Marked an interview conducted',
  'q3.round_decision': 'Recorded a round decision',
  'q3.joined': 'Marked a candidate joined',
  'offer.created': 'Drafted an offer',
  'offer.sent': 'Sent an offer',
  'interview.round_result': 'Recorded a round result',
  'q3.docs_approved': 'Approved hiring documents',
  'job.deleted': 'Archived a job',
  'candidate.resume_uploaded': 'Uploaded a résumé',
  'offer.accepted': 'Offer accepted',
  'offer.rejected': 'Offer declined',
  'payment.succeeded': 'Payment succeeded',
  'payment.failed': 'Payment failed',
};

export function actionLabel(action: string) {
  if (ACTION_LABEL[action]) return ACTION_LABEL[action];
  const [scope, verb = ''] = action.split('.');
  const words = verb.replace(/_/g, ' ');
  return `${words.charAt(0).toUpperCase()}${words.slice(1)}${scope ? ` (${scope})` : ''}`;
}

/** Where an audited entity can be opened in the panel, when it has a page of its own. */
export function entityHref(entity: string | null, entityId: string | null): string | null {
  if (!entity || !entityId || entityId === '0') return null;
  switch (entity) {
    case 'SecUser':
      return `/admin/users/${entityId}`;
    case 'ClientJobs':
      return `/admin/jobs/${entityId}`;
    case 'JobSubscriberMapping':
      return `/admin/applications/${entityId}`;
    default:
      return null;
  }
}
