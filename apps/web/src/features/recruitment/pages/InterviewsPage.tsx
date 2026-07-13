import { Badge, Breadcrumbs, Table, type Column } from '@/components/ui';
import { useInterviews } from '../recruitment.api';
import type { InterviewRow } from '../recruitment.types';

const modeTone = { 'In-person': 'purple', Telephonic: 'blue', Video: 'green' } as const;

const columns: Column<InterviewRow>[] = [
  { key: 'candidate', header: 'Candidate' },
  { key: 'designation', header: 'Designation' },
  { key: 'company', header: 'Company' },
  { key: 'mode', header: 'Mode', render: (r) => <Badge tone={modeTone[r.mode]}>{r.mode}</Badge> },
  { key: 'scheduledAt', header: 'Scheduled' },
  {
    key: 'status',
    header: 'Status',
    render: (r) => <Badge tone={r.status === 'Completed' ? 'green' : r.status === 'Cancelled' ? 'red' : 'blue'}>{r.status}</Badge>,
  },
];

/** QC — interview schedule (Interviews.aspx / Interview-status.aspx). */
export default function InterviewsPage() {
  const { data, isLoading } = useInterviews();
  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: 'Recruitment', to: '/recruitment/candidates' }, { label: 'Interviews' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Interviews</h1>
      <Table columns={columns} data={data ?? []} rowKey={(r) => r.interviewId} isLoading={isLoading} emptyMessage="No interviews scheduled." />
    </div>
  );
}
