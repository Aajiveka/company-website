import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, XCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Badge, Breadcrumbs, Button, Modal, statusTone, Table, useToast, type Column } from '@/components/ui';
import { useCompanyJobs, useDeactivateJob } from '../client.api';
import type { JobListing } from '../client.types';

const inr = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

/** Client — manage posted jobs (manage-job.aspx / manage-opening.aspx). */
export default function ManageJobsPage() {
  const { data, isLoading } = useCompanyJobs();
  const deactivate = useDeactivateJob();
  const { notify } = useToast();
  const [confirmJob, setConfirmJob] = useState<JobListing | null>(null);

  const onConfirmDeactivate = () => {
    if (!confirmJob) return;
    deactivate.mutate(confirmJob.jobId, {
      onSuccess: () => {
        notify('Job closed.', 'success');
        setConfirmJob(null);
      },
      onError: (e) => {
        notify(isAxiosError(e) ? e.response?.data?.message ?? 'Could not close this job' : 'Could not close this job', 'error');
        setConfirmJob(null);
      },
    });
  };

  const columns: Column<JobListing>[] = [
    { key: 'designation', header: 'Designation' },
    { key: 'city', header: 'Location' },
    { key: 'workMode', header: 'Work Mode' },
    { key: 'ctc', header: 'CTC', render: (j) => `${inr(j.minCtc)} – ${inr(j.maxCtc)}` },
    { key: 'applicants', header: 'Applicants' },
    { key: 'postedOn', header: 'Posted' },
    { key: 'status', header: 'Status', render: (j) => <Badge tone={statusTone(j.status)}>{j.status}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      render: (j) => (
        <div className="flex gap-2">
          <Link
            to={`/company/jobs/${j.jobId}/edit`}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10"
          >
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Link>
          {j.status === 'Active' && (
            <button
              onClick={() => setConfirmJob(j)}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <XCircle className="h-3.5 w-3.5" /> Close
            </button>
          )}
        </div>
      ),
    },
  ];

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

      <Modal open={!!confirmJob} onClose={() => setConfirmJob(null)} title="Close this job posting?">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {confirmJob?.designation} in {confirmJob?.city} will no longer accept applicants. This can't be undone from here.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmJob(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" disabled={deactivate.isPending} onClick={onConfirmDeactivate}>
              Close Job
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
