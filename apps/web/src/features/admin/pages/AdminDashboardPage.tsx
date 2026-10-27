import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Building2, GitBranch, IndianRupee, UserCheck, Users } from 'lucide-react';
import { ROLE_LABEL, type RoleId } from '@/types/roles';
import { useAdminStats } from '../admin.api';
import { PIPELINE_STAGES, STAGE_LABEL } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import {
  ErrorState,
  Panel,
  StatCard,
} from '../components/primitives';
import { actionLabel, fmtInr, fmtRelative } from '../admin.format';

/** One horizontal bar per row, scaled to the largest — a single hue, so length carries it. */
function BarList({
  rows,
  hrefOf,
  empty,
}: {
  rows: { label: string; count: number; key?: string }[];
  hrefOf?: (row: { label: string; key?: string }) => string;
  empty: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  if (!rows.some((r) => r.count)) return <p className="py-6 text-center text-sm text-gray-500">{empty}</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="truncate text-gray-700 dark:text-gray-200">{r.label}</span>
              <span className="font-semibold tabular-nums text-navy dark:text-white">{r.count.toLocaleString('en-IN')}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-aj-line-soft dark:bg-gray-700">
              <div className="h-full rounded-full bg-aj-blue" style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
          </>
        );
        return (
          <li key={r.key ?? r.label}>
            {hrefOf ? (
              <Link to={hrefOf(r)} className="block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aj-blue/40">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** 30 daily columns. Days without a signup are drawn as gaps, not skipped. */
function SignupColumns({ data }: { data: { date: string; count: number }[] }) {
  const byDay = new Map(data.map((d) => [d.date, d.count]));
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().slice(0, 10);
    return { key, count: byDay.get(key) ?? 0 };
  });
  const max = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((n, d) => n + d.count, 0);
  return (
    <div>
      <p className="mb-3 text-sm text-gray-600 dark:text-gray-300">
        <strong className="font-display text-xl text-navy dark:text-white">{total}</strong> new candidates in the last 30 days
      </p>
      <div className="flex h-28 items-end gap-0.75" role="img" aria-label={`${total} candidate signups over the last 30 days`}>
        {days.map((d) => (
          <div
            key={d.key}
            title={`${d.key}: ${d.count}`}
            className="flex-1 rounded-t bg-aj-blue/85"
            style={{ height: d.count ? `${Math.max(6, (d.count / max) * 100)}%` : '2px', opacity: d.count ? 1 : 0.25 }}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-gray-400">
        <span>30 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error, refetch } = useAdminStats();

  return (
    <AdminShell title="Dashboard" subtitle="Live figures from the Aajiveka database">
      {error ? (
        <Panel>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Panel>
      ) : isLoading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-23 animate-pulse rounded-xl bg-white dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              icon={Users}
              label="Logins"
              value={data.users.total.toLocaleString('en-IN')}
              hint={`${data.users.active} active · ${data.users.inactive} inactive`}
              to="/admin/users"
            />
            <StatCard
              icon={UserCheck}
              tone={data.employers.pendingRegistrations ? 'amber' : 'green'}
              label="Employer registrations awaiting review"
              value={data.employers.pendingRegistrations}
              hint={data.employers.pendingRegistrations ? 'Review to let them sign in' : 'Nothing waiting'}
              to="/admin/employer-approvals"
            />
            <StatCard
              icon={Building2}
              tone="violet"
              label="Companies"
              value={data.employers.total.toLocaleString('en-IN')}
              hint={`${data.candidates.total.toLocaleString('en-IN')} candidates registered`}
              to="/admin/companies"
            />
            <StatCard
              icon={Briefcase}
              tone="green"
              label="Active jobs"
              value={data.jobs.byStatus.Active.toLocaleString('en-IN')}
              hint={`${data.jobs.total} total · ${data.jobs.byStatus.Draft} draft · ${data.jobs.byStatus.Closed} closed`}
              to="/admin/jobs"
            />
            <StatCard
              icon={GitBranch}
              label="Applications"
              value={data.applications.total.toLocaleString('en-IN')}
              hint={`${data.applications.byStage.Joined} joined · ${data.applications.byStage.Closed} closed`}
              to="/admin/applications"
            />
            <StatCard
              icon={IndianRupee}
              tone="green"
              label="Revenue (successful payments)"
              value={fmtInr(data.payments.revenueInr)}
              hint={`${data.payments.successfulOrders} orders`}
              to="/admin/reports"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
            <Panel
              className="lg:col-span-3"
              title="Hiring pipeline"
              description="Every application by the stage it is in now. Select a stage to see its applications."
            >
              <BarList
                rows={PIPELINE_STAGES.map((s) => ({ key: s, label: STAGE_LABEL[s], count: data.applications.byStage[s] }))}
                hrefOf={(r) => `/admin/applications?stage=${r.key}`}
                empty="No applications yet."
              />
            </Panel>
            <Panel className="lg:col-span-2" title="Candidate signups">
              <SignupColumns data={data.signups} />
            </Panel>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Panel title="Logins by role">
              <BarList
                rows={data.users.byRole.map((r) => ({
                  key: String(r.roleId),
                  label: ROLE_LABEL[r.roleId as RoleId] ?? `Role ${r.roleId}`,
                  count: r.count,
                }))}
                hrefOf={(r) => `/admin/users?roleId=${r.key}`}
                empty="No logins."
              />
            </Panel>
            <Panel title="Most-posted designations">
              <BarList rows={data.topDesignations} empty="No jobs posted yet." />
            </Panel>
            <Panel title="Top job cities">
              <BarList rows={data.topCities} empty="No jobs posted yet." />
            </Panel>
          </div>

          <Panel
            title="Recent activity"
            description="The latest entries in the audit trail"
            action={
              <Link to="/admin/audit" className="inline-flex items-center gap-1 text-sm font-semibold text-aj-blue hover:underline">
                Full audit log <ArrowRight className="h-4 w-4" />
              </Link>
            }
            bodyClassName="p-0"
          >
            {data.recentActivity.length ? (
              <ul className="divide-y divide-aj-line-soft dark:divide-gray-700">
                {data.recentActivity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 px-4 py-3 text-sm sm:px-5">
                    <div className="min-w-0">
                      <p className="text-gray-800 dark:text-gray-100">{actionLabel(a.action)}</p>
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {a.userId ? (
                          <Link to={`/admin/users/${a.userId}`} className="hover:text-aj-blue hover:underline">
                            {a.actor}
                          </Link>
                        ) : (
                          a.actor
                        )}
                        {a.entity && ` · ${a.entity}${a.entityId && a.entityId !== '0' ? ` #${a.entityId}` : ''}`}
                      </p>
                    </div>
                    <time dateTime={a.at} className="shrink-0 text-xs text-gray-400">
                      {fmtRelative(a.at)}
                    </time>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-8 text-center text-sm text-gray-500">No activity recorded yet.</p>
            )}
          </Panel>
        </div>
      )}
    </AdminShell>
  );
}
