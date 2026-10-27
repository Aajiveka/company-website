import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAdminApplication } from '../admin.api';
import { PIPELINE_STAGES, STAGE_LABEL, type AdminApplicationDetail } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import { AuditList } from '../components/AuditList';
import { NextStepLink } from '../components/NextStepLink';
import {
  ErrorState,
  Facts,
  Panel,
  Pill,
} from '../components/primitives';
import { STAGE_TONE, fmtDate } from '../admin.format';

/** The stages as a stepper. Closed is an exit, not a step, so it is shown as a state instead. */
function StageStepper({ a }: { a: AdminApplicationDetail }) {
  const steps = PIPELINE_STAGES.filter((s) => s !== 'Closed');
  const current = steps.indexOf(a.stage as (typeof steps)[number]);
  if (a.stage === 'Closed') {
    return (
      <p className="text-sm text-gray-700 dark:text-gray-200">
        This application is <strong>closed</strong> ({a.status}). It no longer moves through the pipeline.
      </p>
    );
  }
  return (
    <ol className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-0" aria-label="Pipeline progress">
      {steps.map((s, i) => {
        const done = i < current;
        const here = i === current;
        return (
          <li key={s} className="flex items-center gap-2 sm:flex-1 sm:flex-col sm:text-center" aria-current={here ? 'step' : undefined}>
            {done ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" aria-hidden />
            ) : (
              <Circle className={cn('h-5 w-5 shrink-0', here ? 'fill-aj-blue text-aj-blue' : 'text-gray-300 dark:text-gray-600')} aria-hidden />
            )}
            <span className={cn('text-xs', here ? 'font-bold text-navy dark:text-white' : done ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400')}>
              {STAGE_LABEL[s]}
              <span className="sr-only">{done ? ' (done)' : here ? ' (current)' : ''}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function AdminApplicationDetailPage() {
  const id = Number(useParams().mapId);
  const { data: a, isLoading, error, refetch } = useAdminApplication(id);
  const title = a ? `${a.candidate.name} → ${a.job.designation || 'job'}` : `Application #${id}`;

  return (
    <AdminShell
      title={isLoading ? 'Application' : title}
      subtitle={a ? `Application #${a.mapId} · ${a.job.company}` : undefined}
      crumbs={[
        { label: 'Dashboard', to: '/admin' },
        { label: 'Applications', to: '/admin/applications' },
        { label: `#${id}` },
      ]}
    >
      {error ? (
        <Panel>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Panel>
      ) : isLoading || !a ? (
        <div className="h-64 animate-pulse rounded-xl bg-white dark:bg-gray-800" aria-busy="true" />
      ) : (
        <div className="space-y-5">
          <Panel
            title="Where it stands"
            action={
              <span className="flex items-center gap-2">
                <Pill tone={STAGE_TONE[a.stage]}>{STAGE_LABEL[a.stage]}</Pill>
                <span className="text-xs text-gray-500">{a.status}</span>
              </span>
            }
          >
            <StageStepper a={a} />
            <div className="mt-4 rounded-lg border border-aj-line-soft bg-aj-surface-soft p-3 dark:border-gray-700 dark:bg-gray-700/40">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">Next step</p>
              <NextStepLink a={a} />
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div className="min-w-0 space-y-5 xl:col-span-2">
              <Panel title="Status history" description="Every status this application has had, oldest first" bodyClassName="p-0">
                {a.timeline.length ? (
                  <ol className="divide-y divide-aj-line-soft dark:divide-gray-700">
                    {a.timeline.map((t, i) => (
                      <li key={i} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3 text-sm sm:px-5">
                        <span className="font-medium text-gray-800 dark:text-gray-100">{t.label}</span>
                        <span className="text-xs text-gray-500">
                          {t.by} · {fmtDate(t.at, true)}
                        </span>
                        {t.comments && <p className="w-full text-xs text-gray-500">{t.comments}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="px-5 py-6 text-sm text-gray-500">No status changes logged.</p>
                )}
              </Panel>

              {a.referrals.length > 0 && (
                <Panel title="Referrals to the company" bodyClassName="p-0">
                  <ul className="divide-y divide-aj-line-soft text-sm dark:divide-gray-700">
                    {a.referrals.map((r) => (
                      <li key={r.id} className="space-y-1 px-4 py-3 sm:px-5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={r.status === 'Returned' || r.status === 'Expired' ? 'red' : r.status === 'SentToCompany' ? 'violet' : 'blue'}>
                            {r.status}
                          </Pill>
                          <span className="text-xs text-gray-500">Company review: {r.companyReviewStatus}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Referred by {r.referredBy} on {fmtDate(r.referredAt)}
                          {r.sentToCompanyAt && ` · sent to company ${fmtDate(r.sentToCompanyAt)}`}
                          {r.expiresAt && !r.returnedAt && ` · review window ends ${fmtDate(r.expiresAt)}`}
                        </p>
                        {r.returnedAt && (
                          <p className="text-xs text-red-700 dark:text-red-300">
                            Returned {fmtDate(r.returnedAt)}
                            {r.returnReason && ` — ${r.returnReason}`}
                            {r.returnNote && `: ${r.returnNote}`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              {a.rounds.length > 0 && (
                <Panel title="Interview rounds" bodyClassName="p-0">
                  <ul className="divide-y divide-aj-line-soft text-sm dark:divide-gray-700">
                    {a.rounds.map((r) => (
                      <li key={r.roundNumber} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {r.roundNumber}. {r.roundName}
                        </span>
                        <span className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <Pill tone={r.status === 'Completed' ? 'green' : r.status === 'NoShow' ? 'red' : 'blue'}>{r.status}</Pill>
                          {r.decision && <span>Decision: {r.decision}</span>}
                          {r.scheduledAt && <span>{fmtDate(r.scheduledAt, true)}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}

              <Panel title="Audit trail" bodyClassName="p-0">
                <AuditList entries={a.audit} empty="No audit entries reference this application directly." />
              </Panel>
            </div>

            <div className="min-w-0 space-y-5">
              <Panel title="Candidate">
                <Facts
                  items={[
                    ['Name', a.candidate.userId ? <Link key="u" to={`/admin/users/${a.candidate.userId}`} className="text-aj-blue hover:underline">{a.candidate.name}</Link> : a.candidate.name],
                    ['Email', a.candidate.email],
                    ['Mobile', a.candidate.mobile],
                    ['Applied', fmtDate(a.appliedAt)],
                  ]}
                />
              </Panel>
              <Panel title="Job">
                <Facts
                  items={[
                    ['Role', a.job.jobId ? <Link key="j" to={`/admin/jobs/${a.job.jobId}`} className="text-aj-blue hover:underline">{a.job.designation}</Link> : a.job.designation],
                    ['Company', a.job.company],
                    ['City', a.job.city],
                  ]}
                />
              </Panel>
              {a.matchReview && (
                <Panel title="Q2 match review">
                  <Facts
                    items={[
                      ['Status', a.matchReview.status],
                      ['Decided by', a.matchReview.decidedBy ?? '—'],
                      ['Decided', fmtDate(a.matchReview.decidedAt, true)],
                      ['Note', a.matchReview.note ?? '—'],
                    ]}
                  />
                </Panel>
              )}
              {(a.hiring || a.offer) && (
                <Panel title="Hiring & offer">
                  <Facts
                    items={[
                      ['Selected', fmtDate(a.hiring?.selectedAt)],
                      ['Documents requested', fmtDate(a.hiring?.docsRequestedAt)],
                      ['Documents due', fmtDate(a.hiring?.docsDueAt)],
                      ['Documents approved', fmtDate(a.hiring?.docsApprovedAt)],
                      ['Offer', a.offer ? `${a.offer.status}${a.offer.sentAt ? ` · sent ${fmtDate(a.offer.sentAt)}` : ''}` : '—'],
                      ['Joining date', fmtDate(a.offer?.joiningDate)],
                      ['Joined', fmtDate(a.hiring?.joinedAt)],
                    ]}
                  />
                </Panel>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
