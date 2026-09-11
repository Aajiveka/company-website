import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Briefcase, Building2, ChevronRight, MapPin, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useQ2JobApplicants } from '../q2.api';
import { ctcLabel, expRangeLabel, experienceLabel, postedOnLabel } from '../q2.format';
import { Q2Shell } from '../components/Q2Shell';
import {
  CvBadge,
  JobChip,
  MatchRing,
  ProfileBadge,
  Q2Card,
  RelevancePill,
  SkillTag,
} from '../components/primitives';

/**
 * The Job Applicants screen: one job, its applicants ranked by JD match, and the Job
 * Information rail.
 *
 * Reached from a row of the Employer Jobs table, and the "Back to jobs" link at the top plus
 * the "Back to all jobs" button at the foot of the rail both return there — the Figma draws
 * both, so both are wired.
 */
export default function Q2JobApplicantsPage() {
  const { t } = useTranslation('common');
  const { jobId = '' } = useParams();
  const navigate = useNavigate();
  const [relevantOnly, setRelevantOnly] = useState(false);
  const { data, isLoading, isError, refetch } = useQ2JobApplicants(jobId, relevantOnly);

  const job = data?.job;
  const applicants = data?.applicants ?? [];

  return (
    <Q2Shell title={t('q2.jobApplicants.title')} subtitle={t('q2.jobApplicants.subtitle')}>
      <Link
        to="/q2/jobs"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-q2-ink-soft outline-none transition hover:text-q2-blue focus-visible:underline dark:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('q2.jobApplicants.backToJobs')}
      </Link>

      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : isLoading || !job ? (
        <div className="space-y-4">
          <div className="h-40 animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="h-64 animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
            <div className="h-64 animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
          </div>
        </div>
      ) : (
        <>
          {/* Job header */}
          <Q2Card className="mb-4">
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-q2-blue-soft text-q2-blue dark:bg-q2-blue/20">
                  <Briefcase className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-xl font-extrabold text-q2-ink dark:text-white">
                    {job.title}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-q2-ink-soft dark:text-gray-300">
                    {job.company && (
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 shrink-0 text-q2-muted-light" aria-hidden />
                        {job.company}
                      </span>
                    )}
                    {job.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-q2-muted-light" aria-hidden />
                        {job.location}
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {job.jobType && <JobChip>{job.jobType}</JobChip>}
                    {job.workMode && <JobChip>{job.workMode}</JobChip>}
                    <JobChip>{expRangeLabel(job.minExp, job.maxExp)}</JobChip>
                    <JobChip>{ctcLabel(job.minCTC, job.maxCTC)}</JobChip>
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="font-display text-3xl font-extrabold text-q2-ink dark:text-white">
                  {data?.totalApplicants ?? 0}
                </p>
                <p className="text-xs text-q2-muted">{t('q2.jobApplicants.totalApplicants')}</p>
              </div>
            </div>
            {job.description && (
              <div className="border-t border-q2-line px-5 py-4 dark:border-gray-700">
                <p className="text-sm leading-relaxed text-q2-ink-soft dark:text-gray-300">
                  {job.description}
                </p>
              </div>
            )}
          </Q2Card>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Match ranking */}
            <Q2Card className="min-w-0">
              <div className="flex flex-col gap-3 border-b border-q2-line p-5 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold text-q2-ink dark:text-white">
                    {t('q2.jobApplicants.rankingTitle')}
                  </h3>
                  <p className="mt-0.5 text-xs text-q2-muted">
                    {t('q2.jobApplicants.rankingSubtitle')}
                  </p>
                </div>
                {/* The Figma's "Relevant only" switch. */}
                <label className="inline-flex shrink-0 cursor-pointer items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={relevantOnly}
                    onClick={() => setRelevantOnly((v) => !v)}
                    className={cn(
                      'relative h-5 w-9 shrink-0 rounded-full transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q2-blue/40',
                      relevantOnly ? 'bg-q2-blue' : 'bg-q2-chip dark:bg-gray-600',
                    )}
                  >
                    <span
                      className={cn(
                        'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-[left]',
                        relevantOnly ? 'left-[1.125rem]' : 'left-0.5',
                      )}
                    />
                  </button>
                  <span
                    className="text-xs font-semibold text-q2-ink-soft dark:text-gray-300"
                    onClick={() => setRelevantOnly((v) => !v)}
                  >
                    {t('q2.jobApplicants.relevantOnly')}
                  </span>
                </label>
              </div>

              {!applicants.length ? (
                <div className="p-5">
                  <EmptyState
                    variant={relevantOnly ? 'no-results' : 'no-data'}
                    title={
                      relevantOnly
                        ? t('q2.jobApplicants.emptyRelevant.title')
                        : t('q2.jobApplicants.empty.title')
                    }
                    description={
                      relevantOnly
                        ? t('q2.jobApplicants.emptyRelevant.body')
                        : t('q2.jobApplicants.empty.body')
                    }
                    {...(relevantOnly
                      ? {
                          action: {
                            label: t('q2.jobApplicants.showAll'),
                            onClick: () => setRelevantOnly(false),
                          },
                        }
                      : {})}
                  />
                </div>
              ) : (
                <ul className="divide-y divide-q2-line dark:divide-gray-700">
                  {applicants.map((a) => (
                    <li key={a.mapId}>
                      <Link
                        to={`/q2/applications/${a.mapId}`}
                        className="flex items-center gap-4 p-4 outline-none transition hover:bg-q2-blue-soft/40 focus-visible:bg-q2-blue-soft/60 sm:px-5 dark:hover:bg-gray-700/40"
                      >
                        <span className="w-4 shrink-0 text-sm font-bold text-q2-ink-soft tabular-nums dark:text-gray-300">
                          {a.rank}
                        </span>
                        <MatchRing score={a.totalScore} size={56} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-q2-ink dark:text-gray-100">
                              {a.name || '—'}
                            </span>
                            <RelevancePill relevant={a.relevant} />
                          </div>
                          <p className="mt-0.5 truncate text-xs text-q2-muted">
                            {[a.designation, experienceLabel(a.totalExp)].filter(Boolean).join(' · ')}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-3">
                            <ProfileBadge value={a.profileCompleteness} />
                            <CvBadge available={a.hasCv} />
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-q2-muted-light" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Q2Card>

            {/* Job Information rail */}
            <div className="min-w-0 space-y-4">
              <Q2Card className="p-5">
                <h3 className="font-display text-sm font-bold text-q2-ink dark:text-white">
                  {t('q2.jobInfo.title')}
                </h3>
                <dl className="mt-3 space-y-2.5">
                  <InfoRow label={t('q2.jobInfo.company')} value={job.company} />
                  <InfoRow
                    label={t('q2.jobInfo.experienceRequired')}
                    value={expRangeLabel(job.minExp, job.maxExp)}
                  />
                  <InfoRow label={t('q2.jobInfo.location')} value={job.location} />
                  <InfoRow
                    label={t('q2.jobInfo.salaryRange')}
                    value={ctcLabel(job.minCTC, job.maxCTC)}
                  />
                  <InfoRow
                    label={t('q2.jobInfo.mandatoryQualification')}
                    value={job.qualification}
                  />
                  <InfoRow label={t('q2.jobInfo.jobType')} value={job.jobType} />
                  <InfoRow label={t('q2.jobInfo.workMode')} value={job.workMode} />
                  <InfoRow label={t('q2.jobInfo.postedOn')} value={postedOnLabel(job.postedOn)} />
                </dl>

                {!!job.requiredSkills.length && (
                  <div className="mt-4 border-t border-q2-line pt-4 dark:border-gray-700">
                    <p className="text-xs font-semibold text-q2-ink dark:text-gray-100">
                      {t('q2.jobInfo.requiredSkills')}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {job.requiredSkills.map((s) => (
                        <SkillTag key={s}>{s}</SkillTag>
                      ))}
                    </div>
                  </div>
                )}
              </Q2Card>

              {/*
                "Auto-flagged on intake" — static guidance in the design, listing the three
                conditions that hold or reject an application before Q2 ever sees it. It is
                copy, not state, so it renders as copy.
              */}
              <Q2Card className="bg-q2-amber-soft/40 p-5 dark:bg-gray-800">
                <h3 className="flex items-center gap-1.5 font-display text-sm font-bold text-q2-ink dark:text-white">
                  <TriangleAlert className="h-4 w-4 text-q2-amber" aria-hidden />
                  {t('q2.autoFlag.title')}
                </h3>
                <p className="mt-2 text-xs text-q2-ink-soft dark:text-gray-300">
                  {t('q2.autoFlag.body')}
                </p>
                <ul className="mt-3 space-y-1.5">
                  {(['cvMissing', 'requiredInfoMissing', 'invalidProfile'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-2 text-xs text-q2-ink-soft dark:text-gray-300">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-q2-amber"
                        aria-hidden
                      />
                      {t(`q2.autoFlag.${k}`)}
                    </li>
                  ))}
                </ul>
              </Q2Card>

              <button
                type="button"
                onClick={() => navigate('/q2/jobs')}
                className="w-full rounded-xl border border-q2-line bg-q2-surface py-3 text-sm font-bold text-q2-ink outline-none transition hover:bg-q2-chip focus-visible:ring-2 focus-visible:ring-q2-blue/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {t('q2.jobApplicants.backToAllJobs')}
              </button>
            </div>
          </div>
        </>
      )}
    </Q2Shell>
  );
}

/** A label/value row in the Job Information rail — label left, value right-aligned. */
function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  const empty = value == null || value === '';
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-xs text-q2-muted">{label}</dt>
      <dd
        className={cn(
          'min-w-0 break-words text-right text-xs font-semibold',
          empty ? 'text-q2-muted' : 'text-q2-ink dark:text-gray-100',
        )}
      >
        {empty ? '—' : value}
      </dd>
    </div>
  );
}
