import type { CvEditProfile } from '@/features/candidates/candidate.types';
import type { PublicJob } from './jobs.types';

/**
 * The "94% match" badge on job cards and the job page.
 *
 * Computed on the client from the CV the portal has already loaded, rather than added to the
 * search response: it is a per-candidate number, so returning it from a cacheable public
 * endpoint would either leak one candidate's fit to another or make `/jobs` uncacheable.
 *
 * Weighting reflects what actually decides a shortlist — skills first, then whether the
 * experience band fits, then location and work mode. Returns null when the profile is too
 * empty to say anything honest, and the badge is then hidden rather than showing a made-up
 * number to someone who has filled in nothing.
 */
export interface JobMatch {
  percent: number;
  /** Why it scored what it did — shown as the badge's tooltip. */
  reasons: string[];
}

const norm = (s: string) => s.trim().toLowerCase();

export function matchScore(job: PublicJob & { skills?: string[] }, cv: CvEditProfile | undefined): JobMatch | null {
  if (!cv) return null;

  const mySkills = new Set((cv.professional?.tagNames ?? []).map(norm));
  const myExp = cv.professional?.totalExp ?? 0;
  const myCities = new Set(
    [...(cv.careerProfile?.preferredCityIds ?? [])].map(String),
  );
  const preferredModes = norm(cv.careerProfile?.preferredWorkModes?.join(' ') ?? '');

  // Nothing to compare against — say nothing rather than inventing a score.
  if (!mySkills.size && !myExp) return null;

  const reasons: string[] = [];
  let score = 0;
  let weightUsed = 0;

  // Skills — 55%.
  const jobSkills = (job.skills ?? []).map(norm).filter(Boolean);
  if (jobSkills.length && mySkills.size) {
    const hits = jobSkills.filter((s) => mySkills.has(s)).length;
    const ratio = hits / jobSkills.length;
    score += ratio * 55;
    weightUsed += 55;
    if (hits) reasons.push(`${hits} of ${jobSkills.length} skills match`);
  }

  // Experience band — 25%. Full marks inside the band, partial just outside it.
  if (myExp > 0) {
    const min = job.minExp ?? 0;
    const max = (job as { maxExp?: number | null }).maxExp ?? null;
    let expScore: number;
    if (myExp >= min && (max == null || myExp <= max)) {
      expScore = 1;
      reasons.push('Experience fits the band');
    } else if (myExp < min) {
      // One year short scores 0.6; three or more short scores 0.
      expScore = Math.max(0, 1 - (min - myExp) / 3) * 0.8;
    } else {
      // Over-qualified is a softer penalty than under-qualified.
      expScore = 0.7;
    }
    score += expScore * 25;
    weightUsed += 25;
  }

  // Location — 12%.
  if (myCities.size) {
    weightUsed += 12;
    // Preferred cities are stored as ids and the job carries a name, so this compares what
    // both sides actually have in common: the candidate's own city string.
    if (job.city && norm(job.city) === norm(cv.personal?.address ?? '')) {
      score += 12;
      reasons.push('In your city');
    }
  }

  // Work mode — 8%.
  if (preferredModes && job.workMode) {
    weightUsed += 8;
    if (preferredModes.includes(norm(job.workMode))) {
      score += 8;
      reasons.push(`${job.workMode} matches your preference`);
    }
  }

  if (!weightUsed) return null;

  // Rescale to whatever we could actually judge, so a job with no listed skills is not
  // penalised for the employer's omission.
  const percent = Math.round((score / weightUsed) * 100);
  return { percent: Math.max(0, Math.min(100, percent)), reasons };
}

/** Green above 80, blue above 60, slate below — the design's three badge tones. */
export function matchTone(percent: number): 'green' | 'blue' | 'slate' {
  if (percent >= 80) return 'green';
  if (percent >= 60) return 'blue';
  return 'slate';
}
