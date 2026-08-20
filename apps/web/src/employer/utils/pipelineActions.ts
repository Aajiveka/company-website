import { cn } from '@/lib/cn';
import type { ApplicantDecision, ApplicantPipelineStatus } from '@/employer/services/employer.types';

export function applicantStatusTone(
  status: ApplicantPipelineStatus | string,
): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'Hired') return 'success';
  if (status === 'Shortlisted') return 'primary';
  if (status === 'Interview') return 'warning';
  if (status === 'Rejected') return 'danger';
  return 'neutral';
}

/** Idle / active classes for pipeline action controls (list icons + profile buttons). */
const ACTION_STYLES: Record<
  ApplicantDecision,
  { idle: string; active: string }
> = {
  Shortlisted: {
    idle: 'text-slate-500 hover:bg-[#EBF2FF] hover:text-[#1A56DB]',
    active: 'bg-[#EBF2FF] text-[#1A56DB]',
  },
  Interview: {
    idle: 'text-slate-500 hover:bg-amber-50 hover:text-amber-600',
    active: 'bg-amber-50 text-amber-700',
  },
  Hired: {
    idle: 'text-slate-500 hover:bg-emerald-50 hover:text-emerald-700',
    active: 'bg-emerald-50 text-emerald-700',
  },
  Rejected: {
    idle: 'text-slate-500 hover:bg-rose-50 hover:text-rose-600',
    active: 'bg-rose-50 text-rose-600',
  },
};

export function isPipelineActionActive(
  action: ApplicantDecision,
  status: ApplicantPipelineStatus | string,
) {
  return status === action;
}

export function pipelineIconButtonClass(
  action: ApplicantDecision,
  status: ApplicantPipelineStatus | string,
) {
  const on = isPipelineActionActive(action, status);
  return cn('rounded-lg p-1.5 disabled:opacity-40', on ? ACTION_STYLES[action].active : ACTION_STYLES[action].idle);
}

export function pipelineActionButtonClass(
  action: ApplicantDecision,
  status: ApplicantPipelineStatus | string,
) {
  const on = isPipelineActionActive(action, status);
  if (!on) return undefined;
  if (action === 'Shortlisted') return '!border-[#1A56DB] !bg-[#EBF2FF] !text-[#1A56DB]';
  if (action === 'Interview') return '!border-amber-300 !bg-amber-50 !text-amber-800';
  if (action === 'Hired') return '!bg-emerald-600 hover:!bg-emerald-700';
  return '!border-rose-300 !bg-rose-50 !text-rose-700';
}

export function pipelineIconClass(
  action: ApplicantDecision,
  status: ApplicantPipelineStatus | string,
  size = 'h-4 w-4',
) {
  return cn(size, isPipelineActionActive(action, status) && 'fill-current');
}
