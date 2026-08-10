import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SimpleBarChart,
  StatCard,
} from '@/employer/components/Cards/ui';
import { mockDashboard } from '@/employer/constants/mockData';

const funnel = [
  { label: 'Applied', value: 386 },
  { label: 'Screened', value: 210 },
  { label: 'Shortlisted', value: 98 },
  { label: 'Interviewed', value: 41 },
  { label: 'Offered', value: 22 },
  { label: 'Hired', value: 14 },
];

const funnelMax = Math.max(...funnel.map((f) => f.value));

export function AnalyticsPage() {
  return (
    <div>
      <PageHeader
        title="Analytics"
        subtitle="Hiring funnel, volume trends, and exportable reports."
        actions={
          <>
            <SecondaryButton>
              <FileText className="h-4 w-4" />
              Export PDF
            </SecondaryButton>
            <SecondaryButton>
              <FileSpreadsheet className="h-4 w-4" />
              Export Excel
            </SecondaryButton>
            <PrimaryButton>
              <Download className="h-4 w-4" />
              Export CSV
            </PrimaryButton>
          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {mockDashboard.stats.slice(0, 4).map((s) => (
          <StatCard key={s.id} label={s.label} value={s.value} delta={s.delta} />
        ))}
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <SimpleBarChart title="Hiring Trend (12 mo)" values={mockDashboard.hiringTrend} />
        <SimpleBarChart title="Applicants by Month" values={mockDashboard.monthlyApplicants} />
      </div>

      <section className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-800">Hiring Funnel</h3>
          <span className="text-[11px] text-slate-400">Current period</span>
        </div>
        <div className="space-y-2">
          {funnel.map((stage) => (
            <div key={stage.label} className="grid grid-cols-[6rem_1fr_2.5rem] items-center gap-2">
              <span className="text-[11px] font-medium text-slate-600">{stage.label}</span>
              <div className="h-6 overflow-hidden rounded-md bg-slate-100">
                <div
                  className="flex h-full items-center rounded-md bg-[#1A56DB] px-2 text-[11px] font-medium text-white"
                  style={{ width: `${Math.max((stage.value / funnelMax) * 100, 8)}%` }}
                >
                  {stage.value}
                </div>
              </div>
              <span className="text-right text-[11px] text-slate-400">
                {Math.round((stage.value / funnel[0].value) * 100)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <StatCard label="Avg. Time to Hire" value="28 days" delta="-3 days" />
        <StatCard label="Offer Accept Rate" value="78%" delta="+4%" />
        <StatCard label="Source: LinkedIn" value="42%" delta="Top channel" />
      </div>
    </div>
  );
}
