import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Eye, MessageSquare, Search, ThumbsDown, ThumbsUp } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
} from '@/employer/components/Cards/ui';
import { DataTable, type Column } from '@/employer/components/Tables/DataTable';
import { mockApplicants } from '@/employer/constants/mockData';
import { employerPaths } from '@/employer/constants/paths';

type ApplicantStatus = (typeof mockApplicants)[number]['status'];
type Applicant = (typeof mockApplicants)[number];

function statusFromPath(pathname: string): ApplicantStatus | 'all' {
  if (pathname.endsWith('/shortlisted')) return 'Shortlisted';
  if (pathname.endsWith('/interviews')) return 'Interview';
  if (pathname.endsWith('/hired')) return 'Hired';
  if (pathname.endsWith('/rejected')) return 'Rejected';
  return 'all';
}

function statusTone(status: ApplicantStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' {
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

  const rows = useMemo(() => {
    return mockApplicants.filter((a) => {
      if (filter !== 'all' && a.status !== filter) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, query]);

  const columns: Column<Applicant>[] = [
    {
      key: 'candidate',
      header: 'Candidate',
      render: (row) => (
        <div>
          <Link
            to={employerPaths.applicantProfile(row.id)}
            className="font-medium text-slate-800 hover:text-[#1A56DB]"
          >
            {row.name}
          </Link>
          <p className="text-xs text-slate-400">{row.role}</p>
        </div>
      ),
    },
    {
      key: 'score',
      header: 'Resume Score',
      render: (row) => (
        <span className="rounded-md bg-[#EBF2FF] px-2 py-0.5 text-xs font-semibold text-[#1A56DB]">
          {row.score}%
        </span>
      ),
    },
    { key: 'experience', header: 'Experience', render: (row) => row.experience },
    {
      key: 'skills',
      header: 'Skills',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.skills.slice(0, 3).map((s) => (
            <span key={s} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">
              {s}
            </span>
          ))}
        </div>
      ),
    },
    { key: 'company', header: 'Current Company', render: (row) => row.company },
    { key: 'notice', header: 'Notice Period', render: (row) => row.notice },
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
            to={employerPaths.applicantProfile(row.id)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1A56DB]"
            title="View"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="Shortlist">
            <ThumbsUp className="h-4 w-4" />
          </button>
          <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600" title="Reject">
            <ThumbsDown className="h-4 w-4" />
          </button>
          <Link
            to={employerPaths.messages}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#1A56DB]"
            title="Message"
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
        </div>
      ),
    },
  ];

  const tabs = [
    { label: 'All', to: employerPaths.applicants, key: 'all' },
    { label: 'Shortlisted', to: employerPaths.shortlisted, key: 'Shortlisted' },
    { label: 'Interviews', to: employerPaths.interviews, key: 'Interview' },
    { label: 'Hired', to: employerPaths.hired, key: 'Hired' },
    { label: 'Rejected', to: employerPaths.rejected, key: 'Rejected' },
  ] as const;

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
                filter === t.key
                  ? 'bg-[#1A56DB] text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search candidates…"
            className="h-8 w-full rounded-lg border border-slate-200 bg-white py-0 pl-8 pr-2.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        empty={<EmptyState title="No applicants" description="No candidates match this filter." />}
      />
    </div>
  );
}
