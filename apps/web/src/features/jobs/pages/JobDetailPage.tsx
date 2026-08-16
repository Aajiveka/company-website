import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bookmark, Briefcase, Building2, Clock, IndianRupee, MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Seo } from '@/components/Seo';
import { JobSchema } from '@/components/JobSchema';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';
import { useCvEditProfile, useSavedJobIds, useSaveJob, useUnsaveJob } from '@/features/candidates/candidate.api';
import {
  Card,
  CardBody,
  ErrorState,
  InitialAvatar,
  SkeletonRows,
} from '@/features/candidates/portal/components/primitives';
import { avatarTone, relativeTime } from '@/features/candidates/portal/format';
import { MatchBadge } from '../components/JobResultCard';
import { matchScore } from '../jobMatch';
import { useJob } from '../jobs.api';
import type { JobDetail } from '../jobs.types';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

/**
 * Job detail — Figma node 27:4404.
 *
 * The long-form sections come from two free-text columns the employer fills in (JobDescr and
 * JobCandidateProfile). Those are split into the design's headed lists where the text has
 * obvious structure, and rendered as prose where it does not, rather than showing empty
 * "Key responsibilities" headings for every job that was posted as a paragraph.
 */
export default function JobDetailPage() {
  const { id = '' } = useParams();
  const { isAuthenticated, user } = useAuth();
  const isCandidate = isAuthenticated && user?.roleId === Role.Subscriber;

  const { data: job, isLoading, isError, refetch } = useJob(id);
  const { data: cv } = useCvEditProfile({ enabled: isCandidate });
  const { data: savedIds } = useSavedJobIds(isCandidate);
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();

  const isSaved = !!savedIds?.includes(Number(id));

  if (isError) {
    return (
      <Card>
        <ErrorState message="We could not load this job." onRetry={refetch} />
      </Card>
    );
  }

  if (isLoading || !job) {
    return (
      <Card>
        <CardBody>
          <SkeletonRows rows={5} />
        </CardBody>
      </Card>
    );
  }

  const match = isCandidate ? matchScore(job, cv) : null;
  const salary = job.minCtc || job.maxCtc ? `₹${lpa(job.minCtc)}–${lpa(job.maxCtc)} LPA` : null;
  const exp = job.maxExp ? `${job.minExp}–${job.maxExp} yrs` : job.minExp ? `${job.minExp}+ yrs` : null;

  return (
    <>
      <Seo
        title={`${job.designation} at ${job.company}`}
        description={job.description?.slice(0, 160) ?? undefined}
        path={`/jobs/${id}`}
      />
      <JobSchema job={job} path={`/jobs/${id}`} />

      <Link
        to="/jobs"
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-aj-blue"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to jobs
      </Link>

      <Card className="mt-3">
        {/* Header */}
        <div className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 gap-4">
              <InitialAvatar text={job.company || '?'} className={cn('size-14 text-xl', avatarTone(job.company || 'j'))} />
              <div className="min-w-0">
                <h1 className="font-display text-2xl font-bold text-slate-800 dark:text-gray-100">{job.designation}</h1>
                <p className="text-sm text-slate-500">{job.company}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-slate-600 dark:text-gray-300">
                  {job.city && <Meta icon={MapPin}>{job.city}</Meta>}
                  {exp && <Meta icon={Briefcase}>{exp}</Meta>}
                  {job.employmentType && <Meta icon={Clock}>{job.employmentType}</Meta>}
                  {job.workMode && <Meta icon={Building2}>{job.workMode}</Meta>}
                  {salary && <Meta icon={IndianRupee}>{salary}</Meta>}
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  {relativeTime(job.postedOn) ? `Posted ${relativeTime(job.postedOn)}` : null}
                  {job.interviewRounds.length > 0 && ` · ${job.interviewRounds.length} interview rounds`}
                </p>
              </div>
            </div>

            {match && <MatchBadge match={match} />}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              to={`/jobs/${id}/apply`}
              className="rounded-lg bg-aj-blue px-6 py-3 text-sm font-semibold text-white shadow-aj-raised transition-colors hover:bg-aj-blue-hover"
            >
              Apply Now
            </Link>
            {isCandidate && (
              <button
                type="button"
                onClick={() => (isSaved ? unsaveJob.mutate(Number(id)) : saveJob.mutate(Number(id)))}
                aria-pressed={isSaved}
                className="inline-flex items-center gap-2 rounded-lg border border-aj-line bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-aj-blue hover:text-aj-blue dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <Bookmark className={cn('size-4 text-aj-blue', isSaved && 'fill-current')} aria-hidden />
                {isSaved ? 'Saved' : 'Save'}
              </button>
            )}
          </div>
        </div>

        {/* Body + overview rail */}
        <div className="grid border-t border-aj-line-soft lg:grid-cols-[1fr_320px] dark:border-gray-700">
          <div className="space-y-6 p-5 sm:p-6">
            <Prose title="About the role" text={job.description} />
            <Prose title="Key responsibilities" text={job.keyResponsibilities} />
            <Prose title="Requirements" text={job.candidateProfile} />
            <Prose title="Preferred qualifications" text={job.preferredQualifications} />

            {job.skills.length > 0 && (
              <section>
                <SectionTitle>Skills</SectionTitle>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-full bg-blue-50 px-3 py-1.5 text-[13px] font-medium text-aj-blue dark:bg-blue-950"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {job.interviewRounds.length > 0 && (
              <section>
                <SectionTitle>Interview process</SectionTitle>
                <ol className="space-y-3">
                  {job.interviewRounds.map((round, i) => (
                    <li key={round} className="flex items-start gap-3">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-aj-blue dark:bg-blue-950">
                        {i + 1}
                      </span>
                      <span className="text-sm text-slate-700 dark:text-gray-300">{round}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          <aside className="border-t border-aj-line-soft p-5 sm:p-6 lg:border-l lg:border-t-0 dark:border-gray-700">
            <h2 className="mb-4 font-display text-base font-bold text-slate-800 dark:text-gray-100">Job overview</h2>
            <dl className="space-y-3.5">
              <OverviewRow label="Experience" value={exp} />
              <OverviewRow label="Employment type" value={job.employmentType} />
              <OverviewRow label="Work mode" value={job.workMode} />
              <OverviewRow label="Location" value={job.city} />
              <OverviewRow label="CTC" value={salary} />
              <OverviewRow label="Education" value={job.educationDetail ?? job.educationTypes.join(', ')} />
              <OverviewRow label="Industry" value={job.industry} />
              <OverviewRow label="Department" value={job.department} />
              <OverviewRow label="Sub-department" value={job.subDepartment} />
              <OverviewRow label="Reports to" value={job.reportTo} />
              <OverviewRow label="Team size" value={job.teamSize != null ? String(job.teamSize) : null} />
            </dl>
          </aside>
        </div>
      </Card>
    </>
  );
}

function Meta({ icon: Icon, children }: { icon: typeof MapPin; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-slate-400" aria-hidden />
      {children}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-3 font-display text-lg font-bold text-slate-800 dark:text-gray-100">{children}</h2>;
}

function OverviewRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[13px] text-slate-400">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800 dark:text-gray-100">{value}</dd>
    </div>
  );
}

/**
 * Renders a free-text column as the design's bulleted list when the employer wrote one
 * (newlines, or leading bullets/dashes), and as a paragraph when they wrote prose.
 */
function Prose({ title, text }: { title: string; text: string | null }) {
  const body = text?.trim();
  if (!body) return null;

  const lines = body
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[•\-*·]\s*/, '').trim())
    .filter(Boolean);

  return (
    <section>
      <SectionTitle>{title}</SectionTitle>
      {lines.length > 1 ? (
        <ul className="space-y-2">
          {lines.map((line, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-slate-700 dark:text-gray-300">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-aj-blue" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm leading-relaxed text-slate-700 dark:text-gray-300">{body}</p>
      )}
    </section>
  );
}

export type { JobDetail };
