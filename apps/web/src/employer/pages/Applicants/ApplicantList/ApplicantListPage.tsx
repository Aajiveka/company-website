import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarClock, Eye, ThumbsDown, ThumbsUp, UserCheck } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
} from '@/employer/components/Cards/ui';
import { DataTable, type Column } from '@/employer/components/Tables/DataTable';
import { employerPaths } from '@/employer/constants/paths';
import { useApplicants, useDecideApplicant } from '@/employer/services/employer.api';
import type { ApplicantPipelineStatus, EmployerApplicant } from '@/employer/services/employer.types';
import { DebouncedSearch } from '@/components/DebouncedSearch';
import { getErrorMessage } from '@/lib/axios';

function statusFromPath(pathname: string): ApplicantPipelineStatus | undefined {
  if (pathname.endsWith('/shortlisted')) return 'Shortlisted';
  if (pathname.endsWith('/interviews')) return 'Interview';
  if (pathname.endsWith('/hired')) return 'Hired';
  if (pathname.endsWith('/rejected')) return 'Rejected';
  return undefined;
}

function statusTone(status: ApplicantPipelineStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'Hired') return 'success';
  if (status === 'Shortlisted') return 'primary';
  if (status === 'Interview') return 'warning';
  if (status === 'Rejected') return 'danger';
  return 'neutral';
}

export function ApplicantListPage() {
  const location = useLocation();
  const filter = statusFromPath(location.pathname);
  const [query, setQuery] = useState('');
  const { data = [], isLoading, isError, error } = useApplicants({
    status: filter,
    q: query || undefined,
  });
  const decide = useDecideApplicant();

  const runDecide = useCallback(
    (jobSubscriberMapId: number, decision: 'Shortlisted' | 'Interview' | 'Hired' | 'Rejected') => {
      void decide.mutateAsync({ jobSubscriberMapId, decision });
    },
    [decide],
  );

  const columns: Column<EmployerApplicant>[] = useMemo(
    () => [
      {
        key: 'candidate',
        header: 'Candidate',
        render: (row) => (
          <div>
            <Link
              to={employerPaths.applicantProfile(row.jobSubscriberMapId)}
              className="font-medium text-slate-800 hover:text-[#1A56DB]"
            >
              {row.fullName || '—'}
            </Link>
            <p className="text-xs text-slate-400">{row.designation}</p>
          </div>
        ),
      },
      { key: 'experience', header: 'Experience', render: (row) => row.experience || '—' },
      {
        key: 'skills',
        header: 'Skills',
        render: (row) =>
          row.skills.length ? (
            <div className="flex flex-wrap gap-1">
              {row.skills.slice(0, 3).map((s) => (
                <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
                  {s}
                </span>
              ))}
            </div>
          ) : (
            '—'
          ),
      },
      { key: 'company', header: 'Current Company', render: (row) => row.company || '—' },
      { key: 'notice', header: 'Notice Period', render: (row) => row.notice || '—' },
      { key: 'city', header: 'City', render: (row) => row.city || '—' },
      {
        key: 'status',
        header: 'Status',
        render: (row) => <EmployerBadge tone={statusTone(row.status)}>{row.status}</EmployerBadge>,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (row) => (
          <div className="flex items-center gap-1">
            <Link
              to={employerPaths.applicantProfile(row.jobSubscriberMapId)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1A56DB]"
              title="View"
            >
              <Eye className="h-4 w-4" />
            </Link>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => runDecide(row.jobSubscriberMapId, 'Shortlisted')}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
              title="Shortlist"
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => runDecide(row.jobSubscriberMapId, 'Interview')}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
              title="Mark Interview"
            >
              <CalendarClock className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => runDecide(row.jobSubscriberMapId, 'Hired')}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
              title="Hire"
            >
              <UserCheck className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => runDecide(row.jobSubscriberMapId, 'Rejected')}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
              title="Reject"
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        ),
      },
    ],
    [decide.isPending, runDecide],
  );

  const tabs = [
    { label: 'All', to: employerPaths.applicants, key: 'all' },
    { label: 'Shortlisted', to: employerPaths.shortlisted, key: 'Shortlisted' },
    { label: 'Interviews', to: employerPaths.interviews, key: 'Interview' },
    { label: 'Hired', to: employerPaths.hired, key: 'Hired' },
    { label: 'Rejected', to: employerPaths.rejected, key: 'Rejected' },
  ] as const;

  const activeTab = filter ?? 'all';

  return (
    <div>
      <PageHeader
        title="Applicants"
        subtitle="Review candidates across your open roles."
        actions={
          <Link to={employerPaths.compare}>
            <PrimaryButton>Compare Candidates</PrimaryButton>
          </Link>
        }
      />

      <div className="mb-3 flex flex-col gap-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm sm:flex-row sm:items-center">
        <div className="flex flex-wrap gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.key}
              to={t.to}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
                activeTab === t.key
                  ? 'bg-[#1A56DB] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <DebouncedSearch onChange={setQuery} placeholder="Search candidates…" />
        </div>
      </div>

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load applicants')}
        </p>
      )}

      <DataTable
        columns={columns}
        rows={data}
        getRowId={(r) => r.jobSubscriberMapId}
        empty={
          isLoading ? (
            <EmptyState title="Loading…" description="Fetching applicants." />
          ) : (
            <EmptyState title="No applicants" description="No candidates match this filter." />
          )
        }
      />
    </div>
  );
}
