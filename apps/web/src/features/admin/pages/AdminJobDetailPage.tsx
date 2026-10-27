import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { getErrorMessage } from '@/lib/axios';
import { Button, ConfirmDialog, useToast } from '@/components/ui';
import { useAdminJob, useModerateJobs } from '../admin.api';
import { PIPELINE_STAGES, STAGE_LABEL, type JobAction } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import { AuditList } from '../components/AuditList';
import { JOB_ACTION_COPY } from '../components/jobActions';
import {
  ErrorState,
  Facts,
  Panel,
  Pill,
} from '../components/primitives';
import { JOB_TONE, STAGE_TONE, fmtCtc, fmtDate } from '../admin.format';

export default function AdminJobDetailPage() {
  const id = Number(useParams().jobId);
  const { notify } = useToast();
  const { data: j, isLoading, error, refetch } = useAdminJob(id);
  const moderate = useModerateJobs();
  const [pending, setPending] = useState<JobAction | null>(null);

  const run = () => {
    if (!pending) return;
    moderate.mutate(
      { jobIds: [id], action: pending },
      {
        onSuccess: () => {
          notify(pending === 'close' ? 'Job closed' : 'Job reopened', 'success');
          setPending(null);
        },
        onError: (e) => {
          notify(getErrorMessage(e, 'The job was not changed'), 'error');
          setPending(null);
        },
      },
    );
  };

  const title = j ? j.designation || `Job #${id}` : 'Job';
  const exp = j && (j.minExp != null || j.maxExp != null) ? `${j.minExp ?? 0}–${j.maxExp ?? '—'} yrs` : '—';

  return (
    <AdminShell
      title={title}
      subtitle={j ? `${j.company} · ${j.city}` : undefined}
      crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Jobs', to: '/admin/jobs' }, { label: isLoading ? '…' : title }]}
      actions={
        j && (
          <>
            {j.status === 'Active' && (
              <Button asChild size="sm" variant="ghost">
                <Link to={`/jobs/${j.jobId}`} target="_blank" rel="noopener">
                  Public page <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            )}
            {j.allowedActions.map((a) => (
              <Button key={a} size="sm" variant={a === 'close' ? 'danger' : 'primary'} onClick={() => setPending(a)}>
                {JOB_ACTION_COPY[a].verb} job
              </Button>
            ))}
          </>
        )
      }
    >
      {error ? (
        <Panel>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Panel>
      ) : isLoading || !j ? (
        <div className="h-64 animate-pulse rounded-xl bg-white dark:bg-gray-800" aria-busy="true" />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="min-w-0 space-y-5 xl:col-span-2">
            <Panel title="Posting" action={<Pill tone={JOB_TONE[j.status] ?? 'gray'}>{j.status}</Pill>}>
              <Facts
                items={[
                  ['Company', <Link key="c" to={`/admin/jobs?clientId=${j.clientId}`} className="text-aj-blue hover:underline">{j.company}</Link>],
                  ['City', j.city],
                  ['CTC (per year)', fmtCtc(j.minCtc, j.maxCtc)],
                  ['Experience', exp],
                  ['Work mode', j.workMode],
                  ['Employment type', j.employmentType],
                  ['Openings', j.openings ?? '—'],
                  ['Posted', fmtDate(j.postedOn)],
                  ['Last updated', fmtDate(j.updatedAt, true)],
                ]}
              />
              {j.description && (
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer font-medium text-aj-blue">Job description</summary>
                  <p className="mt-2 whitespace-pre-line text-gray-700 dark:text-gray-200">{j.description}</p>
                </details>
              )}
              {!j.allowedActions.length && (
                <p className="mt-4 rounded-lg bg-aj-surface-soft p-3 text-xs text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
                  {j.status} jobs are managed by the employer from their portal; there is no admin action for them.
                </p>
              )}
            </Panel>

            <Panel
              title={`Applicants (${j.applications})`}
              description={j.applications > j.applicants.length ? `Latest ${j.applicants.length} shown` : undefined}
              action={
                j.applicants.length > 0 && (
                  <Link to={`/admin/applications?jobId=${j.jobId}`} className="text-sm font-semibold text-aj-blue hover:underline">
                    Open in Applications
                  </Link>
                )
              }
              bodyClassName="p-0"
            >
              {j.applicants.length ? (
                <ul className="divide-y divide-aj-line-soft dark:divide-gray-700">
                  {j.applicants.map((a) => (
                    <li key={a.mapId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm sm:px-5">
                      <Link to={`/admin/applications/${a.mapId}`} className="min-w-0 font-semibold text-navy hover:text-aj-blue hover:underline dark:text-white">
                        {a.candidate.name}
                      </Link>
                      <span className="flex items-center gap-2">
                        <Pill tone={STAGE_TONE[a.stage]}>{STAGE_LABEL[a.stage]}</Pill>
                        <span className="text-xs text-gray-500">{a.status}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-gray-500">No one has applied yet.</p>
              )}
            </Panel>
          </div>

          <div className="min-w-0 space-y-5">
            <Panel title="Pipeline for this job">
              <ul className="space-y-2 text-sm">
                {PIPELINE_STAGES.map((s) => (
                  <li key={s} className="flex items-center justify-between">
                    <Pill tone={STAGE_TONE[s]}>{STAGE_LABEL[s]}</Pill>
                    <span className="font-semibold tabular-nums text-navy dark:text-white">{j.applicationsByStage[s]}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Admin history" bodyClassName="p-0">
              <AuditList entries={j.history} empty="No admin changes to this job." />
            </Panel>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pending != null}
        title={pending ? JOB_ACTION_COPY[pending].title.replace('these jobs', 'this job') : ''}
        message={pending ? JOB_ACTION_COPY[pending].body : ''}
        confirmLabel={pending ? `${JOB_ACTION_COPY[pending].verb} job` : 'Confirm'}
        variant={pending === 'close' ? 'danger' : 'info'}
        isLoading={moderate.isPending}
        onConfirm={run}
        onCancel={() => setPending(null)}
      />
    </AdminShell>
  );
}
