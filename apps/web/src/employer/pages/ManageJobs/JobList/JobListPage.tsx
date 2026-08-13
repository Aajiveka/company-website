import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Archive, Eye, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { DataTable, type Column } from '@/employer/components/Tables/DataTable';
import {
  ColumnVisibilityMenu,
} from '@/employer/components/Tables/ColumnVisibilityMenu';
import { loadColumnVisibility, saveColumnVisibility } from '@/employer/components/Tables/columnVisibilityStorage';
import { employerPaths } from '@/employer/constants/paths';
import {
  useArchiveJob,
  useCompanyJobs,
  useDeleteJob,
  useSetJobStatus,
} from '@/employer/services/employer.api';
import type { JobListing, JobListParams } from '@/employer/services/employer.types';
import { DebouncedSearch } from '@/components/DebouncedSearch';
import { Pagination } from '@/components/ui/Pagination';
import { getErrorMessage } from '@/lib/axios';
import { ConfirmDialog } from '@/employer/components/ConfirmDialog';
import { JobViewModal } from './JobViewModal';
import { cn } from '@/lib/cn';

type JobStatus = 'Active' | 'Draft' | 'Closed' | 'Archived';

const COL_STORAGE = 'employer.manageJobs.columns';
const DEFAULT_VISIBLE = [
  'designation',
  'city',
  'minExp',
  'minCtc',
  'applicants',
  'status',
  'postedOn',
  'actions',
];

function statusFromPath(pathname: string): JobStatus | null {
  if (pathname.endsWith('/drafts')) return 'Draft';
  if (pathname.endsWith('/archived')) return 'Archived';
  return null;
}

function experienceLabel(j: JobListing) {
  if (j.maxExp != null) return `${j.minExp}-${j.maxExp} yrs`;
  return `${j.minExp}+ yrs`;
}

function salaryLabel(j: JobListing) {
  return `${j.minCtc.toLocaleString()}–${j.maxCtc.toLocaleString()}`;
}

function StatusToggle({
  job,
  onToggle,
  disabled,
}: {
  job: JobListing;
  onToggle: (next: 'Active' | 'Closed') => void;
  disabled?: boolean;
}) {
  if (job.status === 'Archived') {
    return <EmployerBadge tone="danger">Archived</EmployerBadge>;
  }
  if (job.status === 'Draft') {
    return <EmployerBadge tone="warning">Draft</EmployerBadge>;
  }
  const active = job.status === 'Active';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      title={active ? 'Set Closed' : 'Set Active'}
      onClick={() => onToggle(active ? 'Closed' : 'Active')}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold transition',
        active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600',
        disabled && 'opacity-50',
      )}
    >
      <span
        className={cn(
          'relative h-4 w-7 rounded-full transition',
          active ? 'bg-emerald-500' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition',
            active ? 'left-3.5' : 'left-0.5',
          )}
        />
      </span>
      {active ? 'Active' : 'Closed'}
    </button>
  );
}

export function JobListPage({ filterStatus }: { filterStatus?: JobStatus | null } = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathStatus = filterStatus ?? statusFromPath(location.pathname);
  const [statusTab, setStatusTab] = useState<JobStatus | 'All'>(pathStatus ?? 'All');
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleKeys, setVisibleKeys] = useState<string[]>(() =>
    loadColumnVisibility(COL_STORAGE, DEFAULT_VISIBLE),
  );
  const [viewJobId, setViewJobId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<null | {
    type: 'archive' | 'delete';
    jobId: number;
    title: string;
  }>(null);

  useEffect(() => {
    setStatusTab(pathStatus ?? 'All');
    setPage(1);
  }, [pathStatus]);

  useEffect(() => {
    saveColumnVisibility(COL_STORAGE, visibleKeys);
  }, [visibleKeys]);

  const queryStatus: JobListParams['status'] | undefined =
    pathStatus === 'Draft' || pathStatus === 'Archived'
      ? pathStatus
      : statusTab === 'All'
        ? undefined
        : statusTab;

  const { data, isLoading, isError, isFetching } = useCompanyJobs({
    q: search || undefined,
    city: city === 'all' ? undefined : city,
    status: queryStatus,
    page,
    pageSize,
  });
  const setStatus = useSetJobStatus();
  const archiveJob = useArchiveJob();
  const deleteJob = useDeleteJob();

  const jobs = data?.items ?? [];
  const counts = data?.counts ?? { all: 0, active: 0, closed: 0, draft: 0, archived: 0 };
  const cities = data?.cities ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 0;
  const busy = setStatus.isPending || archiveJob.isPending || deleteJob.isPending;

  const runAction = async (fn: () => Promise<unknown>) => {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(getErrorMessage(e, 'Action failed'));
    }
  };

  const allColumns: Column<JobListing>[] = useMemo(
    () => [
      {
        key: 'designation',
        header: 'Job Title',
        render: (row) => (
          <button type="button" className="text-left" onClick={() => setViewJobId(row.jobId)}>
            <p className="font-medium text-slate-800 hover:text-[#1A56DB]">{row.designation}</p>
            <p className="text-xs text-slate-400">#{row.jobId}</p>
          </button>
        ),
      },
      { key: 'city', header: 'Location', render: (row) => row.city || '—' },
      {
        key: 'employmentType',
        header: 'Employment',
        render: (row) => row.employmentType || '—',
      },
      { key: 'workMode', header: 'Work mode', render: (row) => row.workMode || '—' },
      { key: 'department', header: 'Department', render: (row) => row.department || '—' },
      { key: 'minExp', header: 'Experience', render: (row) => experienceLabel(row) },
      { key: 'minCtc', header: 'Salary', render: (row) => salaryLabel(row) },
      {
        key: 'applicants',
        header: 'Applicants',
        render: (row) => (
          <span className="rounded-md bg-[#EBF2FF] px-2 py-0.5 text-xs font-semibold text-[#1A56DB]">
            {row.applicants}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (row) => (
          <StatusToggle
            job={row}
            disabled={busy}
            onToggle={(next) =>
              void runAction(() => setStatus.mutateAsync({ jobId: row.jobId, status: next }))
            }
          />
        ),
      },
      { key: 'postedOn', header: 'Posted Date', render: (row) => row.postedOn },
      {
        key: 'actions',
        header: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1A56DB]"
              title="View"
              onClick={() => setViewJobId(row.jobId)}
            >
              <Eye className="h-4 w-4" />
            </button>
            <Link
              to={employerPaths.editJob(row.jobId)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1A56DB]"
              title="Edit"
            >
              <Pencil className="h-4 w-4" />
            </Link>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
              title={row.status === 'Archived' ? 'Already archived' : 'Archive'}
              disabled={busy || row.status === 'Archived'}
              onClick={() =>
                setConfirm({ type: 'archive', jobId: row.jobId, title: row.designation })
              }
            >
              <Archive className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600"
              title="Delete"
              disabled={busy}
              onClick={() =>
                setConfirm({ type: 'delete', jobId: row.jobId, title: row.designation })
              }
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, setStatus, archiveJob, deleteJob],
  );

  const columnOptions = useMemo(
    () =>
      allColumns.map((c) => ({
        key: c.key,
        label: c.header,
        locked: c.key === 'actions' || c.key === 'designation',
      })),
    [allColumns],
  );

  const visibleColumns = useMemo(() => {
    const order = allColumns.map((c) => c.key);
    return allColumns.filter((c) => visibleKeys.includes(c.key)).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  }, [allColumns, visibleKeys]);

  const title =
    pathStatus === 'Draft' ? 'Draft Jobs' : pathStatus === 'Archived' ? 'Archived Jobs' : 'Manage Jobs';

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div>
      <PageHeader
        title={title}
        subtitle="Create, filter, and manage all job postings."
        actions={
          <>
            <Link to={employerPaths.addJob}>
              <PrimaryButton>
                <Plus className="h-4 w-4" />
                Add Job
              </PrimaryButton>
            </Link>
            <Link to={employerPaths.bulkImport}>
              <SecondaryButton>
                <Upload className="h-4 w-4" />
                Bulk Import
              </SecondaryButton>
            </Link>
          </>
        }
      />

      <div className="mb-3 flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ['All', counts.all, 'All'] as const,
                ['Active', counts.active, 'Active'] as const,
                ['Draft', counts.draft, 'Draft'] as const,
                ['Closed', counts.closed, 'Closed'] as const,
                ['Archived', counts.archived, 'Archived'] as const,
              ]
            ).map(([label, count, tab]) => {
              const active = (pathStatus ?? statusTab) === tab || (tab === 'All' && !pathStatus && statusTab === 'All');
              const go = () => {
                setPage(1);
                if (tab === 'Draft') {
                  navigate(employerPaths.draftJobs);
                  return;
                }
                if (tab === 'Archived') {
                  navigate(employerPaths.archivedJobs);
                  return;
                }
                setStatusTab(tab);
                if (pathStatus === 'Draft' || pathStatus === 'Archived') navigate(employerPaths.jobList);
              };
              return (
                <button
                  key={label}
                  type="button"
                  onClick={go}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                    active
                      ? 'bg-[#1A56DB] text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {label} ({count})
                </button>
              );
            })}
          </div>

          <DebouncedSearch
            placeholder="Search title, department, location…"
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
          />

          <select
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setPage(1);
            }}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 outline-none focus:border-[#1A56DB]"
          >
            <option value="all">All locations</option>
            {cities.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>

          <ColumnVisibilityMenu
            columns={columnOptions}
            visibleKeys={visibleKeys}
            onChange={setVisibleKeys}
          />
        </div>
      </div>

      {isError && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Failed to load jobs. Check that you are signed in as an employer.
        </p>
      )}

      {actionError && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {actionError}
        </p>
      )}

      <DataTable
        columns={visibleColumns}
        rows={isLoading ? [] : jobs}
        getRowId={(row) => row.jobId}
        empty={
          <EmptyState
            title={isLoading ? 'Loading jobs…' : 'No jobs found'}
            description={isLoading ? undefined : 'Try adjusting filters or create a new job posting.'}
            action={
              !isLoading ? (
                <Link to={employerPaths.addJob}>
                  <PrimaryButton>
                    <Plus className="h-4 w-4" />
                    Add Job
                  </PrimaryButton>
                </Link>
              ) : undefined
            }
          />
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] text-slate-500">
          {isFetching && !isLoading ? 'Updating… · ' : ''}
          Showing {from}–{to} of {total}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
            Rows
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs outline-none focus:border-[#1A56DB]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <Pagination page={page} pageCount={Math.max(pageCount, 1)} onChange={setPage} />
        </div>
      </div>

      <JobViewModal jobId={viewJobId} open={viewJobId != null} onClose={() => setViewJobId(null)} />

      <ConfirmDialog
        open={confirm != null}
        title={confirm?.type === 'delete' ? 'Delete job?' : 'Archive job?'}
        description={
          confirm?.type === 'delete'
            ? `Permanently delete “${confirm.title}”? This cannot be undone.`
            : `Archive “${confirm?.title}”? It will move to the Archived list.`
        }
        confirmLabel={confirm?.type === 'delete' ? 'Delete' : 'Archive'}
        cancelLabel="Cancel"
        tone={confirm?.type === 'delete' ? 'danger' : 'primary'}
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          const { type, jobId } = confirm;
          setConfirm(null);
          void runAction(() =>
            type === 'delete' ? deleteJob.mutateAsync(jobId) : archiveJob.mutateAsync(jobId),
          );
        }}
      />
    </div>
  );
}
