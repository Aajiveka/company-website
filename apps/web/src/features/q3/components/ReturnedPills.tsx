import { Pill } from './primitives';
import type { Tone } from '../q3.format';
import type { Q2ReturnState } from '../q3.types';

/**
 * The two pills of "07 · Returned to Q2", shared by the table and the View mail modal so a
 * reason or Q2 state reads the same in both places.
 */

/** Red when Q2 has something to supply (CV, profile), grey for a judgement call, amber for expiry. */
export function ReturnReasonPill({ reason, expired }: { reason: string; expired?: boolean }) {
  if (expired || reason === 'Auto-expired') return <Pill tone="amber">Auto-expired · Day 14</Pill>;
  const tone: Tone = reason === 'CV missing' || reason === 'Incomplete profile' ? 'red' : 'gray';
  return <Pill tone={tone}>{reason}</Pill>;
}

const Q2_STATE: Record<Q2ReturnState, { label: string; tone: Tone }> = {
  Awaiting: { label: 'Awaiting', tone: 'blue' },
  Acknowledged: { label: 'Acknowledged', tone: 'green' },
  ReReferred: { label: 'Re-referred', tone: 'violet' },
};

export function Q2StatePill({ state }: { state: Q2ReturnState }) {
  const s = Q2_STATE[state];
  return <Pill tone={s.tone}>{s.label}</Pill>;
}
