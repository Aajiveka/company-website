import type { ApplicantDecision } from '@/employer/services/employer.types';

export type DecisionConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
};

/** Copy for pipeline action confirmations (list / profile / compare). */
export function decisionConfirm(decision: ApplicantDecision, candidateName?: string): DecisionConfirm {
  const name = candidateName?.trim() || 'this candidate';
  switch (decision) {
    case 'Shortlisted':
      return {
        title: 'Shortlist candidate?',
        description: `Move ${name} to Shortlisted? You can change their status later.`,
        confirmLabel: 'Shortlist',
        tone: 'primary',
      };
    case 'Interview':
      return {
        title: 'Mark for interview?',
        description: `Mark ${name} as Interview? This updates their pipeline status.`,
        confirmLabel: 'Mark interview',
        tone: 'primary',
      };
    case 'Hired':
      return {
        title: 'Hire candidate?',
        description: `Mark ${name} as Hired? This is a final pipeline status.`,
        confirmLabel: 'Hire',
        tone: 'primary',
      };
    case 'Rejected':
      return {
        title: 'Reject candidate?',
        description: `Reject ${name}? They will move to the Rejected list.`,
        confirmLabel: 'Reject',
        tone: 'danger',
      };
  }
}
