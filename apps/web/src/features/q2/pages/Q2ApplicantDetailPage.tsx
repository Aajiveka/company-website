import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Check,
  Clock,
  Eye,
  FileText,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/ui';
import {
  useForwardToQ3,
  useQ2Application,
  useRejectApplication,
  useSendBackToQ1,
  useSetCriterion,
} from '../q2.api';
import {
  STATUS_LABEL,
  ctcLabel,
  expRangeLabel,
  experienceLabel,
  noticeLabel,
  resumeMetaLabel,
} from '../q2.format';
import { Q2Shell } from '../components/Q2Shell';
import {
  Avatar,
  CoverageHeading,
  DetailField,
  JobChip,
  Q2Card,
  ScoreRow,
  SectionLabel,
  SkillTag,
  StatusPill,
} from '../components/primitives';
import type { MatchCriterionKey } from '../q2.types';

/**
 * The applicant detail screen — Q2's decision point.
 *
 * Two panels: the candidate (green) and the job description (blue), with the three decision
 * buttons in the header. The Candidate Scoring checkboxes re-weight the ticked subset on the
 * server and the Total Match Score row follows, which is what the Figma's "1/7 criteria · 98%"
 * state shows.
 */
export default function Q2ApplicantDetailPage() {
  const { t } = useTranslation('common');
  const { mapId = '' } = useParams();
  const { notify } = useToast();
  const { data, isLoading, isError, refetch } = useQ2Application(mapId);
  const setCriterion = useSetCriterion(mapId);
  const forward = useForwardToQ3(mapId);
  const sendBack = useSendBackToQ1(mapId);
  const reject = useRejectApplication(mapId);
  const [pending, setPending] = useState<null | 'forward' | 'sendBack' | 'reject'>(null);

  const decided = data && data.status !== 'New';
  const busy = pending != null;

  /** One handler for all three decisions — they differ only in mutation, copy and toast. */
  const decide = async (
    kind: 'forward' | 'sendBack' | 'reject',
    run: () => Promise<unknown>,
  ) => {
    setPending(kind);
    try {
      await run();
      notify(t(`q2.decision.${kind}.success`), 'success');
    } catch {
      // The server refuses a second decision on an already-decided application, so this is
      // a real error path rather than a theoretical one.
      notify(t(`q2.decision.${kind}.error`), 'error');
    } finally {
      setPending(null);
    }
  };

  const onToggle = (criterion: MatchCriterionKey, included: boolean) => {
    setCriterion.mutate(
      { criterion, included },
      { onError: () => notify(t('q2.scoring.toggleError'), 'error') },
    );
  };

  return (
    <Q2Shell title={t('q2.jobApplicants.title')} subtitle={t('q2.jobApplicants.subtitle')}>
      <Link
        to="/q2/applicants"
        className="mb-4 inline-flex items-center gap-2 text-[13px] font-semibold text-q2-ink-soft outline-none transition hover:text-q2-blue focus-visible:underline dark:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('q2.detail.backToApplicants')}
      </Link>

      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : isLoading || !data ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
          <div className="grid gap-4 xl:grid-cols-2">
            <div className="h-[32rem] animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
            <div className="h-[32rem] animate-pulse rounded-xl bg-q2-chip dark:bg-gray-700" />
          </div>
        </div>
      ) : (
        <>
          {/* Header: identity, overall match, and the three decisions */}
          <Q2Card className="mb-4 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar
                  name={data.candidate.name}
                  id={data.subscriberId}
                  className="h-11 w-11 text-sm"
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-lg font-bold text-q2-ink dark:text-white">
                      {data.candidate.name || '—'}
                    </h2>
                    {/* The Figma header has no pill, but once a decision exists the three
                        buttons disappear — without this the screen would not say why. */}
                    {decided && <StatusPill status={data.status} />}
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-q2-muted">
                    {[
                      data.candidate.designation,
                      data.job.title && t('q2.detail.appliedFor', { title: data.job.title }),
                      data.job.company,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="shrink-0 sm:text-right">
                  <p className="text-[11px] font-medium text-q2-muted">
                    {t('q2.detail.overallMatch')}
                  </p>
                  <p className="font-display text-xl font-bold text-q2-emerald-ink">
                    {data.overallScore}%
                  </p>
                </div>

                {decided ? (
                  <p className="rounded-lg bg-q2-chip px-3 py-2 text-xs font-semibold text-q2-ink-soft dark:bg-gray-700 dark:text-gray-300">
                    {t('q2.detail.alreadyDecided', { status: STATUS_LABEL[data.status] })}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide('forward', () => forward.mutateAsync())}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-q2-emerald px-3.5 py-2.5 text-[13px] font-semibold text-white outline-none transition hover:bg-q2-emerald-hover focus-visible:ring-2 focus-visible:ring-q2-emerald/40 disabled:opacity-60"
                    >
                      <ShieldCheck className="h-4 w-4" aria-hidden />
                      {pending === 'forward' ? t('q2.decision.forward.busy') : t('q2.decision.forward.label')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide('sendBack', () => sendBack.mutateAsync())}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-q2-line bg-q2-surface px-3.5 py-2.5 text-[13px] font-semibold text-q2-ink outline-none transition hover:bg-q2-chip focus-visible:ring-2 focus-visible:ring-q2-blue/40 disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                    >
                      <Send className="h-4 w-4" aria-hidden />
                      {pending === 'sendBack' ? t('q2.decision.sendBack.busy') : t('q2.decision.sendBack.label')}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void decide('reject', () => reject.mutateAsync())}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-q2-red px-3.5 py-2.5 text-[13px] font-semibold text-white outline-none transition hover:brightness-95 focus-visible:ring-2 focus-visible:ring-q2-red/40 disabled:opacity-60"
                    >
                      <X className="h-4 w-4" aria-hidden />
                      {pending === 'reject' ? t('q2.decision.reject.busy') : t('q2.decision.reject.label')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Q2Card>

          <div className="grid items-start gap-4 xl:grid-cols-2">
            {/* ── Candidate ─────────────────────────────────────────────── */}
            <Q2Card className="min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-q2-line bg-q2-emerald-tint p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-q2-emerald text-white">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[15px] font-bold text-q2-ink dark:text-white">
                    {t('q2.detail.candidate')}
                  </h3>
                  <p className="text-xs text-q2-muted">{t('q2.detail.candidateHelp')}</p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-q2-emerald-ink">
                  {t('q2.detail.profilePercent', { value: data.candidate.profileCompleteness })}
                </span>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <DetailField icon={Mail} label={t('q2.detail.email')} value={data.candidate.email} />
                  <DetailField icon={Phone} label={t('q2.detail.phone')} value={data.candidate.phone} />
                  <DetailField
                    icon={MapPin}
                    label={t('q2.detail.location')}
                    value={data.candidate.location}
                  />
                  <DetailField
                    icon={Clock}
                    label={t('q2.detail.experience')}
                    value={experienceLabel(data.candidate.totalExp)}
                  />
                  <DetailField
                    icon={GraduationCap}
                    label={t('q2.detail.education')}
                    value={data.candidate.education}
                  />
                  <DetailField
                    icon={Clock}
                    label={t('q2.detail.noticePeriod')}
                    value={noticeLabel(data.candidate.noticePeriod)}
                  />
                </div>

                <div>
                  <SectionLabel>{t('q2.detail.candidateSkills')}</SectionLabel>
                  {data.candidate.skills.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.candidate.skills.map((s) => (
                        <SkillTag key={s} tone="green">
                          {s}
                        </SkillTag>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[13px] text-q2-muted">{t('q2.detail.noSkills')}</p>
                  )}
                </div>

                <div>
                  <SectionLabel>{t('q2.detail.resume')}</SectionLabel>
                  {data.candidate.resume ? (
                    <div className="mt-2 flex flex-wrap items-center gap-3 rounded-xl border border-q2-line bg-q2-canvas p-3 dark:border-gray-700 dark:bg-gray-700/40">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-q2-surface text-q2-muted shadow-q2-card dark:bg-gray-800">
                        <FileText className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-q2-ink dark:text-gray-100">
                          {data.candidate.resume.name}
                        </p>
                        <p className="truncate text-xs text-q2-muted">
                          {resumeMetaLabel(
                            t('q2.detail.resumeHelp'),
                            data.candidate.resume.pageCount,
                            data.candidate.resume.sizeBytes,
                          )}
                        </p>
                      </div>
                      {/*
                        Opens the stored CV. The API already serves candidate resumes at
                        /recruitment/candidates/:id/resume for QC1/QC2, so this reuses that
                        endpoint rather than adding a Q2-only file route.
                      */}
                      <a
                        href={`/api/recruitment/candidates/${data.subscriberId}/resume`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-q2-emerald px-3 py-2 text-xs font-semibold text-white outline-none transition hover:bg-q2-emerald-hover focus-visible:ring-2 focus-visible:ring-q2-emerald/40"
                      >
                        <Eye className="h-3.5 w-3.5" aria-hidden />
                        {t('q2.detail.preview')}
                      </a>
                    </div>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-[13px] text-q2-amber">
                      <FileText className="h-4 w-4" aria-hidden />
                      {t('q2.detail.noResume')}
                    </p>
                  )}
                </div>

                {/* Candidate Scoring */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <SectionLabel>{t('q2.scoring.title')}</SectionLabel>
                      <p className="mt-0.5 text-xs text-q2-muted">{t('q2.scoring.help')}</p>
                    </div>
                    <p className="shrink-0 font-display text-2xl font-extrabold text-q2-emerald-ink">
                      {data.scoring.totalScore}%
                    </p>
                  </div>

                  <div className="mt-3 space-y-2.5">
                    {data.scoring.criteria.map((c) => (
                      <ScoreRow
                        key={c.key}
                        label={c.label}
                        score={c.score}
                        weight={c.weight}
                        included={c.included}
                        disabled={setCriterion.isPending}
                        onToggle={(next) => onToggle(c.key, next)}
                      />
                    ))}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-q2-emerald-soft px-3 py-2.5 dark:bg-gray-700">
                    <p className="min-w-0 text-[13px] font-semibold text-q2-ink dark:text-gray-100">
                      {t('q2.scoring.total')}{' '}
                      <span className="font-normal text-q2-muted">
                        {t('q2.scoring.criteriaCount', {
                          selected: data.scoring.selectedCount,
                          total: data.scoring.criteriaCount,
                        })}
                      </span>
                    </p>
                    <p className="shrink-0 font-display text-base font-extrabold text-q2-emerald-ink">
                      {data.scoring.totalScore}%
                    </p>
                  </div>
                </div>
              </div>
            </Q2Card>

            {/* ── Job Description ───────────────────────────────────────── */}
            <Q2Card className="min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-q2-line bg-q2-blue-tint p-4 sm:p-5 dark:border-gray-700 dark:bg-gray-800">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-q2-blue text-white">
                  <Briefcase className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[15px] font-bold text-q2-ink dark:text-white">
                    {t('q2.detail.jobDescription')}
                  </h3>
                  <p className="truncate text-xs text-q2-muted">
                    {[data.job.title, data.job.company].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="space-y-5 p-4 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  {data.job.jobType && <JobChip>{data.job.jobType}</JobChip>}
                  {data.job.workMode && <JobChip>{data.job.workMode}</JobChip>}
                  <JobChip>{expRangeLabel(data.job.minExp, data.job.maxExp)}</JobChip>
                  <JobChip>{ctcLabel(data.job.minCTC, data.job.maxCTC)}</JobChip>
                </div>

                {data.job.description && (
                  <p className="text-[13px] leading-relaxed text-q2-ink-soft dark:text-gray-300">
                    {data.job.description}
                  </p>
                )}

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <DetailField
                    icon={Building2}
                    label={t('q2.jobInfo.company')}
                    value={data.job.company}
                  />
                  <DetailField
                    icon={Clock}
                    label={t('q2.detail.experience')}
                    value={expRangeLabel(data.job.minExp, data.job.maxExp)}
                  />
                  <DetailField
                    icon={MapPin}
                    label={t('q2.detail.location')}
                    value={data.job.location}
                  />
                  <DetailField
                    icon={GraduationCap}
                    label={t('q2.detail.qualification')}
                    value={data.job.qualification}
                  />
                </div>

                <div>
                  <SectionLabel>{t('q2.jobInfo.requiredSkills')}</SectionLabel>
                  {data.job.requiredSkills.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {data.job.requiredSkills.map((s) => (
                        <SkillTag key={s}>{s}</SkillTag>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[13px] text-q2-muted">{t('q2.detail.noRequiredSkills')}</p>
                  )}
                </div>

                {/* Resume × JD Coverage */}
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <SectionLabel>{t('q2.coverage.title')}</SectionLabel>
                    <p className="shrink-0 font-display text-2xl font-extrabold text-q2-emerald-ink">
                      {data.overallScore}%
                    </p>
                  </div>

                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="min-w-0">
                      <CoverageHeading kind="matched" count={data.coverage.matched.length} />
                      {data.coverage.matched.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {data.coverage.matched.map((s) => (
                            <SkillTag key={s} tone="green">
                              {s}
                            </SkillTag>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[13px] text-q2-muted">
                          {t('q2.coverage.noneMatched')}
                        </p>
                      )}
                    </div>
                    <div className="min-w-0">
                      <CoverageHeading kind="missing" count={data.coverage.missing.length} />
                      {data.coverage.missing.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {data.coverage.missing.map((s) => (
                            <span
                              key={s}
                              className="inline-flex items-center rounded-md bg-q2-red-soft px-2 py-1 text-xs font-medium text-q2-red"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[13px] text-q2-ink-soft dark:text-gray-300">
                          {t('q2.coverage.fullCoverage')}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-q2-ink dark:text-gray-100">
                      {t('q2.coverage.whyTheyMatch')}
                    </p>
                    {data.coverage.reasons.length ? (
                      <ul className="mt-2 space-y-1.5">
                        {data.coverage.reasons.map((r) => (
                          <li
                            key={r}
                            className="flex items-start gap-2 text-[13px] text-q2-ink-soft dark:text-gray-300"
                          >
                            <Check
                              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-q2-emerald-ink"
                              aria-hidden
                            />
                            {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-2 text-[13px] text-q2-muted">{t('q2.coverage.noReasons')}</p>
                    )}
                  </div>
                </div>
              </div>
            </Q2Card>
          </div>
        </>
      )}
    </Q2Shell>
  );
}
