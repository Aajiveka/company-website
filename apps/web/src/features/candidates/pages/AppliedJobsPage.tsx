import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, statusTone, Table, type Column } from '@/components/ui';
import { useAppliedJobs } from '../candidate.api';
import type { AppliedJob } from '../candidate.types';

/** Candidate — jobs applied to (candidate-dashboard-applied-job.aspx). */
export default function AppliedJobsPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useAppliedJobs();

  const columns: Column<AppliedJob>[] = [
    { key: 'designation', header: t('common:labels.designation') },
    { key: 'company', header: t('common:labels.company') },
    { key: 'city', header: t('common:labels.location') },
    { key: 'appliedOn', header: t('candidates.applied') },
    { key: 'status', header: t('common:labels.status'), render: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('appliedJobs.heading') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('appliedJobs.heading')}</h1>
      <Table columns={columns} data={data ?? []} rowKey={(j) => j.jobId} isLoading={isLoading} emptyMessage={t('appliedJobs.noJobs')} />
    </div>
  );
}
