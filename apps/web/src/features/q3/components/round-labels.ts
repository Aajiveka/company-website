import type { Q3Round, RoundDecision } from '../q3.types';
import type { Tone } from '../q3.format';

/**
 * Round wording shared by Interview Rounds and the Record decision modal, kept apart from the
 * component files so they export components only (fast refresh).
 */

/** "Round 3" / "Final Round" — how the stepper and the modal name a round. */
export const roundTitle = (r: Pick<Q3Round, 'isFinal' | 'roundNumber'>) =>
  r.isFinal ? 'Final Round' : `Round ${r.roundNumber}`;

/** A decision that moved the candidate on — the stepper's green "Cleared" card. */
export const isPassed = (d: RoundDecision | null) => d === 'NextRound' || d === 'FinalRound' || d === 'Selected';

/** The status pill on a Round history card. */
export function roundPill(r: Q3Round): { label: string; tone: Tone } {
  switch (r.decision) {
    case 'NextRound':
    case 'FinalRound':
      return { label: 'Cleared', tone: 'green' };
    case 'Selected':
      return { label: 'Selected', tone: 'green' };
    case 'Hold':
      return { label: 'On hold', tone: 'gray' };
    case 'Rejected':
      return { label: 'Not selected', tone: 'red' };
  }
  switch (r.status) {
    case 'Completed':
      return { label: 'Awaiting result', tone: 'amber' };
    case 'Scheduled':
      return { label: 'Scheduled', tone: 'blue' };
    case 'Pending':
      return { label: 'Awaiting slots', tone: 'violet' };
    case 'NoShow':
      return { label: 'No-show', tone: 'red' };
    case 'RescheduleRequested':
      return { label: 'Reschedule asked', tone: 'violet' };
    case 'Cancelled':
      return { label: 'Cancelled', tone: 'gray' };
  }
}

/** What the candidate's mail for a decision is called — "Congratulations mail (Round cleared)". */
export const DECISION_MAIL: Record<RoundDecision, string> = {
  NextRound: 'Congratulations mail (Round cleared)',
  FinalRound: 'Congratulations mail (Final round)',
  Hold: 'Hold mail',
  Rejected: 'Rejection mail',
  Selected: 'Selection mail',
};
