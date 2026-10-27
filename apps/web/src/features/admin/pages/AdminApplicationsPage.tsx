import { useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import ExportButton from '../components/ExportButton';
import { useAdminApplications } from '../admin.api';
import { PIPELINE_STAGES, STAGE_LABEL, type AdminApplication, type PipelineStage } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import { NextStepLink } from '../components/NextStepLink';
import {
  DataTable,
  Empty,
  ErrorState,
  FilterSelect,
  Panel,
  Pill,
  SearchInput,
  StatusTabs,
  TableFooter,
  type ColumnDef,
} from '../components/primitives';
import { STAGE_TONE, fmtDate } from '../admin.format';

const PAGE_SIZE = 20;

export default function AdminApplicationsPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const q = params.get('q') ?? '';
  const stage = (params.get('stage') ?? '') as '' | PipelineStage;
  const statusId = params.get('statusId') ?? '';
  const jobId = params.get('jobId') ? Number(params.get('jobId')) : undefined;

  const setFilter = useCallback(
    (key: string, value: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          if (key !== 'page') next.delete('page');
          // A stage and a status are alternative filters; picking one drops the other.
          if (key === 'stage') next.delete('statusId');
          if (key === 'statusId') next.delete('stage');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const { data, isLoading, error, refetch } = useAdminApplications({
    page,
    pageSize: PAGE_SIZE,
    q,
    stage,
    statusId: statusId ? Number(statusId) : '',
    jobId,
  });

  const columns: ColumnDef<AdminApplication>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      cell: (a) => (
        <Link to={`/admin/applications/${a.mapId}`} className="group block min-w-0">
          <span className="block truncate font-semibold text-navy group-hover:text-aj-blue group-hover:underline dark:text-white">
            {a.candidate.name}
          </span>
          <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">
            #{a.mapId} · {a.candidate.mobile || a.candidate.email || '—'}
          </span>
        </Link>
      ),
    },
    {
      key: 'job',
      header: 'Job',
      cell: (a) =>
        a.job.jobId ? (
          <Link to={`/admin/jobs/${a.job.jobId}`} className="block min-w-0 hover:text-aj-blue hover:underline">
            <span className="block truncate">{a.job.designation}</span>
            <span className="block truncate text-xs text-gray-500">{a.job.company}</span>
          </Link>
        ) : (
          '—'
        ),
    },
    {
      key: 'stage',
      header: 'Stage',
      cell: (a) => (
        <span className="flex flex-col items-start gap-1">
          <Pill tone={STAGE_TONE[a.stage]}>{STAGE_LABEL[a.stage]}</Pill>
          <span className="text-xs text-gray-500">{a.status}</span>
        </span>
      ),
    },
    { key: 'next', header: 'Next step', cell: (a) => <NextStepLink a={a} />, className: 'min-w-[12rem]', wideOnCard: true },
    { key: 'applied', header: 'Applied', cell: (a) => fmtDate(a.appliedAt), className: 'whitespace-nowrap' },
  ];

  const byStage = data?.byStage;
  const total = byStage ? Object.values(byStage).reduce((a, b) => a + b, 0) : undefined;

  return (
    <AdminShell
      title="Applications"
      subtitle="Every application, where it stands, and who moves it next"
      crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Applications' }]}
      actions={<ExportButton endpoint="/exports/applications" filename="applications" label="Export CSV" size="sm" variant="outline" />}
    >
      <Panel bodyClassName="p-0">
        <div className="space-y-3 border-b border-aj-line-soft p-4 dark:border-gray-700">
          <StatusTabs<'' | PipelineStage>
            label="Pipeline stage"
            value={stage}
            onChange={(v) => setFilter('stage', v)}
            tabs={[
              { value: '', label: 'All', count: total },
              ...PIPELINE_STAGES.map((s) => ({ value: s, label: STAGE_LABEL[s], count: byStage?.[s] })),
            ]}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <SearchInput
              label="Search applications"
              placeholder="Candidate, mobile, job, company or #id"
              value={q}
              onChange={(v) => setFilter('q', v)}
            />
            <FilterSelect
              label="Exact status"
              value={statusId}
              onChange={(v) => setFilter('statusId', v)}
              options={[
                { value: '', label: 'Any status' },
                ...(data?.statuses ?? []).map((s) => ({ value: String(s.statusId), label: s.label })),
              ]}
            />
            {jobId && (
              <Button size="sm" variant="ghost" onClick={() => setFilter('jobId', '')}>
                Showing job #{jobId} · clear
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Status changes are made in the workspace that owns each step (Q1, Q2, Q3 or the employer), so its checks,
            emails and audit trail always apply. Admin can open every one of them.
          </p>
        </div>

        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(a) => a.mapId}
            isLoading={isLoading}
            empty={<Empty title="No applications match" hint="Try another stage or clear the search." />}
          />
        )}
        {data && (
          <TableFooter page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={(p) => setFilter('page', String(p))} />
        )}
      </Panel>
    </AdminShell>
  );
}
