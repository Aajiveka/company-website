import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { Briefcase, CheckCircle2, Eye, FileText, Search, XCircle } from 'lucide-react';
import ExportButton from '../components/ExportButton';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  ConfirmDialog,
  Input,
  Pagination,
  Select,
  useToast,
  VirtualList,
  type Column,
} from '@/components/ui';
import { api } from '@/lib/axios';

interface PendingJob {
  jobId: number;
  designation: string;
  company: string;
  city: string;
  minCtc: number;
  maxCtc: number;
  status: string;
  postedOn: string;
  views: number;
  applications: number;
}

const lpa = (rupees: number) => `₹${(rupees / 100_000).toFixed(1)}L`;

const PAGE_SIZE = 15;

export default function AdminJobsPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [statusFilter, setStatusFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingJob | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'jobs', debouncedSearch, statusFilter, companyFilter],
    queryFn: () =>
      api
        .get<PendingJob[]>('/admin/jobs', {
          params: {
            ...(debouncedSearch ? { q: debouncedSearch } : {}),
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(companyFilter ? { company: companyFilter } : {}),
          },
        })
        .then((r) => r.data),
  });

  // Derive unique companies for filter
  const companies = useMemo(() => {
    if (!data) return [];
    const unique = [...new Set(data.map((j) => j.company))].sort();
    return unique.map((c) => ({ label: c, value: c }));
  }, [data]);

  const useVirtualized = (data?.length ?? 0) > 50;

  // Client-side pagination (used when data <= 50 rows)
  const paginatedData = useMemo(() => {
    const all = data ?? [];
    if (useVirtualized) return { items: all, total: all.length, pageCount: 1 };
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: all.slice(start, start + PAGE_SIZE),
      total: all.length,
      pageCount: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
    };
  }, [data, page, useVirtualized]);

  // Job stats summary
  const stats = useMemo(() => {
    const all = data ?? [];
    return {
      total: all.length,
      active: all.filter((j) => j.status === 'Active').length,
      pending: all.filter((j) => j.status === 'Pending').length,
      totalViews: all.reduce((sum, j) => sum + (j.views ?? 0), 0),
      totalApps: all.reduce((sum, j) => sum + (j.applications ?? 0), 0),
    };
  }, [data]);

  const moderate = useMutation({
    mutationFn: ({ jobId, action }: { jobId: number; action: 'approve' | 'reject' }) =>
      api.post(`/admin/jobs/${jobId}/${action}`).then((r) => r.data),
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      notify(
        action === 'approve' ? t('adminJobs.approved') : t('adminJobs.rejected'),
        'success',
      );
    },
    onError: () => notify(t('adminJobs.actionFailed'), 'error'),
  });

  const bulkMutation = useMutation({
    mutationFn: async ({ action, jobIds }: { action: 'approve' | 'reject'; jobIds: number[] }) => {
      await api.post('/admin/jobs/bulk-moderate', { jobIds, action });
    },
    onSuccess: (_, { action }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'jobs'] });
      notify(
        action === 'approve' ? t('adminJobs.bulkApproved') : t('adminJobs.bulkRejected'),
        'success',
      );
      setSelected(new Set());
      setBulkAction(null);
    },
    onError: () => {
      notify(t('adminJobs.actionFailed'), 'error');
      setBulkAction(null);
    },
  });

  const toggleSelect = (jobId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pending = paginatedData.items.filter((j) => j.status === 'Pending');
    if (pending.every((j) => selected.has(j.jobId))) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pending.map((j) => j.jobId)));
    }
  };

  const statusFilterOptions = [
    { label: t('adminJobs.allStatuses'), value: '' },
    { label: 'Active', value: 'Active' },
    { label: 'Pending', value: 'Pending' },
    { label: 'Closed', value: 'Closed' },
    { label: 'Rejected', value: 'Rejected' },
  ];

  const companyFilterOptions = [
    { label: t('adminJobs.allCompanies'), value: '' },
    ...companies,
  ];

  const columns: Column<PendingJob>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
      render: (j) =>
        j.status === 'Pending' ? (
          <input
            type="checkbox"
            checked={selected.has(j.jobId)}
            onChange={() => toggleSelect(j.jobId)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
          />
        ) : (
          <span />
        ),
    },
    { key: 'designation', header: t('common:labels.designation') },
    { key: 'company', header: t('common:labels.company') },
    { key: 'city', header: t('common:labels.location') },
    { key: 'ctc', header: 'CTC', render: (j) => `${lpa(j.minCtc)} – ${lpa(j.maxCtc)}` },
    {
      key: 'views',
      header: t('adminJobs.views'),
      render: (j) => (
        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <Eye className="h-3.5 w-3.5" /> {(j.views ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'applications',
      header: t('adminJobs.applications'),
      render: (j) => (
        <span className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-400">
          <FileText className="h-3.5 w-3.5" /> {(j.applications ?? 0).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'postedOn',
      header: t('common:labels.posted'),
      render: (j) => new Date(j.postedOn).toLocaleDateString(),
    },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (j) => (
        <Badge tone={j.status === 'Active' ? 'green' : j.status === 'Pending' ? 'amber' : j.status === 'Rejected' ? 'red' : 'gray'}>
          {j.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: t('common:labels.actions'),
      render: (j) =>
        j.status === 'Pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => moderate.mutate({ jobId: j.jobId, action: 'approve' })}
              disabled={moderate.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('adminJobs.approve')}
            </button>
            <button
              onClick={() => setRejectTarget(j)}
              disabled={moderate.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
            >
              <XCircle className="h-3.5 w-3.5" /> {t('adminJobs.reject')}
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">--</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('adminJobs.heading') }]} />

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-navy dark:text-white" />
          <h1 className="font-heading text-2xl font-bold text-navy dark:text-white">{t('adminJobs.heading')}</h1>
        </div>
        <ExportButton
          endpoint="/exports/jobs"
          filename={`jobs-export-${new Date().toISOString().slice(0, 10)}`}
          label="Export Jobs"
          filters={{
            ...(statusFilter ? { status: statusFilter } : {}),
            ...(companyFilter ? { company: companyFilter } : {}),
          }}
        />
      </div>

      {/* Stats bar */}
      {!isLoading && data && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="!p-3 text-center">
            <p className="text-2xl font-bold text-navy dark:text-white">{stats.total}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminJobs.totalJobs')}</p>
          </Card>
          <Card className="!p-3 text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.active}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminJobs.activeJobs')}</p>
          </Card>
          <Card className="!p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminJobs.pendingJobs')}</p>
          </Card>
          <Card className="!p-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.totalApps}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('adminJobs.totalApplications')}</p>
          </Card>
        </div>
      )}

      {/* Search & Filter bar */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t('adminJobs.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full sm:w-40">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select
            options={companyFilterOptions}
            value={companyFilter}
            onChange={(e) => { setCompanyFilter(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
          <span className="text-sm font-medium text-amber-700 dark:text-amber-300">
            {t('adminJobs.selectedCount', { count: selected.size })}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkAction('approve')}>
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('adminJobs.approveSelected')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => setBulkAction('reject')}>
              <XCircle className="h-3.5 w-3.5" /> {t('adminJobs.rejectSelected')}
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-brand-soft text-navy dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-200">
            <tr>
              <th className="w-10 px-3 py-2.5 sm:px-4 sm:py-3">
                <input
                  type="checkbox"
                  onChange={toggleSelectAll}
                  checked={
                    paginatedData.items.filter((j) => j.status === 'Pending').length > 0 &&
                    paginatedData.items.filter((j) => j.status === 'Pending').every((j) => selected.has(j.jobId))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
              </th>
              {columns.slice(1).map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          {!useVirtualized && (
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                    {columns.map((c, ci) => {
                      const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3'];
                      return (
                        <td key={c.key} className="px-3 py-2.5 sm:px-4 sm:py-3">
                          <div className={`h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-600 ${widths[(i + ci) % widths.length]}`} />
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : paginatedData.items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    {t('adminJobs.noJobs')}
                  </td>
                </tr>
              ) : (
                paginatedData.items.map((row) => (
                  <tr
                    key={row.jobId}
                    className={`border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${
                      selected.has(row.jobId) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    {columns.map((c) => (
                      <td key={c.key} className={`px-3 py-2.5 sm:px-4 sm:py-3 ${c.className ?? ''}`}>
                        {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          )}
        </table>
        {useVirtualized && !isLoading && (
          <VirtualList
            items={paginatedData.items}
            itemHeight={48}
            overscan={8}
            className="max-h-[600px]"
            renderItem={(row) => (
              <div
                key={row.jobId}
                className={`flex border-b border-gray-100 text-sm transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${
                  selected.has(row.jobId) ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''
                }`}
              >
                {columns.map((c) => (
                  <div key={c.key} className={`flex-1 px-3 py-2.5 sm:px-4 sm:py-3 ${c.className ?? ''}`}>
                    {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? '')}
                  </div>
                ))}
              </div>
            )}
          />
        )}
      </div>

      {/* Pagination (hidden when virtualized) */}
      {!useVirtualized && paginatedData.pageCount > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination page={page} pageCount={paginatedData.pageCount} onChange={setPage} />
        </div>
      )}

      {/* Single reject confirm */}
      <ConfirmDialog
        isOpen={!!rejectTarget}
        title={t('adminJobs.reject')}
        message={t('adminJobs.rejectWarning', {
          designation: rejectTarget?.designation,
          company: rejectTarget?.company,
          defaultValue: `Are you sure you want to reject "${rejectTarget?.designation}" from ${rejectTarget?.company}?`,
        })}
        confirmLabel={t('adminJobs.reject')}
        variant="danger"
        onConfirm={() => {
          if (rejectTarget) {
            moderate.mutate(
              { jobId: rejectTarget.jobId, action: 'reject' },
              { onSettled: () => setRejectTarget(null) },
            );
          }
        }}
        onCancel={() => setRejectTarget(null)}
        isLoading={moderate.isPending}
      />

      {/* Bulk action confirm */}
      <ConfirmDialog
        isOpen={!!bulkAction}
        title={t('adminJobs.confirmBulkAction')}
        message={
          bulkAction === 'approve'
            ? t('adminJobs.bulkApproveWarning', { count: selected.size })
            : t('adminJobs.bulkRejectWarning', { count: selected.size })
        }
        confirmLabel={bulkAction === 'approve' ? t('adminJobs.approve') : t('adminJobs.reject')}
        variant={bulkAction === 'reject' ? 'danger' : 'info'}
        onConfirm={() => {
          if (bulkAction) {
            bulkMutation.mutate({ action: bulkAction, jobIds: Array.from(selected) });
          }
        }}
        onCancel={() => setBulkAction(null)}
        isLoading={bulkMutation.isPending}
      />
    </div>
  );
}
