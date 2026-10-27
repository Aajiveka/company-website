import { Link, useSearchParams } from 'react-router-dom';
import { useAdminCompanies } from '../admin.api';
import type { AdminCompany } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import {
  ActivePill,
  DataTable,
  Empty,
  ErrorState,
  Panel,
  SearchInput,
  TableFooter,
  type ColumnDef,
} from '../components/primitives';
import { fmtDate } from '../admin.format';

export default function AdminCompaniesPage() {
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const q = params.get('q') ?? '';
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

  const { data, isLoading, error, refetch } = useAdminCompanies({ page, q });

  const columns: ColumnDef<AdminCompany>[] = [
    {
      key: 'name',
      header: 'Company',
      cell: (c) => (
        <span className="block min-w-0">
          <span className="block truncate font-semibold text-navy dark:text-white">{c.name}</span>
          <span className="block truncate text-xs font-normal text-gray-500">{c.email || '—'}</span>
        </span>
      ),
    },
    { key: 'city', header: 'City', cell: (c) => c.city || '—' },
    {
      key: 'jobs',
      header: 'Jobs',
      cell: (c) =>
        c.jobs ? (
          <Link to={`/admin/jobs?clientId=${c.clientId}`} className="tabular-nums text-aj-blue hover:underline">
            {c.activeJobs} active / {c.jobs}
          </Link>
        ) : (
          <span className="text-gray-400">0</span>
        ),
    },
    { key: 'apps', header: 'Applications', cell: (c) => <span className="tabular-nums">{c.applications}</span> },
    {
      key: 'login',
      header: 'Employer login',
      wideOnCard: true,
      cell: (c) =>
        c.login ? (
          <Link to={`/admin/users/${c.login.userId}`} className="inline-flex items-center gap-2 hover:underline">
            <span className="truncate">{c.login.userName}</span>
            <ActivePill active={c.login.isActive} />
          </Link>
        ) : (
          <span className="text-xs text-gray-400" title="Imported or created without a login of its own">
            No login
          </span>
        ),
    },
    { key: 'since', header: 'Added', cell: (c) => fmtDate(c.createdAt), className: 'whitespace-nowrap' },
  ];

  return (
    <AdminShell
      title="Companies"
      subtitle="Employers on the platform, with their jobs and applications"
      crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Companies' }]}
    >
      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-aj-line-soft p-4 sm:flex-row sm:items-center dark:border-gray-700">
          <SearchInput label="Search companies" placeholder="Company name or email" value={q} onChange={(v) => set('q', v)} />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            New companies join by registering and being approved under{' '}
            <Link to="/admin/employer-approvals" className="text-aj-blue hover:underline">
              Employer approvals
            </Link>
            .
          </p>
        </div>
        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(c) => c.clientId}
            isLoading={isLoading}
            empty={<Empty title="No companies match" />}
          />
        )}
        {data && (
          <TableFooter page={data.page} pageCount={data.pageCount} total={data.total} pageSize={data.pageSize} onPage={(p) => set('page', String(p))} />
        )}
      </Panel>
    </AdminShell>
  );
}
