import { Badge, Breadcrumbs, statusTone, Table, type Column } from '@/components/ui';
import { useAppliedJobs } from '../candidate.api';
import type { AppliedJob } from '../candidate.types';

const columns: Column<AppliedJob>[] = [
  { key: 'designation', header: 'Job' },
  { key: 'company', header: 'Company' },
  { key: 'city', header: 'Location' },
  { key: 'appliedOn', header: 'Applied On' },
  { key: 'status', header: 'Status', render: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
];

/** Candidate — jobs applied to (candidate-dashboard-applied-job.aspx). */
export default function AppliedJobsPage() {
  const { data, isLoading } = useAppliedJobs();
  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/candidate/profile' }, { label: 'Applied Jobs' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Applied Jobs</h1>
      <Table columns={columns} data={data ?? []} rowKey={(j) => j.jobId} isLoading={isLoading} emptyMessage="You haven't applied to any jobs yet." />
    </div>
  );
}
