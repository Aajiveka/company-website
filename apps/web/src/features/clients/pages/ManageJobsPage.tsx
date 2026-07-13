import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Badge, Breadcrumbs, Button, statusTone, Table, type Column } from '@/components/ui';
import { useCompanyJobs } from '../client.api';
import type { JobListing } from '../client.types';

const inr = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

const columns: Column<JobListing>[] = [
  { key: 'designation', header: 'Designation' },
  { key: 'city', header: 'Location' },
  { key: 'workMode', header: 'Work Mode' },
  { key: 'ctc', header: 'CTC', render: (j) => `${inr(j.minCtc)} – ${inr(j.maxCtc)}` },
  { key: 'applicants', header: 'Applicants' },
  { key: 'postedOn', header: 'Posted' },
  { key: 'status', header: 'Status', render: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
];

/** Client — manage posted jobs (manage-job.aspx / manage-opening.aspx). */
export default function ManageJobsPage() {
  const { data, isLoading } = useCompanyJobs();
  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/company/profile' }, { label: 'Manage Jobs' }]} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">Manage Jobs</h1>
        <Link to="/company/post-job">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Post a Job
          </Button>
        </Link>
      </div>
      <Table columns={columns} data={data ?? []} rowKey={(j) => j.jobId} isLoading={isLoading} emptyMessage="No jobs posted yet." />
    </div>
  );
}
