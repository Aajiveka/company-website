import type { ApplicantDecision, ApplicantPipelineStatus } from '@/employer/services/employer.types';

export type DecisionConfirm = {
  title: string;
  description: string;
  confirmLabel: string;
  tone: 'primary' | 'danger';
};

/** Clicking Shortlist or Reject again on a candidate already in that status undoes it. */
export function isUndoDecision(decision: ApplicantDecision, status: ApplicantPipelineStatus | string) {
  return (decision === 'Shortlisted' || decision === 'Rejected') && status === decision;
}

/** Copy for pipeline action confirmations (list / profile / compare). */
export function decisionConfirm(
  decision: ApplicantDecision,
  candidateName?: string,
  undo = false,
): DecisionConfirm {
  const name = candidateName?.trim() || 'this candidate';
  if (undo) {
    const what = decision === 'Shortlisted' ? 'shortlist' : 'rejection';
    return {
      title: decision === 'Shortlisted' ? 'Undo shortlist?' : 'Undo rejection?',
      description: `Undo the ${what} of ${name}? They will go back to their previous status.`,
      confirmLabel: decision === 'Shortlisted' ? 'Undo shortlist' : 'Undo rejection',
      tone: 'primary',
    };
  }
  switch (decision) {
    case 'Shortlisted':
      return {
        title: 'Shortlist candidate?',
        description: `Shortlist ${name} at screening? You can schedule their interview next.`,
        confirmLabel: 'Shortlist',
        tone: 'primary',
      };
    case 'Hired':
      return {
        title: 'Hire without interview?',
        description: `Select ${name} directly, without an interview round? This is a final pipeline status.`,
        confirmLabel: 'Hire',
        tone: 'primary',
      };
    case 'Rejected':
      return {
        title: 'Reject candidate?',
        description: `Reject ${name} at screening? They will move to the Rejected list.`,
        confirmLabel: 'Reject',
        tone: 'danger',
      };
  }
}
