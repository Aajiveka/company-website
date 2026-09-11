import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Breadcrumbs,
  Input,
  Pagination,
  Select,
  Table,
  type Column,
} from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { useCandidates } from '../recruitment.api';
import type { CandidateRow } from '../recruitment.types';

const PAGE_SIZE = 10;

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Applied: 'bg-blue-50 text-blue-700',
    Shortlisted: 'bg-amber-50 text-amber-700',
    Interview: 'bg-purple-50 text-purple-700',
    Rejected: 'bg-red-50 text-red-700',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
};

/** QC/Recruitment candidate listing with search, status filter & pagination. */
export default function CandidatesListPage() {
  const { t } = useTranslation('common');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useCandidates({ search, status, page, pageSize: PAGE_SIZE });

  const STATUS_OPTIONS = [
    { label: t('recruitment.applied'), value: 'Applied' },
    { label: t('recruitment.shortlisted'), value: 'Shortlisted' },
    { label: t('recruitment.interview'), value: 'Interview' },
    { label: t('recruitment.rejected'), value: 'Rejected' },
  ];

  const columns = useMemo<Column<CandidateRow>[]>(
    () => [
      {
        // The only way into the candidate detail screen. Nothing linked to it before, so the
        // richest screen in the QC area — decisions, assign job, scoring — was reachable only
        // by typing the URL. A real link rather than a row-click handler: a recruiter working
        // a list opens several candidates in tabs, and ctrl/middle-click has to keep working.
        key: 'fullName',
        header: t('labels.candidate'),
        render: (r) => (
          <Link
            to={`/recruitment/candidates/${r.subscriberId}`}
            className="font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
          >
            {r.fullName}
          </Link>
        ),
      },
      { key: 'designation', header: t('labels.designation') },
      { key: 'city', header: t('labels.location') },
      { key: 'experience', header: t('labels.experience') },
      { key: 'appliedOn', header: t('recruitment.appliedOn') },
      {
        key: 'jobStatus',
        header: t('labels.status'),
        render: (r) => (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadge(r.jobStatus)}`}>
            {r.jobStatus}
          </span>
        ),
      },
    ],
    [t],
  );

  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('recruitment.title'), to: '/recruitment/candidates' }, { label: t('recruitment.candidates') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('recruitment.candidates')}</h1>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder={t('recruitment.searchByName')}
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <div className="sm:w-56">
          <Select
            options={STATUS_OPTIONS}
            placeholder={t('recruitment.allStatuses')}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : (
        <Table
          columns={columns}
          data={data?.rows ?? []}
          rowKey={(r) => r.subscriberId}
          isLoading={isLoading}
          emptyMessage={t('recruitment.noCandidatesMatch')}
        />
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">{t('recruitment.candidatesCount', { count: data?.total ?? 0 })}</p>
        <Pagination page={page} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  );
}
