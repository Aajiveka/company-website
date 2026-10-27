import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '@/lib/axios';
import { Button, ConfirmDialog, useToast } from '@/components/ui';
import ExportButton from '../components/ExportButton';
import { useAdminJobs, useModerateJobs } from '../admin.api';
import type { AdminJob, JobAction, JobStatus } from '../admin.types';
import { JOB_ACTION_COPY } from '../components/jobActions';
import { AdminShell } from '../components/AdminShell';
import {
  DataTable,
  Empty,
  ErrorState,
  Panel,
  Pill,
  SearchInput,
  StatusTabs,
  TableFooter,
  type ColumnDef,
} from '../components/primitives';
import { JOB_TONE, fmtCtc, fmtDate } from '../admin.format';

const PAGE_SIZE = 20;
type Tab = '' | JobStatus;


export default function AdminJobsPage() {
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const q = params.get('q') ?? '';
  const status = (params.get('status') ?? '') as Tab;
  const clientId = params.get('clientId') ? Number(params.get('clientId')) : undefined;

  const setFilter = useCallback(
    (key: string, value: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const { data, isLoading, error, refetch } = useAdminJobs({ page, pageSize: PAGE_SIZE, q, status, clientId });
  const moderate = useModerateJobs();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, setPending] = useState<{ action: JobAction; ids: number[] } | null>(null);

  // Bulk actions only make sense on one status at a time: Active rows close, Closed reopen.
  const bulkAction: JobAction | null = status === 'Active' ? 'close' : status === 'Closed' ? 'reopen' : null;

  const run = () => {
    if (!pending) return;
    moderate.mutate(
      { jobIds: pending.ids, action: pending.action },
      {
        onSuccess: (r) => {
          notify(`${r.updated} job${r.updated === 1 ? '' : 's'} ${pending.action === 'close' ? 'closed' : 'reopened'}`, 'success');
          setSelected(new Set());
          setPending(null);
        },
        onError: (e) => {
          notify(getErrorMessage(e, 'The jobs were not changed'), 'error');
          setPending(null);
        },
      },
    );
  };

  const columns: ColumnDef<AdminJob>[] = [
    {
      key: 'job',
      header: 'Job',
      cell: (j) => (
        <Link to={`/admin/jobs/${j.jobId}`} className="group block min-w-0">
          <span className="block truncate font-semibold text-navy group-hover:text-aj-blue group-hover:underline dark:text-white">
            {j.designation || `Job #${j.jobId}`}
          </span>
          <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">
            {j.company} · {j.city}
          </span>
        </Link>
      ),
    },
    { key: 'status', header: 'Status', cell: (j) => <Pill tone={JOB_TONE[j.status] ?? 'gray'}>{j.status}</Pill> },
    { key: 'ctc', header: 'CTC', cell: (j) => fmtCtc(j.minCtc, j.maxCtc), className: 'whitespace-nowrap' },
    {
      key: 'apps',
      header: 'Applications',
      cell: (j) =>
        j.applications ? (
          <Link to={`/admin/applications?jobId=${j.jobId}`} className="font-semibold tabular-nums text-aj-blue hover:underline">
            {j.applications}
          </Link>
        ) : (
          <span className="tabular-nums text-gray-400">0</span>
        ),
    },
    { key: 'posted', header: 'Posted', cell: (j) => fmtDate(j.postedOn), className: 'whitespace-nowrap' },
    {
      key: 'actions',
      header: 'Action',
      wideOnCard: true,
      cell: (j) =>
        j.allowedActions.length ? (
          <div className="flex gap-2">
            {j.allowedActions.map((a) => (
              <Button key={a} size="sm" variant={a === 'close' ? 'outline' : 'primary'} onClick={() => setPending({ action: a, ids: [j.jobId] })}>
                {JOB_ACTION_COPY[a].verb}
              </Button>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-400" title="Draft and archived jobs belong to the employer">
            Employer-managed
          </span>
        ),
    },
  ];

  const counts = data?.counts;
  const all = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : undefined;

  return (
    <AdminShell
      title="Jobs"
      subtitle="Every posting across all companies"
      crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Jobs' }]}
      actions={<ExportButton endpoint="/exports/jobs" filename="jobs" label="Export CSV" size="sm" variant="outline" />}
    >
      <Panel bodyClassName="p-0">
        <div className="space-y-3 border-b border-aj-line-soft p-4 dark:border-gray-700">
          <StatusTabs<Tab>
            label="Job status"
            value={status}
            onChange={(v) => {
              setSelected(new Set());
              setFilter('status', v);
            }}
            tabs={[
              { value: '', label: 'All', count: all },
              { value: 'Active', label: 'Active', count: counts?.Active },
              { value: 'Closed', label: 'Closed', count: counts?.Closed },
              { value: 'Draft', label: 'Draft', count: counts?.Draft },
              { value: 'Archived', label: 'Archived', count: counts?.Archived },
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput label="Search jobs" placeholder="Designation, company, city or job #" value={q} onChange={(v) => setFilter('q', v)} />
            {clientId && (
              <Button size="sm" variant="ghost" onClick={() => setFilter('clientId', '')}>
                Showing one company · clear
              </Button>
            )}
          </div>
          {!bulkAction && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Choose the Active or Closed tab to close or reopen several jobs at once. Employers post straight to Active,
              so there is nothing to approve; drafts and archived jobs stay with the employer.
            </p>
          )}
        </div>

        {bulkAction && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-aj-line-soft bg-aj-line-soft/60 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-aj-blue/10">
            <span className="font-semibold text-navy dark:text-white">{selected.size} selected</span>
            <Button size="sm" variant={bulkAction === 'close' ? 'danger' : 'primary'} onClick={() => setPending({ action: bulkAction, ids: [...selected] })}>
              {JOB_ACTION_COPY[bulkAction].verb} selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(j) => j.jobId}
            isLoading={isLoading}
            empty={<Empty title="No jobs match" hint="Try another status tab or search." />}
            selection={
              bulkAction
                ? {
                    selected,
                    toggle: (id) =>
                      setSelected((s) => {
                        const n = new Set(s);
                        if (n.has(id)) n.delete(id);
                        else n.add(id);
                        return n;
                      }),
                    toggleAll: (ids) =>
                      setSelected((s) => (ids.every((id) => s.has(id)) ? new Set() : new Set([...s, ...ids]))),
                    idOf: (j) => j.jobId,
                    selectable: (j) => j.allowedActions.includes(bulkAction),
                  }
                : undefined
            }
          />
        )}
        {data && (
          <TableFooter page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={(p) => setFilter('page', String(p))} />
        )}
      </Panel>

      <ConfirmDialog
        isOpen={pending != null}
        title={pending ? JOB_ACTION_COPY[pending.action].title : ''}
        message={pending ? `${pending.ids.length} job(s). ${JOB_ACTION_COPY[pending.action].body}` : ''}
        // "Close job", never bare "Close": the dialog's own × is also called Close.
        confirmLabel={
          pending
            ? `${JOB_ACTION_COPY[pending.action].verb} ${pending.ids.length === 1 ? 'job' : `${pending.ids.length} jobs`}`
            : 'Confirm'
        }
        variant={pending?.action === 'close' ? 'danger' : 'info'}
        isLoading={moderate.isPending}
        onConfirm={run}
        onCancel={() => setPending(null)}
      />
    </AdminShell>
  );
}
