import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Pencil, Plus, XCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Button, ConfirmDialog, statusTone, Table, useToast, type Column } from '@/components/ui';
import { useCompanyJobs, useDeactivateJob, useDuplicateJob } from '../client.api';
import type { JobListing } from '../client.types';

const inr = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

/** Client — manage posted jobs (manage-job.aspx / manage-opening.aspx). */
export default function ManageJobsPage() {
  const { t } = useTranslation('public');
  const { data, isLoading } = useCompanyJobs();
  const deactivate = useDeactivateJob();
  const duplicate = useDuplicateJob();
  const { notify } = useToast();
  const [confirmJob, setConfirmJob] = useState<JobListing | null>(null);

  const onConfirmDeactivate = () => {
    if (!confirmJob) return;
    deactivate.mutate(confirmJob.jobId, {
      onSuccess: () => {
        notify(t('manageJobs.closedSuccess'), 'success');
        setConfirmJob(null);
      },
      onError: (e) => {
        notify(isAxiosError(e) ? e.response?.data?.message ?? t('manageJobs.closeFailed') : t('manageJobs.closeFailed'), 'error');
        setConfirmJob(null);
      },
    });
  };

  const columns: Column<JobListing>[] = [
    { key: 'designation', header: t('common:labels.designation') },
    { key: 'city', header: t('common:labels.location') },
    { key: 'workMode', header: t('common:labels.workMode') },
    { key: 'ctc', header: 'CTC', render: (j) => `${inr(j.minCtc)} – ${inr(j.maxCtc)}` },
    { key: 'applicants', header: t('dashboard:company.applicants', { ns: 'dashboard' }) },
    { key: 'postedOn', header: t('common:labels.posted') },
    { key: 'status', header: t('common:labels.status'), render: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
    {
      key: 'actions',
      header: t('common:labels.actions'),
      render: (j) => (
        <div className="flex gap-2">
          <Link
            to={`/company/jobs/${j.jobId}/edit`}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Pencil className="h-3.5 w-3.5" /> {t('common:actions.edit')}
          </Link>
          <button
            onClick={() => duplicate.mutate(j.jobId, {
              onSuccess: () => notify(t('manageJobs.duplicated'), 'success'),
              onError: () => notify(t('manageJobs.duplicateFailed'), 'error'),
            })}
            disabled={duplicate.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100"
          >
            <Copy className="h-3.5 w-3.5" /> {t('manageJobs.duplicate')}
          </button>
          {j.status === 'Active' && (
            <button
              onClick={() => setConfirmJob(j)}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" /> {t('common:actions.close')}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/company/profile' }, { label: t('manageJobs.heading') }]} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">{t('manageJobs.heading')}</h1>
        <Link to="/company/post-job">
          <Button size="sm">
            <Plus className="h-4 w-4" /> {t('manageJobs.postJob')}
          </Button>
        </Link>
      </div>
      <Table columns={columns} data={data?.items ?? []} rowKey={(j) => j.jobId} isLoading={isLoading} emptyMessage={t('manageJobs.noJobs')} />

      <ConfirmDialog
        isOpen={!!confirmJob}
        title={t('manageJobs.closeTitle')}
        message={t('manageJobs.closeWarning', { designation: confirmJob?.designation, city: confirmJob?.city })}
        confirmLabel={t('manageJobs.closeButton')}
        variant="danger"
        onConfirm={onConfirmDeactivate}
        onCancel={() => setConfirmJob(null)}
        isLoading={deactivate.isPending}
      />
    </div>
  );
}
