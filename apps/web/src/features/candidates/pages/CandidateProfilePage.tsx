import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Card, ProfileSkeleton } from '@/components/ui';
import { useCandidateProfile, useCvEditProfile, useCvMasters } from '../candidate.api';
import { computeCompletion } from '../profileCompletion';
import { ProfileHeader, QuickLinks, type QuickLink } from '../components/profile/ProfileHeader';
import { ResumeSection } from '../components/profile/ResumeSection';
import { HeadlineSection, KeySkillsSection, SummarySection } from '../components/profile/TextSections';
import { ProfessionalSection } from '../components/profile/ProfessionalSection';
import { EducationSection, EmploymentSection } from '../components/profile/HistorySections';
import { ItSkillsSection, ProjectsSection } from '../components/profile/SkillProjectSections';
import { AccomplishmentsSection } from '../components/profile/AccomplishmentsSection';
import {
  CareerProfileSection,
  DiversitySection,
  PersonalDetailsSection,
} from '../components/profile/PreferenceSections';

/** The anchors, in the order they appear down the page. */
const SECTION_IDS = [
  'resume',
  'headline',
  'professional',
  'key-skills',
  'employment',
  'education',
  'it-skills',
  'projects',
  'summary',
  'accomplishments',
  'career-profile',
  'personal-details',
  'diversity',
] as const;

/**
 * Highlights the quick-link for whichever section is currently under the top of the viewport.
 *
 * Uses scroll position rather than IntersectionObserver visibility: several sections are
 * on screen at once, and "the last one whose top has passed" is what a reader means by
 * where they are.
 */
function useActiveSection(ready: boolean) {
  const [active, setActive] = useState<string>(SECTION_IDS[0]);

  useEffect(() => {
    if (!ready) return;
    const onScroll = () => {
      let current: string = SECTION_IDS[0];
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= 120) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [ready]);

  return active;
}

/** Candidate self-profile — every section editable in place. */
export default function CandidateProfilePage() {
  const { t } = useTranslation('dashboard');
  const { data: profile, isLoading, isError: profileFailed } = useCandidateProfile();
  const { data: cv, isError: cvFailed } = useCvEditProfile();
  const { data: masters } = useCvMasters();
  const { hash } = useLocation();

  // Both queries feed the page, so both have to be watched: keying the error branch off the
  // profile alone left a cv-edit failure showing the skeleton forever, with nothing to retry.
  const isError = profileFailed || cvFailed;
  const ready = !!profile && !!cv;
  const activeId = useActiveSection(ready);

  // The completion meter and the header ring must show the same number, so both read the
  // shared calculation rather than each rolling their own.
  const percent = useMemo(() => (cv ? computeCompletion(cv).percent : 0), [cv]);

  // Deep links (`/candidate/profile#employment`) arrive before the sections exist, so the
  // scroll waits until the data has rendered them.
  useEffect(() => {
    if (!hash || !ready) return;
    document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, ready]);

  const links: QuickLink[] = useMemo(() => {
    if (!cv) return [];
    const entries: [string, string, boolean][] = [
      ['resume', t('profile.resume.heading'), !!profile?.resumeUrl],
      ['headline', t('profile.headline.heading'), !!cv.headline],
      ['professional', t('profile.professional.heading'), !!cv.professional?.totalExp],
      ['key-skills', t('profile.keySkills.heading'), (cv.professional?.tagNames.length ?? 0) > 0],
      ['employment', t('profile.employment.heading'), cv.employment.length > 0],
      ['education', t('profile.education.heading'), cv.education.length > 0],
      ['it-skills', t('profile.itSkills.heading'), cv.itSkills.length > 0],
      ['projects', t('profile.projects.heading'), cv.projects.length > 0],
      ['summary', t('profile.summary.heading'), !!cv.summary],
      [
        'accomplishments',
        t('profile.accomplishments.heading'),
        cv.accomplishments.length > 0 || cv.certificates.length > 0,
      ],
      ['career-profile', t('profile.careerProfile.heading'), !!cv.careerProfile.jobRole],
      ['personal-details', t('profile.personalDetails.heading'), !!cv.personalDetails.maritalStatus],
      ['diversity', t('profile.diversity.heading'), !!cv.diversity.disabilityStatus],
    ];
    // The rail doubles as a to-do list: sections still empty carry an "Add" call to action.
    return entries.map(([id, label, filled]) => ({ id, label, action: filled ? undefined : t('profile.add') }));
  }, [cv, profile, t]);

  if (isLoading || (!isError && !ready)) {
    return (
      <div className="mx-auto max-w-6xl">
        <ProfileSkeleton />
      </div>
    );
  }

  if (isError || !profile || !cv) {
    return (
      <div className="mx-auto max-w-6xl">
        <Card>{t('profile.loadError')}</Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('profile.heading') }]}
      />

      <ProfileHeader profile={profile} percent={percent} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[15rem_1fr] lg:items-start">
        <QuickLinks links={links} activeId={activeId} />

        <div className="min-w-0 space-y-6">
          <ResumeSection profile={profile} />
          <HeadlineSection headline={cv.headline} />
          <ProfessionalSection
            data={
              cv.professional ?? {
                subFunctionId: null,
                skillId: null,
                totalExp: 0,
                currentCtc: null,
                currentCityId: null,
                flgReadyToRelocate: false,
                noticePeriod: null,
                industryTypeId: null,
                preferredCityIds: [],
                tagNames: [],
              }
            }
            masters={masters}
          />
          <KeySkillsSection
            skills={cv.professional?.tagNames ?? []}
            suggestions={(masters?.tags ?? []).map((s) => s.label)}
          />
          <EmploymentSection rows={cv.employment} masters={masters} />
          <EducationSection rows={cv.education} masters={masters} />
          <ItSkillsSection rows={cv.itSkills} />
          <ProjectsSection rows={cv.projects} />
          <SummarySection summary={cv.summary} />
          <AccomplishmentsSection accomplishments={cv.accomplishments} certificates={cv.certificates} />
          <CareerProfileSection data={cv.careerProfile} masters={masters} />
          <PersonalDetailsSection
            details={cv.personalDetails}
            personal={cv.personal}
            languages={cv.languages}
            gender={profile.gender}
            masters={masters}
          />
          <DiversitySection data={cv.diversity} />
        </div>
      </div>
    </div>
  );
}
