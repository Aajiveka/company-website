import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/axios';
import { Badge, Breadcrumbs, statusTone, Table, useToast, type Column } from '@/components/ui';
import { useApplicants, useDecideApplicant, type ApplicantRow } from '../client.api';

/** Client — applicants for the company's jobs (job-applicants.aspx). */
export default function ApplicantsPage() {
  const { data, isLoading } = useApplicants();
  const decide = useDecideApplicant();
  const { notify } = useToast();

  const act = (jobSubscriberMapId: number, decision: 'Shortlisted' | 'Rejected') =>
    decide.mutate(
      { jobSubscriberMapId, decision },
      {
        onSuccess: () => notify(`Applicant ${decision.toLowerCase()}.`, decision === 'Shortlisted' ? 'success' : 'info'),
        onError: (e) =>
          notify(getErrorMessage(e, 'Something went wrong'), 'error'),
      },
    );

  const columns: Column<ApplicantRow>[] = [
    {
      key: 'fullName',
      header: 'Candidate',
      render: (r) => (
        <Link to={`/recruitment/candidates/${r.subscriberId}`} className="font-medium text-primary hover:underline">
          {r.fullName}
        </Link>
      ),
    },
    { key: 'designation', header: 'Designation' },
    { key: 'city', header: 'Location' },
    { key: 'experience', header: 'Experience' },
    { key: 'appliedOn', header: 'Applied On' },
    { key: 'jobStatus', header: 'Status', render: (r) => <Badge tone={statusTone(r.jobStatus)}>{r.jobStatus}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.jobStatus === 'Applied' || r.jobStatus === 'Mapped' ? (
          <div className="flex gap-2">
            <button
              onClick={() => act(r.jobSubscriberMapId, 'Shortlisted')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <Check className="h-3.5 w-3.5" /> Shortlist
            </button>
            <button
              onClick={() => act(r.jobSubscriberMapId, 'Rejected')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/company/profile' }, { label: 'Applicants' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Applicants</h1>
      <Table columns={columns} data={data ?? []} rowKey={(r) => r.jobSubscriberMapId} isLoading={isLoading} emptyMessage="No applicants yet." />
    </div>
  );
}
