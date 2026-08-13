import { Link } from 'react-router-dom';
import { Award, Pencil, Plus } from 'lucide-react';
import { useCvEditProfile, useCvMasters, useDashboard } from '../../candidate.api';
import type { CvEditProfile, CvMasters } from '../../candidate.types';
import { Card, CardBody, CardHeader, EmptyState, InitialAvatar, SkeletonRows, StatTile } from '../components/primitives';
import { avatarTone, dotted, duration, labelOf, lpa, monthYear } from '../format';
import { stepHref, type WizardStepKey } from '../wizardSteps';

/**
 * Candidate profile overview — Figma node 8:12151.
 *
 * A read-first view: each card summarises one section and hands editing to the
 * matching wizard step. The left-hand cards (skills, languages, preferences,
 * resume) are supplied by the layout's rail, so this file owns the right column.
 */
export default function ProfileOverviewPage() {
  const { data: cv, isLoading } = useCvEditProfile();
  const { data: masters } = useCvMasters();

  if (isLoading || !cv) {
    return (
      <>
        <SectionSkeleton />
        <SectionSkeleton />
      </>
    );
  }

  return (
    <>
      <SummaryCard cv={cv} />
      <ExperienceCard cv={cv} masters={masters} />
      <EducationCard cv={cv} masters={masters} />
      <CertificationsCard cv={cv} />
      <PreferencesCard cv={cv} masters={masters} />
      <ActivityCard />
    </>
  );
}

function SectionSkeleton() {
  return (
    <Card>
      <CardBody>
        <SkeletonRows rows={2} />
      </CardBody>
    </Card>
  );
}

/** Header action that jumps into the wizard step owning this section. */
function SectionAction({ step, label }: { step: WizardStepKey; label: 'Edit' | 'Add' }) {
  return (
    <Link
      to={stepHref(step)}
      className="inline-flex items-center gap-1 text-xs font-semibold text-aj-blue transition-colors hover:text-aj-blue-hover"
    >
      {label === 'Add' ? <Plus className="size-3.5" aria-hidden /> : <Pencil className="size-3.5" aria-hidden />}
      {label}
    </Link>
  );
}

function SummaryCard({ cv }: { cv: CvEditProfile }) {
  return (
    <Card id="summary">
      <CardHeader
        title="Profile Summary"
        action={<SectionAction step="summary" label={cv.summary ? 'Edit' : 'Add'} />}
      />
      <CardBody>
        {cv.summary ? (
          <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600 dark:text-gray-300">{cv.summary}</p>
        ) : (
          <EmptyState
            title="No summary yet"
            description="Three to five sentences about your background and goals. Recruiters read this first."
            action={<SectionAction step="summary" label="Add" />}
          />
        )}
      </CardBody>
    </Card>
  );
}

function ExperienceCard({ cv, masters }: { cv: CvEditProfile; masters: CvMasters | undefined }) {
  return (
    <Card id="experience">
      <CardHeader title="Work Experience" action={<SectionAction step="experience" label="Add" />} />
      <CardBody className="space-y-4">
        {cv.employment.length ? (
          cv.employment.map((e, i) => {
            const title = labelOf(masters?.designations, e.designationId) ?? 'Role';
            const period = dotted(
              [monthYear(e.joiningDate), e.flgCurrent ? 'Present' : monthYear(e.releavingDate)]
                .filter(Boolean)
                .join(' – ') || null,
              duration(e.joiningDate, e.flgCurrent ? null : e.releavingDate),
            );
            return (
              <div
                key={e.subscriberEmployerId}
                className={i > 0 ? 'border-t border-aj-line-soft pt-4 dark:border-gray-700' : undefined}
              >
                <div className="flex gap-3">
                  <InitialAvatar text={e.employer || '?'} className={avatarTone(e.employer || 'x')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">{title}</p>
                        <p className="truncate text-[13px] font-medium text-aj-blue">{e.employer}</p>
                        {period && <p className="mt-0.5 text-xs text-slate-500">{period}</p>}
                      </div>
                      <SectionAction step="experience" label="Edit" />
                    </div>
                    {e.jobDescr && (
                      <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-slate-600 dark:text-gray-300">
                        {e.jobDescr}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="No work experience added"
            description="Add the roles you have held so recruiters can see your track record."
            action={<SectionAction step="experience" label="Add" />}
          />
        )}
      </CardBody>
    </Card>
  );
}

function EducationCard({ cv, masters }: { cv: CvEditProfile; masters: CvMasters | undefined }) {
  return (
    <Card id="education">
      <CardHeader title="Education" action={<SectionAction step="education" label="Add" />} />
      <CardBody className="space-y-4">
        {cv.education.length ? (
          cv.education.map((e, i) => {
            const course = labelOf(masters?.courses, e.courseTypeId);
            const degree = labelOf(masters?.degrees, e.degreeId);
            return (
              <div
                key={e.subscriberEducationId}
                className={i > 0 ? 'border-t border-aj-line-soft pt-4 dark:border-gray-700' : undefined}
              >
                <div className="flex items-start gap-3">
                  <InitialAvatar text={e.instituteName || '?'} letters={2} className={avatarTone(e.instituteName || 'y')} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">
                          {course ?? degree ?? 'Qualification'}
                        </p>
                        <p className="truncate text-[13px] font-medium text-aj-blue">{e.instituteName}</p>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {dotted(e.passingYear ? String(e.passingYear) : null, e.courseMode || null, e.marks || null)}
                        </p>
                      </div>
                      <SectionAction step="education" label="Edit" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <EmptyState
            title="No education added"
            description="Add your degrees and institutions."
            action={<SectionAction step="education" label="Add" />}
          />
        )}
      </CardBody>
    </Card>
  );
}

function CertificationsCard({ cv }: { cv: CvEditProfile }) {
  if (!cv.certificates.length) return null;
  return (
    <Card id="certifications">
      <CardHeader title="Certifications" action={<SectionAction step="skills" label="Add" />} />
      <CardBody className="space-y-2">
        {cv.certificates.map((c) => (
          <div
            key={c.subscriberCertificateId}
            className="flex items-center justify-between gap-3 rounded-lg bg-aj-surface-soft px-3 py-2.5 dark:bg-gray-900"
          >
            <div className="flex min-w-0 items-center gap-3">
              <Award className="size-5 shrink-0 text-amber-500" aria-hidden />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">
                  {c.certificateName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {dotted(c.certificationId || null, c.validFromYear ? String(c.validFromYear) : null)}
                </p>
              </div>
            </div>
            <SectionAction step="skills" label="Edit" />
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function PreferencesCard({ cv, masters }: { cv: CvEditProfile; masters: CvMasters | undefined }) {
  const cp = cv.careerProfile;
  const pro = cv.professional;
  const cities = cp.preferredCityIds
    .map((id) => labelOf(masters?.cities, id))
    .filter(Boolean)
    .join(', ');

  const cells: [string, string | null][] = [
    ['Expected CTC', lpa(cp.preferredSalary)],
    ['Notice Period', pro?.noticePeriod != null ? `${pro.noticePeriod} Days` : null],
    ['Work Mode', cp.preferredWorkModes.join(' / ') || null],
    ['Job Type', cp.desiredJobType.join(' / ') || null],
    ['Preferred Cities', cities || null],
    ['Open to Relocation', pro ? (pro.flgReadyToRelocate ? 'Yes' : 'No') : null],
  ];

  return (
    <Card id="job-preferences">
      <CardHeader title="Job Preferences" action={<SectionAction step="preferences" label="Edit" />} />
      <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cells.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-aj-surface-soft px-3.5 py-3 dark:bg-gray-900">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-800 dark:text-gray-100">{value ?? '—'}</p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function ActivityCard() {
  const { data, isLoading } = useDashboard();

  return (
    <Card id="activity">
      <CardHeader title="Profile Activity" />
      <CardBody>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Profile views are not recorded anywhere in the schema yet, so the tile keeps
              the design's placeholder dash rather than inventing a number. */}
          <StatTile value="—" label="Profile Views" tone="blue" />
          <StatTile value={isLoading ? '—' : (data?.appliedCount ?? 0)} label="Applications" tone="green" />
          <StatTile value={isLoading ? '—' : (data?.interviewCount ?? 0)} label="Interview Calls" tone="amber" />
        </div>
        <p className="mt-3 text-right text-xs text-slate-400">Last 30 days</p>
      </CardBody>
    </Card>
  );
}
