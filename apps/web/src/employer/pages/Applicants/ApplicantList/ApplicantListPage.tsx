import { useCallback, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarClock, Eye, ThumbsDown, ThumbsUp, UserCheck, X } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { ConfirmDialog } from '@/employer/components/ConfirmDialog';
import { DataTable, type Column } from '@/employer/components/Tables/DataTable';
import { employerPaths } from '@/employer/constants/paths';
import { useApplicants, useCompanyJobs, useDecideApplicant } from '@/employer/services/employer.api';
import type { ApplicantDecision, ApplicantPipelineStatus, EmployerApplicant } from '@/employer/services/employer.types';
import { decisionConfirm } from '@/employer/utils/decisionConfirm';
import {
  pipelineIconButtonClass,
  pipelineIconClass,
  applicantStatusTone,
} from '@/employer/utils/pipelineActions';
import { DebouncedSearch } from '@/components/DebouncedSearch';
import { Pagination } from '@/components/ui/Pagination';
import { SearchableSelect } from '@/components/ui';
import { getErrorMessage } from '@/lib/axios';

function statusFromPath(pathname: string): ApplicantPipelineStatus | undefined {
  if (pathname.endsWith('/shortlisted')) return 'Shortlisted';
  if (pathname.endsWith('/interviews')) return 'Interview';
  if (pathname.endsWith('/hired')) return 'Hired';
  if (pathname.endsWith('/rejected')) return 'Rejected';
  return undefined;
}

const triggerClass =
  'h-8 w-full rounded-lg border border-slate-500 bg-white px-2.5 text-xs text-slate-800 outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20';

const EXP_OPTIONS = [
  { id: '0', label: '0+ yrs' },
  { id: '1', label: '1+ yrs' },
  { id: '2', label: '2+ yrs' },
  { id: '3', label: '3+ yrs' },
  { id: '5', label: '5+ yrs' },
  { id: '8', label: '8+ yrs' },
  { id: '10', label: '10+ yrs' },
];

const NOTICE_OPTIONS = [
  { id: '15', label: '≤ 15 days' },
  { id: '30', label: '≤ 30 days' },
  { id: '45', label: '≤ 45 days' },
  { id: '60', label: '≤ 60 days' },
  { id: '90', label: '≤ 90 days' },
];

export function ApplicantListPage() {
  const location = useLocation();
  const filter = statusFromPath(location.pathname);
  const [query, setQuery] = useState('');
  const [jobId, setJobId] = useState<number | ''>('');
  const [city, setCity] = useState('');
  const [minExp, setMinExp] = useState('');
  const [maxNotice, setMaxNotice] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [confirm, setConfirm] = useState<{
    jobSubscriberMapId: number;
    name: string;
    decision: ApplicantDecision;
  } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: jobsRes } = useCompanyJobs({ page: 1, pageSize: 100 });
  const jobs = useMemo(() => jobsRes?.items ?? [], [jobsRes?.items]);

  const { data, isLoading, isFetching, isError, error } = useApplicants({
    status: filter,
    q: query || undefined,
    jobId: jobId === '' ? undefined : jobId,
    city: city || undefined,
    minExp: minExp === '' ? undefined : Number(minExp),
    maxNotice: maxNotice === '' ? undefined : Number(maxNotice),
    page,
    pageSize,
  });

  const rows = useMemo(() => data?.items ?? [], [data?.items]);
  const total = data?.total ?? 0;
  const pageCount = data?.pageCount ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const decide = useDecideApplicant();

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    for (const j of jobs) {
      if (j.city?.trim()) set.add(j.city.trim());
    }
    for (const a of rows) {
      if (a.city?.trim()) set.add(a.city.trim());
      if (a.jobCity?.trim()) set.add(a.jobCity.trim());
    }
    return [...set].sort((a, b) => a.localeCompare(b)).map((c) => ({ id: c, label: c }));
  }, [jobs, rows]);

  const jobOptions = useMemo(
    () =>
      jobs.map((j) => ({
        id: j.jobId,
        label: `${j.designation || `Job #${j.jobId}`}${j.city ? ` · ${j.city}` : ''}`,
      })),
    [jobs],
  );

  const hasExtraFilters = jobId !== '' || city !== '' || minExp !== '' || maxNotice !== '';

  const clearFilters = () => {
    setJobId('');
    setCity('');
    setMinExp('');
    setMaxNotice('');
    setPage(1);
  };

  const askDecide = useCallback(
    (jobSubscriberMapId: number, name: string, decision: ApplicantDecision) => {
      setActionError(null);
      setConfirm({ jobSubscriberMapId, name, decision });
    },
    [],
  );

  const confirmDecide = async () => {
    if (!confirm) return;
    const { jobSubscriberMapId, decision } = confirm;
    setActionError(null);
    try {
      await decide.mutateAsync({ jobSubscriberMapId, decision });
      setConfirm(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update status'));
      setConfirm(null);
    }
  };

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
        render: (row) => <EmployerBadge tone={applicantStatusTone(row.status)}>{row.status}</EmployerBadge>,
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
              onClick={() => askDecide(row.jobSubscriberMapId, row.fullName, 'Shortlisted')}
              className={pipelineIconButtonClass('Shortlisted', row.status)}
              title="Shortlist"
            >
              <ThumbsUp className={pipelineIconClass('Shortlisted', row.status)} />
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => askDecide(row.jobSubscriberMapId, row.fullName, 'Interview')}
              className={pipelineIconButtonClass('Interview', row.status)}
              title="Mark Interview"
            >
              <CalendarClock className={pipelineIconClass('Interview', row.status)} />
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => askDecide(row.jobSubscriberMapId, row.fullName, 'Hired')}
              className={pipelineIconButtonClass('Hired', row.status)}
              title="Hire"
            >
              <UserCheck className={pipelineIconClass('Hired', row.status)} />
            </button>
            <button
              type="button"
              disabled={decide.isPending}
              onClick={() => askDecide(row.jobSubscriberMapId, row.fullName, 'Rejected')}
              className={pipelineIconButtonClass('Rejected', row.status)}
              title="Reject"
            >
              <ThumbsDown className={pipelineIconClass('Rejected', row.status)} />
            </button>
          </div>
        ),
      },
    ],
    [askDecide, decide.isPending],
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

      <div className="mb-3 space-y-2 rounded-xl border border-slate-200/80 bg-white p-2 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-1.5">
            {tabs.map((t) => (
              <Link
                key={t.key}
                to={t.to}
                onClick={() => setPage(1)}
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
            <DebouncedSearch
              onChange={(v) => {
                setQuery(v);
                setPage(1);
              }}
              placeholder="Search name, skills, company…"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="w-full sm:max-w-[14rem]">
            <SearchableSelect
              options={jobOptions}
              value={jobId === '' ? null : jobId}
              onChange={(id) => {
                setJobId(id ? Number(id) : '');
                setPage(1);
              }}
              placeholder="All jobs"
              searchPlaceholder="Search jobs…"
              clearable
              triggerClassName={triggerClass}
              aria-label="Filter by job"
            />
          </div>

          <div className="w-full sm:max-w-[11rem]">
            <SearchableSelect
              options={cityOptions}
              value={city || null}
              onChange={(id) => {
                setCity(id);
                setPage(1);
              }}
              placeholder="All cities"
              searchPlaceholder="Search cities…"
              clearable
              triggerClassName={triggerClass}
              aria-label="Filter by city"
            />
          </div>

          <div className="w-full sm:max-w-[10rem]">
            <SearchableSelect
              options={EXP_OPTIONS}
              value={minExp || null}
              onChange={(id) => {
                setMinExp(id);
                setPage(1);
              }}
              placeholder="Any experience"
              searchPlaceholder="Search…"
              clearable
              triggerClassName={triggerClass}
              aria-label="Minimum experience"
            />
          </div>

          <div className="w-full sm:max-w-[10rem]">
            <SearchableSelect
              options={NOTICE_OPTIONS}
              value={maxNotice || null}
              onChange={(id) => {
                setMaxNotice(id);
                setPage(1);
              }}
              placeholder="Any notice"
              searchPlaceholder="Search…"
              clearable
              triggerClassName={triggerClass}
              aria-label="Maximum notice period"
            />
          </div>

          {hasExtraFilters ? (
            <SecondaryButton type="button" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear filters
            </SecondaryButton>
          ) : null}
        </div>
      </div>

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load applicants')}
        </p>
      )}
      {actionError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p>
      )}

      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(r) => r.jobSubscriberMapId}
        empty={
          isLoading ? (
            <EmptyState title="Loading…" description="Fetching applicants." />
          ) : (
            <EmptyState title="No applicants" description="No candidates match this filter." />
          )
        }
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          {isFetching && !isLoading ? 'Updating… · ' : ''}
          Showing {from}–{to} of {total}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-slate-500">
            Rows
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="h-8 rounded-lg border border-slate-500 bg-white px-2 text-xs text-slate-800 outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>
          <Pagination
            variant="compact"
            page={page}
            pageCount={Math.max(pageCount, 1)}
            onChange={setPage}
          />
        </div>
      </div>

      <ConfirmDialog
        open={confirm != null}
        title={confirm ? decisionConfirm(confirm.decision, confirm.name).title : ''}
        description={confirm ? decisionConfirm(confirm.decision, confirm.name).description : undefined}
        confirmLabel={confirm ? decisionConfirm(confirm.decision, confirm.name).confirmLabel : 'Confirm'}
        tone={confirm ? decisionConfirm(confirm.decision, confirm.name).tone : 'primary'}
        loading={decide.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void confirmDecide()}
      />
    </div>
  );
}
