import { Download } from 'lucide-react';
import {
  PageHeader,
  SecondaryButton,
  SimpleBarChart,
  StatCard,
} from '@/employer/components/Cards/ui';
import { useCompanyAnalytics } from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';

export function AnalyticsPage() {
  const { data, isLoading, isError, error } = useCompanyAnalytics();

  const funnel = [
    { label: 'Applied', value: data?.totalApplications ?? 0 },
    { label: 'Mapped', value: data?.mapped ?? 0 },
    { label: 'Shortlisted', value: data?.shortlisted ?? 0 },
    { label: 'Interview', value: data?.interviewScheduled ?? 0 },
    { label: 'Hired', value: data?.selected ?? 0 },
    { label: 'Rejected', value: data?.rejected ?? 0 },
  ];
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);
  const top = funnel[0]?.value || 1;

  const jobSeries = (data?.jobPerformance ?? []).slice(0, 12).map((j) => j.applications);

  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Hiring funnel and per-job application volume."
        actions={
          <SecondaryButton disabled>
            <Download className="h-4 w-4" />
            Export
          </SecondaryButton>
        }
      />

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load analytics')}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Jobs" value={isLoading ? '…' : data?.totalJobs ?? 0} />
        <StatCard label="Active Jobs" value={isLoading ? '…' : data?.activeJobs ?? 0} />
        <StatCard label="Applications" value={isLoading ? '…' : data?.totalApplications ?? 0} />
        <StatCard label="Hired" value={isLoading ? '…' : data?.selected ?? 0} />
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <SimpleBarChart title="Applications by job" values={jobSeries.length ? jobSeries : [0]} />
        <SimpleBarChart
          title="Funnel volumes"
          values={funnel.map((f) => f.value)}
        />
      </div>

      <section className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800">Hiring Funnel</h3>
          <span className="text-[11px] text-slate-400">Current data</span>
        </div>
        <div className="space-y-2">
          {funnel.map((stage) => (
            <div key={stage.label} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2">
              <span className="text-[11px] font-medium text-slate-600">{stage.label}</span>
              <div className="h-6 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="flex h-full items-center rounded-md bg-[#1A56DB] px-2 text-[11px] font-medium text-white"
                  style={{ width: `${Math.max((stage.value / funnelMax) * 100, stage.value ? 8 : 0)}%` }}
                >
                  {stage.value}
                </div>
              </div>
              <span className="text-right text-[11px] text-slate-400">
                {Math.round((stage.value / top) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-3 py-2">
          <h3 className="text-xs font-semibold text-slate-800">Job performance</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">Apps</th>
                <th className="px-3 py-2">Shortlisted</th>
                <th className="px-3 py-2">Interview</th>
                <th className="px-3 py-2">Hired</th>
                <th className="px-3 py-2">Rejected</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.jobPerformance ?? []).map((j) => (
                <tr key={j.jobId}>
                  <td className="px-3 py-2 font-medium text-slate-800">{j.designation || `Job #${j.jobId}`}</td>
                  <td className="px-3 py-2">{j.applications}</td>
                  <td className="px-3 py-2">{j.shortlisted}</td>
                  <td className="px-3 py-2">{j.interviewScheduled}</td>
                  <td className="px-3 py-2">{j.selected}</td>
                  <td className="px-3 py-2">{j.rejected}</td>
                </tr>
              ))}
              {!data?.jobPerformance?.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    {isLoading ? 'Loading…' : 'No job performance data yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <StatCard label="Avg. Time to Hire" value="—" delta="Not tracked" />
        <StatCard label="Offer Accept Rate" value="—" delta="Not tracked" />
        <StatCard label="Top Source" value="—" delta="Not tracked" />
      </div>
    </div>
  );
}
