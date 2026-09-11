import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, Download, GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Button, Card, ProfileSkeleton, Modal, Select, statusTone } from '@/components/ui';
import { useToast } from '@/components/ui';
import {
  type CandidateDecision,
  type ScoreBreakdown,
  useActiveJobs,
  useAssignDocuments,
  useAssignJob,
  useCandidateDetail,
  useDecideCandidate,
  useDocumentTypes,
  useDownloadCandidateResume,
  useReferToQ3,
  useScoreApplication,
} from '../recruitment.api';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';

/** QC/Client — full candidate detail view (candidate-details.aspx). */
export default function CandidateDetailsPage() {
  const { t } = useTranslation('common');
  const { id = '' } = useParams();
  const { data, isLoading } = useCandidateDetail(id);
  const decide = useDecideCandidate(id);
  const assignJob = useAssignJob(id);
  const { data: jobOptions } = useActiveJobs();
  const assignDocs = useAssignDocuments(id);
  const { data: documentTypes } = useDocumentTypes();
  const downloadResume = useDownloadCandidateResume(id);
  const referToQ3 = useReferToQ3();
  const { user } = useAuth();
  const { notify } = useToast();

  // `POST /candidates/:id/documents` is @Roles(QC2, Admin). QC1 saw the button, pressed it,
  // and got a 403 with nothing on screen to explain why — so it is theirs to see or not.
  const canAssignDocuments = user?.roleId === Role.QC2 || user?.roleId === Role.Admin;
  // `POST /recruitment/referrals` is @Roles(QC2, Admin), and the column behind it is
  // `referredByQ2At` — referral is Q2's step, between Q1's approval and Q3's forwarding.
  const canRefer = user?.roleId === Role.QC2 || user?.roleId === Role.Admin;

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [docsOpen, setDocsOpen] = useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = useState<number[]>([]);
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<CandidateDecision | ''>('');
  const [decisionReason, setDecisionReason] = useState('');
  const [lastAssignedMapId, setLastAssignedMapId] = useState<number | null>(null);
  const [scoreResult, setScoreResult] = useState<ScoreBreakdown | null>(null);
  const [scoreOpen, setScoreOpen] = useState(false);
  const scoreApplication = useScoreApplication();

  /**
   * The application to score. `lastAssignedMapId` only exists after assigning a job in this
   * same page session; the server now reports the candidate's newest mapping too, so a
   * candidate mapped last week can still be scored instead of the button simply vanishing.
   */
  const scoreMapId = lastAssignedMapId ?? data?.latestJobSubscriberMapId ?? null;
  /** A freshly computed score wins; otherwise show the one already stored. */
  const shownScore = scoreResult ?? data?.score ?? null;

  const DECISION_TONE: Record<CandidateDecision, 'success' | 'info' | 'error'> = {
    Approved: 'success',
    Rejected: 'error',
    OnHold: 'info',
    NeedMoreInfo: 'info',
    Duplicate: 'error',
    Withdrawn: 'info',
  };

  const needsReason = (d: CandidateDecision) => d !== 'Approved';

  const startDecision = (decision: CandidateDecision) => {
    if (needsReason(decision)) {
      setPendingDecision(decision);
      setDecisionReason('');
      setDecisionOpen(true);
    } else {
      submitDecision(decision);
    }
  };

  const submitDecision = (decision: CandidateDecision, reason?: string) =>
    decide.mutate({ decision, reason }, {
      onSuccess: () => {
        notify(t(`recruitment.decision.${decision}`), DECISION_TONE[decision]);
        setDecisionOpen(false);
        setPendingDecision('');
        setDecisionReason('');
      },
      onError: (e) =>
        notify(isAxiosError(e) ? e.response?.data?.message ?? t('errors.somethingWrong') : t('errors.somethingWrong'), 'error'),
    });

  const onAssign = () => {
    if (!selectedJobId) return;
    assignJob.mutate(Number(selectedJobId), {
      onSuccess: (data: { jobSubscriberMapId?: number }) => {
        notify(t('recruitment.candidateAssigned'), 'success');
        setAssignOpen(false);
        setSelectedJobId('');
        if (data?.jobSubscriberMapId) setLastAssignedMapId(data.jobSubscriberMapId);
      },
      onError: (e) =>
        notify(isAxiosError(e) ? e.response?.data?.message ?? t('recruitment.couldNotAssign') : t('recruitment.couldNotAssign'), 'error'),
    });
  };

  const onScore = () => {
    if (!scoreMapId) return;
    scoreApplication.mutate(scoreMapId, {
      onSuccess: (result) => {
        setScoreResult(result);
        setScoreOpen(true);
      },
      onError: (e) =>
        notify(isAxiosError(e) ? e.response?.data?.message ?? t('errors.somethingWrong') : t('errors.somethingWrong'), 'error'),
    });
  };

  const toggleDocType = (docTypeId: number) =>
    setSelectedDocTypes((prev) =>
      prev.includes(docTypeId) ? prev.filter((d) => d !== docTypeId) : [...prev, docTypeId],
    );

  const onAssignDocs = () => {
    if (!selectedDocTypes.length) return;
    assignDocs.mutate(selectedDocTypes, {
      onSuccess: () => {
        notify(t('recruitment.documentsAssigned'), 'success');
        setDocsOpen(false);
        setSelectedDocTypes([]);
      },
      onError: (e) =>
        notify(isAxiosError(e) ? e.response?.data?.message ?? t('recruitment.couldNotAssignDocs') : t('recruitment.couldNotAssignDocs'), 'error'),
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('recruitment.candidates'), to: '/recruitment/candidates' }, { label: t('recruitment.candidateDetails') }]} />

      {isLoading || !data ? (
        <ProfileSkeleton />
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <img
                src={data.photoUrl ?? '/files/no-image.png'}
                alt={data.fullName}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-soft"
              />
              <div className="text-center sm:text-left">
                <h1 className="font-heading text-2xl font-bold text-navy">{data.fullName}</h1>
                <p className="text-primary">{data.designation}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-600 dark:text-gray-300 sm:justify-start">
                  <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {data.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {data.mobile}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {data.city}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {data.totalExperience}</span>
                </div>
                <div className="mt-2 flex justify-center sm:justify-start">
                  <Badge tone={statusTone(data.registrationStatus)}>{data.registrationStatus}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.registrationStatus === 'Pending' && (
                <>
                  <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => startDecision('Approved')}>
                    {t('recruitment.approveCV')}
                  </Button>
                  <Button variant="danger" size="sm" disabled={decide.isPending} onClick={() => startDecision('Rejected')}>
                    {t('actions.reject')}
                  </Button>
                  <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => startDecision('OnHold')}>
                    {t('recruitment.decision.OnHold')}
                  </Button>
                  <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => startDecision('NeedMoreInfo')}>
                    {t('recruitment.decision.NeedMoreInfo')}
                  </Button>
                  <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => startDecision('Duplicate')}>
                    {t('recruitment.decision.Duplicate')}
                  </Button>
                  <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => startDecision('Withdrawn')}>
                    {t('recruitment.decision.Withdrawn')}
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                {t('recruitment.assignJob')}
              </Button>
              {canAssignDocuments && (
                <Button variant="outline" size="sm" onClick={() => setDocsOpen(true)}>
                  {t('recruitment.assignDocuments')}
                </Button>
              )}
              {/* The CV is the thing being judged here, and the screen could not open one:
                  `resumeUrl` on this payload points at /files/resume, which resolves the
                  subscriber from the bearer token and would hand the reviewer their own. */}
              {data.resumeFileName && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloadResume.isPending}
                  onClick={() =>
                    downloadResume.mutate(data.resumeFileName ?? 'resume', {
                      onError: () => notify(t('errors.somethingWrong'), 'error'),
                    })
                  }
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {downloadResume.isPending ? t('actions.loading') : t('recruitment.downloadCv')}
                </Button>
              )}
              {/* The Q2→Q3→Company pipeline had no entry point: Q3 could forward a referral
                  to a company, but nothing anywhere created one, so the queue could only
                  ever be empty. This is the step that puts a CV into it. */}
              {canRefer && scoreMapId && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={referToQ3.isPending}
                  onClick={() =>
                    referToQ3.mutate([scoreMapId], {
                      onSuccess: (r: { referred: number }) =>
                        notify(
                          r?.referred
                            ? t('recruitment.referredToQ3')
                            : t('recruitment.alreadyReferred'),
                          r?.referred ? 'success' : 'info',
                        ),
                      onError: (e) =>
                        notify(
                          isAxiosError(e)
                            ? e.response?.data?.message ?? t('errors.somethingWrong')
                            : t('errors.somethingWrong'),
                          'error',
                        ),
                    })
                  }
                >
                  {referToQ3.isPending ? t('actions.loading') : t('recruitment.referToQ3')}
                </Button>
              )}
              {scoreMapId && (
                <Button variant="outline" size="sm" disabled={scoreApplication.isPending} onClick={onScore}>
                  {scoreApplication.isPending
                    ? t('actions.loading')
                    : data.score
                      ? t('recruitment.scoreWithValue', { score: Math.round(data.score.totalScore) })
                      : t('recruitment.scoreApplication')}
                </Button>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg">{t('recruitment.skills')}</h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <span key={s} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-primary">{s}</span>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" /> {t('recruitment.experience')}</h2>
              <ul className="space-y-4">
                {data.experience.map((e, i) => (
                  <li key={i} className="border-l-2 border-brand-soft pl-3">
                    <p className="font-medium text-navy">{e.designation}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{e.company}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{e.from} — {e.to}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-primary" /> {t('recruitment.education')}</h2>
              <ul className="space-y-4">
                {data.education.map((e, i) => (
                  <li key={i} className="border-l-2 border-brand-soft pl-3">
                    <p className="font-medium text-navy">{e.degree}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{e.institute}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{e.year}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title={t('recruitment.assignJob')}>
        <div className="space-y-4">
          <Select
            label={t('recruitment.jobOpening')}
            placeholder={t('recruitment.selectJob')}
            options={(jobOptions ?? []).map((j) => ({ label: `${j.designation} — ${j.company}`, value: j.jobId }))}
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button size="sm" disabled={!selectedJobId || assignJob.isPending} onClick={onAssign}>
              {t('actions.assign')}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={docsOpen} onClose={() => setDocsOpen(false)} title={t('recruitment.assignRequiredDocs')}>
        <div className="space-y-4">
          <div className="space-y-2">
            {(documentTypes ?? []).map((d) => (
              <label key={d.documentTypeId} className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.includes(d.documentTypeId)}
                  onChange={() => toggleDocType(d.documentTypeId)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                {d.name}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDocsOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button size="sm" disabled={!selectedDocTypes.length || assignDocs.isPending} onClick={onAssignDocs}>
              {t('actions.assign')}
            </Button>
          </div>
        </div>
      </Modal>

      {pendingDecision && (
        <Modal open={decisionOpen} onClose={() => setDecisionOpen(false)} title={t(`recruitment.decision.${pendingDecision}`)}>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-navy">
              {t('recruitment.decisionReason')}
              <textarea
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800"
                rows={3}
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={t('recruitment.decisionReasonPlaceholder')}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDecisionOpen(false)}>
                {t('actions.cancel')}
              </Button>
              <Button
                size="sm"
                variant={pendingDecision === 'Rejected' || pendingDecision === 'Duplicate' ? 'danger' : 'primary'}
                disabled={decide.isPending}
                onClick={() => submitDecision(pendingDecision as CandidateDecision, decisionReason || undefined)}
              >
                {t('actions.confirm')}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <Modal open={scoreOpen} onClose={() => setScoreOpen(false)} title={t('recruitment.scoreBreakdown')}>
        {shownScore && (
          <div className="space-y-3">
            <div className="text-center">
              <span className="text-3xl font-bold text-primary">{Math.round(shownScore.totalScore)}%</span>
              <p className="text-sm text-gray-500">{t('recruitment.totalScore')}</p>
            </div>
            <div className="space-y-2">
              {([
                ['recruitment.score.skill', shownScore.skillScore, 30],
                ['recruitment.score.experience', shownScore.experienceScore, 25],
                ['recruitment.score.jobRole', shownScore.jobRoleScore, 20],
                ['recruitment.score.education', shownScore.educationScore, 10],
                ['recruitment.score.location', shownScore.locationScore, 5],
                ['recruitment.score.salary', shownScore.salaryScore, 5],
                ['recruitment.score.noticePeriod', shownScore.noticePeriodScore, 5],
              ] as const).map(([key, score, weight]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs text-navy">
                    <span>{t(key)} ({weight}%)</span>
                    <span>{Math.round(score)}%</span>
                  </div>
                  <div className="mt-0.5 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(score)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setScoreOpen(false)}>{t('actions.close')}</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
