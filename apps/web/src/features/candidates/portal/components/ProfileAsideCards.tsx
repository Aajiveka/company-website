import { Link } from 'react-router-dom';
import { Download, FileText, Pencil, Plus } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useDeleteResume, useDownloadResume } from '../../candidate.api';
import type { CandidateProfile, CvEditProfile, CvMasters } from '../../candidate.types';
import { Card, CardBody, CardHeader, Chip, Pill } from './primitives';
import { longDate, lpa } from '../format';
import { stepHref } from '../wizardSteps';

/**
 * The profile page's left-column cards (Figma 8:12151): Key Skills, Languages,
 * Job Preferences and Resume. Module screens show "My Modules" here instead.
 *
 * Every "Edit" deep-links into the matching wizard step, which is the design's
 * single editing surface — there is no second set of inline editors to keep in sync.
 */
export function ProfileAsideCards({
  profile,
  cv,
  masters,
}: {
  profile: CandidateProfile;
  cv: CvEditProfile;
  masters: CvMasters | undefined;
}) {
  return (
    <>
      <KeySkillsCard cv={cv} />
      <LanguagesCard cv={cv} />
      <JobPreferencesCard cv={cv} masters={masters} />
      <ResumeCard profile={profile} />
    </>
  );
}

const EditLink = ({ to, label = 'Edit' }: { to: string; label?: string }) => (
  <Link
    to={to}
    className="inline-flex items-center gap-1 text-xs font-semibold text-aj-blue transition-colors hover:text-aj-blue-hover"
  >
    {label === 'Add' ? <Plus className="size-3.5" aria-hidden /> : <Pencil className="size-3.5" aria-hidden />}
    {label}
  </Link>
);

function KeySkillsCard({ cv }: { cv: CvEditProfile }) {
  const skills = cv.professional?.tagNames ?? [];
  return (
    <Card id="key-skills">
      <CardHeader
        title="Key Skills"
        action={<EditLink to={stepHref('skills')} label={skills.length ? 'Edit' : 'Add'} />}
      />
      <CardBody>
        {skills.length ? (
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <Chip key={s} label={s} />
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No skills added yet.</p>
        )}
      </CardBody>
    </Card>
  );
}

const PROFICIENCY: Record<number, string> = { 1: 'Beginner', 2: 'Proficient', 3: 'Expert' };

function LanguagesCard({ cv }: { cv: CvEditProfile }) {
  if (!cv.languages.length) return null;
  return (
    <Card id="languages">
      <CardHeader title="Languages" action={<EditLink to={stepHref('skills')} />} />
      <CardBody className="space-y-2.5">
        {cv.languages.map((l) => (
          <div key={l.subscriberLanguageId} className="flex items-center justify-between gap-3">
            <span className="truncate text-sm text-slate-700 dark:text-gray-200">{l.languageName}</span>
            <Pill>{PROFICIENCY[l.proficiencyId] ?? '—'}</Pill>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

function JobPreferencesCard({ cv, masters }: { cv: CvEditProfile; masters: CvMasters | undefined }) {
  const cp = cv.careerProfile;
  const pro = cv.professional;
  const rows: [string, string | null][] = [
    ['Expected CTC', lpa(cp.preferredSalary)],
    ['Notice Period', pro?.noticePeriod != null ? `${pro.noticePeriod} Days` : null],
    ['Work Mode', (cp.preferredWorkModes ?? []).join(' / ') || null],
    ['Job Type', (cp.desiredJobType ?? []).join(' / ') || null],
  ];
  const visible = rows.filter(([, v]) => v);
  if (!visible.length && !masters) return null;

  return (
    <Card id="job-preferences-aside">
      <CardHeader
        title="Job Preferences"
        action={<EditLink to={stepHref('preferences')} label={visible.length ? 'Edit' : 'Add'} />}
      />
      <CardBody className="space-y-2.5">
        {visible.length ? (
          visible.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-slate-500 dark:text-gray-400">{label}</span>
              <span className="truncate font-semibold text-slate-800 dark:text-gray-100">{value}</span>
            </div>
          ))
        ) : (
          <p className="text-xs text-slate-400">Tell us what you are looking for.</p>
        )}
      </CardBody>
    </Card>
  );
}

function ResumeCard({ profile }: { profile: CandidateProfile }) {
  const download = useDownloadResume();
  const remove = useDeleteResume();
  const { notify } = useToast();

  return (
    <Card id="resume">
      <CardHeader title="Resume" />
      <CardBody>
        {profile.resumeUrl ? (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-aj-line bg-aj-canvas p-3 dark:border-gray-700 dark:bg-gray-900">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-aj-blue text-white">
                <FileText className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">
                  {profile.resumeFileName ?? 'Resume.pdf'}
                </p>
                <p className="truncate text-[11px] text-slate-500">
                  {longDate(profile.resumeUploadedAt) ? `Updated ${longDate(profile.resumeUploadedAt)}` : 'Uploaded'}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs font-semibold">
              <a
                href={profile.resumeUrl}
                target="_blank"
                rel="noreferrer"
                className="text-aj-blue hover:text-aj-blue-hover"
              >
                View
              </a>
              <button
                type="button"
                onClick={() =>
                  download.mutate(profile.resumeFileName ?? 'resume.pdf', {
                    onError: () => notify('Could not download the resume.', 'error'),
                  })
                }
                disabled={download.isPending}
                className="inline-flex items-center gap-1 text-aj-blue hover:text-aj-blue-hover disabled:opacity-50"
              >
                <Download className="size-3.5" aria-hidden />
                Download
              </button>
              <Link to={stepHref('resume')} className="text-red-600 hover:text-red-700">
                Replace
              </Link>
            </div>
          </>
        ) : (
          <div className="text-center">
            <p className="text-xs text-slate-500">No resume uploaded yet.</p>
            <Link
              to={stepHref('resume')}
              className="mt-2 inline-block text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
            >
              Upload resume
            </Link>
          </div>
        )}
        {remove.isError && <p className="mt-2 text-xs text-red-600">Could not remove the resume.</p>}
      </CardBody>
    </Card>
  );
}
