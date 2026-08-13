import type { AppliedJob } from '../candidate.types';
import type { Tone } from './components/primitives';

/**
 * The tracker groups applications into the four buckets the Figma filters use.
 *
 * `JobSubscriberMapping.jobMapStatus.descr` is free text maintained in a master table,
 * so matching is done on substrings rather than an enum — an unrecognised status falls
 * through to "in progress", which is the safe reading of "something is happening".
 */
export type Bucket = 'needsAction' | 'inProgress' | 'offers' | 'closed';

export interface StatusView {
  bucket: Bucket;
  /** Pill wording, matching the design's vocabulary. */
  label: string;
  tone: Tone;
  /** 0–1, how far along the six-segment progress bar the row is drawn. */
  progress: number;
  /** True once the application has reached an interview round — counted separately in the tiles. */
  interviewing: boolean;
}

const has = (haystack: string, ...needles: string[]) => needles.some((n) => haystack.includes(n));

export function statusView(status: string): StatusView {
  const s = (status ?? '').toLowerCase();

  if (has(s, 'offer', 'selected', 'hired', 'joined')) {
    return { bucket: 'offers', label: 'Offer', tone: 'green', progress: 1, interviewing: false };
  }
  if (has(s, 'reject', 'not selected', 'declined', 'withdraw', 'closed')) {
    return { bucket: 'closed', label: 'Not selected', tone: 'red', progress: 0.5, interviewing: false };
  }
  if (has(s, 'hold')) {
    return { bucket: 'closed', label: 'On hold', tone: 'amber', progress: 0.5, interviewing: false };
  }
  if (has(s, 'document', 'pending', 'action', 'awaiting')) {
    return { bucket: 'needsAction', label: 'Needs action', tone: 'amber', progress: 0.66, interviewing: false };
  }
  if (has(s, 'interview', 'round', 'shortlist')) {
    return { bucket: 'inProgress', label: 'In progress', tone: 'blue', progress: 0.66, interviewing: true };
  }
  return { bucket: 'inProgress', label: 'In progress', tone: 'blue', progress: 0.33, interviewing: false };
}

/** Counts for the four summary tiles at the top of the tracker. */
export function summarise(jobs: AppliedJob[]) {
  const views = jobs.map((j) => statusView(j.status));
  return {
    active: views.filter((v) => v.bucket !== 'closed').length,
    interviewing: views.filter((v) => v.interviewing).length,
    offers: views.filter((v) => v.bucket === 'offers').length,
    needsAction: views.filter((v) => v.bucket === 'needsAction').length,
  };
}
