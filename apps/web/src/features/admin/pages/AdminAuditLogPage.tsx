import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui';
import { useAdminAudit } from '../admin.api';
import { AdminShell } from '../components/AdminShell';
import { AuditList } from '../components/AuditList';
import { ErrorState, FilterSelect, Panel, TableFooter } from '../components/primitives';

/** Filters by action prefix, so "q3." matches every Q3 action. */
const AREAS = [
  { value: '', label: 'All activity' },
  { value: 'admin.', label: 'Admin panel' },
  { value: 'auth.', label: 'Sign-ins' },
  { value: 'password.', label: 'Passwords' },
  { value: 'job.', label: 'Jobs & applying' },
  { value: 'candidate.', label: 'Candidates' },
  { value: 'q1.', label: 'Q1 screening' },
  { value: 'q2.', label: 'Q2 matching' },
  { value: 'cv.', label: 'CV referrals' },
  { value: 'q3.', label: 'Q3 hiring ops' },
  { value: 'interview.', label: 'Interviews' },
  { value: 'offer.', label: 'Offers' },
  { value: 'applicant.', label: 'Employer decisions' },
  { value: 'payment.', label: 'Payments' },
  { value: 'export.', label: 'Exports' },
];

const ENTITIES = [
  { value: '', label: 'Any record' },
  { value: 'SecUser', label: 'User accounts' },
  { value: 'ClientJobs', label: 'Jobs' },
  { value: 'JobSubscriberMapping', label: 'Applications' },
  { value: 'EmployerRegistration', label: 'Employer registrations' },
  { value: 'BlogPost', label: 'Blog posts' },
];

export default function AdminAuditLogPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const action = params.get('action') ?? '';
  const entity = params.get('entity') ?? '';
  const userId = params.get('userId') ? Number(params.get('userId')) : undefined;
  const set = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        if (key !== 'page') next.delete('page');
        return next;
      },
      { replace: true },
    );

  const { data, isLoading, error, refetch } = useAdminAudit({ page, pageSize: 30, action, entity, userId });

  return (
    <AdminShell
      title="Audit log"
      subtitle="Who did what, and when — append-only"
      crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Audit log' }]}
    >
      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-aj-line-soft p-4 sm:flex-row sm:flex-wrap sm:items-center dark:border-gray-700">
          <FilterSelect label="Area" value={action} onChange={(v) => set('action', v)} options={AREAS} />
          <FilterSelect label="Record type" value={entity} onChange={(v) => set('entity', v)} options={ENTITIES} />
          {userId && (
            <Button size="sm" variant="ghost" onClick={() => set('userId', '')}>
              One user only · clear
            </Button>
          )}
        </div>
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-2 p-4" aria-busy="true">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-700" />
            ))}
          </div>
        ) : (
          <AuditList entries={data?.items ?? []} empty="Nothing recorded for these filters." />
        )}
        {data && (
          <TableFooter page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={(p) => set('page', String(p))} />
        )}
      </Panel>
    </AdminShell>
  );
}
