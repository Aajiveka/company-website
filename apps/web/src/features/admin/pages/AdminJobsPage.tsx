import { CheckCircle2, XCircle } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Table, useToast, type Column } from '@/components/ui';
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
}

const lpa = (rupees: number) => `₹${(rupees / 100_000).toFixed(1)}L`;

export default function AdminJobsPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'jobs'],
    queryFn: () => api.get<PendingJob[]>('/admin/jobs').then((r) => r.data),
  });

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

  const columns: Column<PendingJob>[] = [
    { key: 'designation', header: t('common:labels.designation') },
    { key: 'company', header: t('common:labels.company') },
    { key: 'city', header: t('common:labels.location') },
    { key: 'ctc', header: 'CTC', render: (j) => `${lpa(j.minCtc)} – ${lpa(j.maxCtc)}` },
    { key: 'postedOn', header: t('common:labels.posted') },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (j) => (
        <Badge tone={j.status === 'Active' ? 'green' : j.status === 'Pending' ? 'amber' : 'gray'}>
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
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('adminJobs.approve')}
            </button>
            <button
              onClick={() => moderate.mutate({ jobId: j.jobId, action: 'reject' })}
              disabled={moderate.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" /> {t('adminJobs.reject')}
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('adminJobs.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('adminJobs.heading')}</h1>
      <Table columns={columns} data={data ?? []} rowKey={(j) => j.jobId} isLoading={isLoading} emptyMessage={t('adminJobs.noJobs')} />
    </div>
  );
}
