import { Link } from 'react-router-dom';
import { Badge, Breadcrumbs, statusTone, Table, type Column } from '@/components/ui';
import { useApplicants } from '../client.api';
import type { CandidateRow } from '@/features/recruitment/recruitment.types';

const columns: Column<CandidateRow>[] = [
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
];

/** Client — applicants for the company's jobs (job-applicants.aspx). */
export default function ApplicantsPage() {
  const { data, isLoading } = useApplicants();
  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/company/profile' }, { label: 'Applicants' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Applicants</h1>
      <Table columns={columns} data={data ?? []} rowKey={(r) => r.subscriberId} isLoading={isLoading} emptyMessage="No applicants yet." />
    </div>
  );
}
