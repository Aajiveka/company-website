import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  ArrowLeft,
  Briefcase,
  Clock,
  Download,
  FileText,
  FileX2,
  GraduationCap,
  MapPin,
  Phone,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { useToast } from '@/components/ui';
import {
  useContactCandidate,
  useQ1Profile,
  useRequestCv,
  useRequestProfileUpdate,
  useSetAllChecklist,
  useSetChecklistItem,
  useUpdateScreeningStatus,
  useVerifyCandidate,
} from '../q1.api';
import { ContactCandidateModal } from '../components/ContactCandidateModal';
import { Q1Shell } from '../components/Q1Shell';
import { Q1Button } from '../components/Q1Modal';
import { ScreeningRail } from '../components/ScreeningRail';
import { UpdateStatusModal } from '../components/UpdateStatusModal';
import { STATUS_LABEL, experienceLabel } from '../q1.format';
import { Field, Q1Card } from '../components/primitives';

const money = (n: number | null) =>
  n == null ? null : `₹${new Intl.NumberFormat('en-IN').format(n)}`;

/** Candidate Profile — the screening screen. */
export default function Q1CandidateProfilePage() {
  const { t } = useTranslation('common');
  const { id = '' } = useParams();
  const { notify } = useToast();
  const { data, isLoading, isError, refetch } = useQ1Profile(id);

  const toggle = useSetChecklistItem(id);
  const toggleAll = useSetAllChecklist(id);
  const verify = useVerifyCandidate(id);
  const contact = useContactCandidate(id);
  const requestUpdate = useRequestProfileUpdate(id);
  const requestCv = useRequestCv(id);
  const updateStatus = useUpdateScreeningStatus(id);

  const [contactOpen, setContactOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);

  const busy =
    toggle.isPending ||
    toggleAll.isPending ||
    verify.isPending ||
    requestUpdate.isPending ||
    requestCv.isPending;

  const askForCv = async () => {
    try {
      await requestCv.mutateAsync({ channel: 'Email', reason: t('q1.contact.defaultReason') });
      notify(t('q1.profile.cvRequested'), 'success');
    } catch (e) {
      notify(
        isAxiosError(e) ? (e.response?.data?.message ?? t('errors.somethingWrong')) : t('errors.somethingWrong'),
        'error',
      );
    }
  };

  return (
    <Q1Shell title={t('q1.profile.title')} subtitle={t('q1.profile.subtitle')}>
      <Link
        to="/q1/candidates"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-q1-ink-soft transition hover:text-q1-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40 dark:text-gray-300"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        {t('q1.profile.back')}
      </Link>

      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : isLoading || !data ? (
        <ProfileSkeleton />
      ) : (
        <>
          {/* Blue hero */}
          <div className="rounded-2xl bg-q1-blue p-5 text-white sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white/20 font-display text-xl font-extrabold text-white">
                {data.fullName.trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-2xl font-extrabold">{data.fullName}</h2>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                    {STATUS_LABEL[data.screening.status]}
                  </span>
                </div>
                <p className="mt-1 text-base text-white/85">{data.currentDesignation || data.designation || '—'}</p>

                <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" aria-hidden /> {data.city || '—'}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Briefcase className="h-4 w-4" aria-hidden />
                    {t('q1.profile.experienceSummary', {
                      total: experienceLabel(Number(data.totalExperience) || null),
                      relevant:
                        data.relevantExpMonths != null
                          ? `${Math.round(data.relevantExpMonths / 12)} yrs`
                          : '—',
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" aria-hidden />
                    {data.noticePeriod != null ? `${data.noticePeriod} Days` : '—'}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <HeroButton
                    icon={FileText}
                    label={t('q1.profile.viewCv')}
                    disabled={!data.resumeFileName}
                    onClick={() => window.open(`/api/recruitment/candidates/${id}/resume`, '_blank')}
                  />
                  <HeroButton
                    icon={Download}
                    label={t('q1.profile.downloadCv')}
                    disabled={!data.resumeFileName}
                    onClick={() => window.open(`/api/recruitment/candidates/${id}/resume`, '_blank')}
                  />
                  <HeroButton
                    icon={Phone}
                    label={t('q1.profile.contactCandidate')}
                    onClick={() => setContactOpen(true)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Two columns: profile cards + sticky screening rail */}
          <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <Q1Card className="overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-q1-line px-5 py-4 dark:border-gray-700">
                  <h3 className="font-display text-sm font-bold text-q1-ink dark:text-white">
                    {t('q1.profile.summary')}
                  </h3>
                  <span className="text-xs font-semibold text-q1-blue">
                    {t('q1.profile.expected', { value: money(data.expectedSalary) ?? '—' })}
                  </span>
                </div>
                <p className="px-5 py-4 text-sm leading-relaxed text-q1-ink-soft dark:text-gray-300">
                  {data.profileSummary || t('q1.profile.noSummary')}
                </p>
              </Q1Card>

              <SectionCard title={t('q1.profile.personalDetails')}>
                <Field label={t('q1.fields.dob')} value={data.dateOfBirth} />
                <Field label={t('q1.fields.gender')} value={data.gender} />
                <Field label={t('q1.fields.phone')} value={data.mobile} />
                <Field label={t('q1.fields.email')} value={data.email} />
                <Field label={t('q1.fields.location')} value={data.city} />
                <Field label={t('q1.fields.linkedin')} value={data.linkedInUrl} />
              </SectionCard>

              <SectionCard title={t('q1.profile.professionalDetails')}>
                <Field label={t('q1.fields.professionalTitle')} value={data.professionalTitle} />
                <Field label={t('q1.fields.currentDesignation')} value={data.currentDesignation} />
                <Field
                  label={t('q1.fields.totalExperience')}
                  value={experienceLabel(Number(data.totalExperience) || null)}
                />
                <Field
                  label={t('q1.fields.relevantExperience')}
                  value={data.relevantExpMonths != null ? `${Math.round(data.relevantExpMonths / 12)} yrs` : null}
                />
                <Field label={t('q1.fields.currentCompany')} value={data.currentCompany} />
                <Field
                  label={t('q1.fields.previousCompanies')}
                  value={data.previousCompanies.join(', ')}
                />
                <Field
                  label={t('q1.fields.noticePeriod')}
                  value={data.noticePeriod != null ? `${data.noticePeriod} Days` : null}
                />
                <Field label={t('q1.fields.expectedSalary')} value={money(data.expectedSalary)} />
              </SectionCard>

              <Q1Card className="overflow-hidden">
                <h3 className="border-b border-q1-line px-5 py-4 font-display text-sm font-bold text-q1-ink dark:border-gray-700 dark:text-white">
                  {t('q1.profile.education')}
                </h3>
                {data.education.length ? (
                  <ul className="divide-y divide-q1-line dark:divide-gray-700">
                    {data.education.map((e, i) => (
                      <li key={i} className="flex items-start gap-3 px-5 py-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-q1-blue-soft font-display text-xs font-bold text-q1-blue">
                          {(e.institute || '?').slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-q1-ink dark:text-gray-100">
                            {e.degree || '—'}
                          </p>
                          <p className="text-sm text-q1-ink-soft dark:text-gray-300">{e.institute || '—'}</p>
                          <p className="mt-0.5 text-xs text-q1-muted">{e.year || '—'}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-6 text-sm text-q1-muted">
                    <GraduationCap className="mr-2 inline h-4 w-4" aria-hidden />
                    {t('q1.profile.noEducation')}
                  </p>
                )}
              </Q1Card>

              <Q1Card className="overflow-hidden">
                <h3 className="border-b border-q1-line px-5 py-4 font-display text-sm font-bold text-q1-ink dark:border-gray-700 dark:text-white">
                  {t('q1.profile.skills')}
                </h3>
                <div className="flex flex-wrap gap-2 px-5 py-4">
                  {data.skills.length ? (
                    data.skills.map((s) => (
                      <span
                        key={s}
                        className="rounded-lg bg-q1-blue-soft px-2.5 py-1 text-xs font-medium text-q1-blue"
                      >
                        {s}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-q1-muted">{t('q1.profile.noSkills')}</p>
                  )}
                </div>
              </Q1Card>

              <Q1Card className="overflow-hidden">
                <h3 className="border-b border-q1-line px-5 py-4 font-display text-sm font-bold text-q1-ink dark:border-gray-700 dark:text-white">
                  {t('q1.profile.resume')}
                </h3>
                {data.resumeFileName ? (
                  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-q1-blue text-white">
                        <FileText className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-q1-ink dark:text-gray-100">
                          {data.resumeFileName}
                        </p>
                        <p className="text-xs text-q1-muted">
                          {t('q1.profile.uploadedOn', { date: data.resumeUploadedAt ?? '—' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Q1Button
                        variant="ghost"
                        className="px-3 py-2 text-xs"
                        onClick={() => window.open(`/api/recruitment/candidates/${id}/resume`, '_blank')}
                      >
                        {t('q1.profile.open')}
                      </Q1Button>
                      <Q1Button
                        variant="ghost"
                        className="px-3 py-2 text-xs"
                        onClick={() => window.open(`/api/recruitment/candidates/${id}/resume`, '_blank')}
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        {t('q1.profile.download')}
                      </Q1Button>
                    </div>
                  </div>
                ) : (
                  /* The CV empty state from the "Profile Incomplete" frame. */
                  <div className="px-5 py-10 text-center">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-q1-amber-soft text-q1-amber">
                      <FileX2 className="h-6 w-6" aria-hidden />
                    </span>
                    <p className="mt-3 font-display text-sm font-bold text-q1-ink dark:text-white">
                      {t('q1.profile.noCvTitle')}
                    </p>
                    <p className="mt-1 text-xs text-q1-muted">{t('q1.profile.noCvBody')}</p>
                    <Q1Button
                      className="mx-auto mt-4 px-3 py-2 text-xs"
                      disabled={requestCv.isPending}
                      onClick={() => void askForCv()}
                    >
                      {requestCv.isPending ? t('actions.loading') : t('q1.profile.requestCv')}
                    </Q1Button>
                  </div>
                )}
              </Q1Card>
            </div>

            <div className="xl:sticky xl:top-24 xl:self-start">
              <ScreeningRail
                profile={data}
                isBusy={busy}
                onToggle={(item, checked) => toggle.mutateAsync({ item, checked })}
                onToggleAll={(checked) => toggleAll.mutateAsync(checked)}
                onVerify={() => verify.mutateAsync()}
                onContact={() => setContactOpen(true)}
                onRequestUpdate={() =>
                  requestUpdate.mutateAsync({
                    channel: 'Email',
                    reason: t('q1.contact.defaultReason'),
                  })
                }
              />
            </div>
          </div>

          <ContactCandidateModal
            open={contactOpen}
            onClose={() => setContactOpen(false)}
            onContinue={() => setStatusOpen(true)}
            candidateName={data.fullName}
            candidateId={data.subscriberId}
            phone={data.mobile}
            missingItems={data.missingItems}
            isPending={contact.isPending}
            onSubmit={(payload) => contact.mutateAsync(payload)}
          />

          <UpdateStatusModal
            open={statusOpen}
            onClose={() => setStatusOpen(false)}
            candidateName={data.fullName}
            candidateId={data.subscriberId}
            currentAttempts={data.screening.contactAttempts}
            isPending={updateStatus.isPending}
            onSubmit={(payload) => updateStatus.mutateAsync(payload)}
          />
        </>
      )}
    </Q1Shell>
  );
}

function HeroButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Q1Card className="overflow-hidden">
      <h3 className="border-b border-q1-line px-5 py-4 font-display text-sm font-bold text-q1-ink dark:border-gray-700 dark:text-white">
        {title}
      </h3>
      <dl className="grid gap-x-6 gap-y-4 px-5 py-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </Q1Card>
  );
}

function ProfileSkeleton() {
  return (
    <div className="animate-pulse space-y-5">
      <div className="h-40 rounded-2xl bg-q1-chip dark:bg-gray-700" />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-40 rounded-xl bg-q1-chip dark:bg-gray-700" />
          ))}
        </div>
        <div className="h-96 rounded-xl bg-q1-chip dark:bg-gray-700" />
      </div>
    </div>
  );
}
