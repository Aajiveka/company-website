import { useMemo } from 'react';
import { useCandidateProfile, useCvEditProfile } from '../candidate.api';
import { computeCompletion } from '../profileCompletion';
import type { CandidateProfile, CvEditProfile } from '../candidate.types';

/**
 * Everything the portal chrome (hero + sidebar) needs, derived once.
 *
 * The hero, the sidebar contact card and the profile page all showed slightly
 * different versions of the same facts when each derived them itself, so the
 * derivation lives here and they all read the same object.
 */
export interface PortalProfile {
  name: string;
  /** Empty when the candidate has no name yet — the hero then draws its placeholder mark. */
  initials: string;
  title: string | null;
  city: string | null;
  experience: string | null;
  expectedCtc: string | null;
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  gitHub: string | null;
  photoUrl: string | null;
  hasResume: boolean;
  resumeFileName: string;
  /** Public profile URL, for the hero's Share Profile action. */
  shareUrl: string;
  verified: boolean;
  /** True while the profile is still essentially untouched. */
  isNew: boolean;
  percent: number;
  nextStep: { label: string; target: number } | null;
}

/** Human labels for the weighted sections in `profileCompletion`. */
const SECTION_LABELS: Record<string, string> = {
  personalDetails: 'Personal Details',
  professional: 'Professional Details',
  headline: 'a Headline',
  keySkills: 'Key Skills',
  employment: 'Work Experience',
  education: 'Education',
  itSkills: 'IT Skills',
  projects: 'Projects',
  summary: 'a Summary',
  resume: 'a Resume',
  accomplishments: 'Certifications',
  careerProfile: 'Job Preferences',
  languages: 'Languages',
};

const lpa = (rupees: number | null | undefined) =>
  rupees && rupees > 0 ? `${(rupees / 100_000).toFixed(1).replace(/\.0$/, '')} LPA Expected` : null;

/** First online-profile accomplishment whose URL points at the given host. */
function onlineProfile(cv: CvEditProfile | undefined, host: string): string | undefined {
  return cv?.accomplishments?.find(
    (a) => a.kind === 'ONLINE_PROFILE' && (a.url ?? '').toLowerCase().includes(host),
  )?.url;
}

/**
 * Profile links are shown the way the design writes them — "linkedin.com/in/name", not the
 * stored "https://linkedin.com/in/name/". The href keeps the full URL; only the label is
 * trimmed, so the link still works.
 */
function tidyUrl(url: string | null | undefined): string | null {
  const raw = url?.trim();
  if (!raw) return null;
  return raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}

/**
 * `totalExperience` arrives as a bare count ("5"), which reads as a stray number next to
 * a location and a salary. Anything non-numeric is already a phrase and is passed through.
 */
function formatExperience(value: string | null | undefined): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  const years = Number(raw);
  if (!Number.isFinite(years)) return raw;
  if (years <= 0) return 'Fresher';
  return `${raw} ${years === 1 ? 'year' : 'years'} experience`;
}

export function derivePortalProfile(profile: CandidateProfile, cv: CvEditProfile | undefined): PortalProfile {
  const { sections, percent } = cv ? computeCompletion(cv) : { sections: [], percent: 0 };

  // The banner nudges toward the single most valuable thing still missing, and shows
  // where finishing it lands the meter — a bare "82%" gives the user nothing to act on.
  const pending = sections.find((s) => !s.done);
  const nextStep = pending
    ? { label: SECTION_LABELS[pending.key] ?? pending.key, target: percent + pending.weight }
    : null;

  const name = profile.fullName?.trim() || '';
  const title = profile.resumeHeadline?.trim() || profile.designation?.trim() || null;

  return {
    name: name || 'Your Full Name',
    initials: name
      ? name
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase()
      : '',
    title,
    city: profile.city?.trim() || null,
    experience: formatExperience(profile.totalExperience),
    expectedCtc: lpa(cv?.careerProfile?.preferredSalary ?? profile.currentCtc),
    email: profile.email?.trim() || null,
    phone: profile.mobile?.trim() || null,
    // Online profiles all share one accomplishment kind, so they are told apart by host.
    linkedIn: tidyUrl(onlineProfile(cv, 'linkedin')),
    gitHub: tidyUrl(onlineProfile(cv, 'github')),
    photoUrl: profile.photoUrl,
    hasResume: !!profile.resumeUrl,
    resumeFileName: profile.resumeFileName || `${name || 'resume'}.pdf`,
    shareUrl: `${typeof window === 'undefined' ? '' : window.location.origin}/candidates/${profile.subscriberId}`,
    verified: profile.emailVerified && percent >= 50,
    isNew: percent === 0,
    percent,
    nextStep,
  };
}

/** Loads the portal chrome's data. Both queries are already cached app-wide by React Query. */
export function usePortalProfile() {
  const profileQuery = useCandidateProfile();
  const cvQuery = useCvEditProfile();

  const portal = useMemo(
    () => (profileQuery.data ? derivePortalProfile(profileQuery.data, cvQuery.data) : null),
    [profileQuery.data, cvQuery.data],
  );

  return {
    portal,
    profile: profileQuery.data,
    cv: cvQuery.data,
    isLoading: profileQuery.isLoading || cvQuery.isLoading,
    isError: profileQuery.isError || cvQuery.isError,
    refetch: () => {
      void profileQuery.refetch();
      void cvQuery.refetch();
    },
  };
}
