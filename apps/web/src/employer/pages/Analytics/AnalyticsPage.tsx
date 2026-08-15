import { useMemo, useState } from 'react';
import {
  Briefcase,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  TrendingUp,
  Users,
  XCircle,
} from 'lucide-react';
import {
  PageHeader,
  SecondaryButton,
  SimpleBarChart,
  StatCard,
} from '@/employer/components/Cards/ui';
import {
  downloadAnalyticsAuditCsv,
  downloadAnalyticsSummaryCsv,
  useCompanyAnalytics,
} from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';
import { cn } from '@/lib/cn';

const FUNNEL_COLORS = [
  'bg-slate-500',
  'bg-[#1A56DB]',
  'bg-sky-500',
  'bg-amber-500',
  'bg-emerald-500',
  'bg-rose-500',
];

export function AnalyticsPage() {
  const { data, isLoading, isError, error, isFetching } = useCompanyAnalytics();
  const [exporting, setExporting] = useState<'summary' | 'audit' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const rates = data?.rates;
  const funnel = useMemo(
    () => [
      { label: 'Applied', value: data?.totalApplications ?? 0 },
      { label: 'New / Mapped', value: data?.mapped ?? 0 },
      { label: 'Shortlisted', value: data?.shortlisted ?? 0 },
      { label: 'Interview', value: data?.interviewScheduled ?? 0 },
      { label: 'Hired', value: data?.selected ?? 0 },
      { label: 'Rejected', value: data?.rejected ?? 0 },
    ],
    [data],
  );
  const funnelMax = Math.max(...funnel.map((f) => f.value), 1);
  const applied = funnel[0]?.value || 1;

  const monthSeries = data?.applicationsByMonth ?? [];
  const monthValues = monthSeries.map((m) => m.count);
  const monthLabels = monthSeries.map((m) => m.label);

  const topJobs = (data?.jobPerformance ?? []).slice(0, 8);
  const topJobValues = topJobs.map((j) => j.applications);
  const topJobLabels = topJobs.map((j) => (j.designation || `Job ${j.jobId}`).slice(0, 10));

  const jobStatusBars = [
    { label: 'Active', value: data?.activeJobs ?? 0, color: 'bg-emerald-500' },
    { label: 'Draft', value: data?.draftJobs ?? 0, color: 'bg-amber-500' },
    { label: 'Closed', value: data?.closedJobs ?? 0, color: 'bg-slate-400' },
    { label: 'Archived', value: data?.archivedJobs ?? 0, color: 'bg-rose-400' },
  ];
  const jobStatusMax = Math.max(...jobStatusBars.map((b) => b.value), 1);

  const exportSummary = () => {
    if (!data) return;
    setExportError(null);
    setExporting('summary');
    try {
      downloadAnalyticsSummaryCsv(data);
    } catch (err) {
      setExportError(getErrorMessage(err, 'Failed to export summary CSV'));
    } finally {
      setExporting(null);
    }
  };

  const exportAudit = async () => {
    setExportError(null);
    setExporting('audit');
    try {
      await downloadAnalyticsAuditCsv();
    } catch (err) {
      setExportError(getErrorMessage(err, 'Failed to export audit CSV'));
    } finally {
      setExporting(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Analytics & Reports"
        subtitle="Hiring funnel, conversion rates, and job performance — export anytime for audit."
        actions={
          <>
            <SecondaryButton disabled={!data || exporting != null} onClick={exportSummary}>
              <Download className="h-4 w-4" />
              {exporting === 'summary' ? 'Exporting…' : 'Export summary CSV'}
            </SecondaryButton>
            <SecondaryButton disabled={exporting != null} onClick={() => void exportAudit()}>
              <FileSpreadsheet className="h-4 w-4" />
              {exporting === 'audit' ? 'Exporting…' : 'Export full audit CSV'}
            </SecondaryButton>
          </>
        }
      />

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load analytics')}
        </p>
      )}
      {exportError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{exportError}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total jobs"
          value={isLoading ? '…' : data?.totalJobs ?? 0}
          delta={data ? `${data.activeJobs} active` : undefined}
          icon={<Briefcase className="h-4 w-4" />}
        />
        <StatCard
          label="Applications"
          value={isLoading ? '…' : data?.totalApplications ?? 0}
          delta={data ? `${data.mapped} new` : undefined}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Shortlist rate"
          value={isLoading ? '…' : `${rates?.shortlistRate ?? 0}%`}
          delta={data ? `${data.shortlisted} shortlisted` : undefined}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <StatCard
          label="Hire rate"
          value={isLoading ? '…' : `${rates?.hireRate ?? 0}%`}
          delta={data ? `${data.selected} hired` : undefined}
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Interview rate"
          value={isLoading ? '…' : `${rates?.interviewRate ?? 0}%`}
          delta={data ? `${data.interviewScheduled} in interview` : undefined}
        />
        <StatCard
          label="Reject rate"
          value={isLoading ? '…' : `${rates?.rejectRate ?? 0}%`}
          delta={data ? `${data.rejected} rejected` : undefined}
          icon={<XCircle className="h-4 w-4" />}
        />
        <StatCard
          label="Shortlist → Interview"
          value={isLoading ? '…' : `${rates?.interviewFromShortlist ?? 0}%`}
        />
        <StatCard
          label="Interview → Hire"
          value={isLoading ? '…' : `${rates?.hireFromInterview ?? 0}%`}
        />
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <SimpleBarChart
          title="Applications over last 12 months"
          values={monthValues.length ? monthValues : [0]}
          labels={monthLabels.length ? monthLabels : ['—']}
        />
        <SimpleBarChart
          title="Top jobs by applications"
          values={topJobValues.length ? topJobValues : [0]}
          labels={topJobLabels.length ? topJobLabels : ['—']}
        />
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800">Hiring funnel</h3>
            <span className="text-[11px] text-slate-400">
              {isFetching && !isLoading ? 'Updating…' : 'Live snapshot'}
            </span>
          </div>
          <div className="space-y-2">
            {funnel.map((stage, i) => (
              <div key={stage.label} className="grid grid-cols-[7rem_1fr_2.75rem] items-center gap-2">
                <span className="text-[11px] font-medium text-slate-600">{stage.label}</span>
                <div className="h-6 overflow-hidden rounded-md bg-slate-100">
                  <div
                    className={cn(
                      'flex h-full items-center rounded-md px-2 text-[11px] font-medium text-white transition-all',
                      FUNNEL_COLORS[i] ?? 'bg-[#1A56DB]',
                    )}
                    style={{
                      width: `${Math.max((stage.value / funnelMax) * 100, stage.value ? 6 : 0)}%`,
                    }}
                  >
                    {stage.value > 0 ? stage.value : ''}
                  </div>
                </div>
                <span className="text-right text-[11px] tabular-nums text-slate-400">
                  {Math.round((stage.value / applied) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold text-slate-800">Jobs by status</h3>
          <div className="space-y-2.5">
            {jobStatusBars.map((b) => (
              <div key={b.label}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-slate-600">{b.label}</span>
                  <span className="tabular-nums text-slate-500">{b.value}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn('h-full rounded-full transition-all', b.color)}
                    style={{ width: `${(b.value / jobStatusMax) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-center">
            <div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{data?.shortlisted ?? 0}</p>
              <p className="text-[10px] text-slate-500">Shortlisted</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{data?.interviewScheduled ?? 0}</p>
              <p className="text-[10px] text-slate-500">Interview</p>
            </div>
            <div>
              <p className="text-sm font-semibold tabular-nums text-slate-900">{data?.selected ?? 0}</p>
              <p className="text-[10px] text-slate-500">Hired</p>
            </div>
          </div>
        </section>
      </div>

      <section className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <h3 className="text-xs font-semibold text-slate-800">Job performance</h3>
          <p className="text-[11px] text-slate-400">
            Conversion % of applications per role — included in CSV exports
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Role</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Apps</th>
                <th className="px-3 py-2">Shortlisted</th>
                <th className="px-3 py-2">Interview</th>
                <th className="px-3 py-2">Hired</th>
                <th className="px-3 py-2">Rejected</th>
                <th className="px-3 py-2">Shortlist %</th>
                <th className="px-3 py-2">Hire %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.jobPerformance ?? []).map((j) => (
                <tr key={j.jobId} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 font-medium text-slate-800">{j.designation || `Job #${j.jobId}`}</td>
                  <td className="px-3 py-2 text-slate-600">{j.city || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{j.status || '—'}</td>
                  <td className="px-3 py-2 tabular-nums">{j.applications}</td>
                  <td className="px-3 py-2 tabular-nums">{j.shortlisted}</td>
                  <td className="px-3 py-2 tabular-nums">{j.interviewScheduled}</td>
                  <td className="px-3 py-2 tabular-nums">{j.selected}</td>
                  <td className="px-3 py-2 tabular-nums">{j.rejected}</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{j.shortlistRate}%</td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{j.hireRate}%</td>
                </tr>
              ))}
              {!data?.jobPerformance?.length && (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                    {isLoading ? 'Loading…' : 'No job performance data yet. Post jobs and receive applications to see analytics.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <p className="mt-3 text-[11px] text-slate-400">
        <strong className="font-medium text-slate-500">Full audit CSV</strong> includes summary metrics, monthly
        applications, job performance, and every applicant row (contact, status, job) for compliance / leadership
        reviews.
      </p>
    </div>
  );
}
