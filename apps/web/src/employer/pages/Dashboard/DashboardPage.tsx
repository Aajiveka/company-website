import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Calendar,
  FileUp,
  Plus,
  TrendingUp,
  Upload,
  Users,
} from 'lucide-react';
import {
  EmployerBadge,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SimpleBarChart,
  StatCard,
} from '@/employer/components/Cards/ui';
import { mockDashboard } from '@/employer/constants/mockData';
import { employerPaths } from '@/employer/constants/paths';

const statIcons: Record<string, ReactNode> = {
  totalJobs: <Briefcase className="h-5 w-5" />,
  activeJobs: <Briefcase className="h-5 w-5" />,
  draftJobs: <Briefcase className="h-5 w-5" />,
  applicants: <Users className="h-5 w-5" />,
  interviews: <Calendar className="h-5 w-5" />,
  hired: <Users className="h-5 w-5" />,
  pendingPay: <TrendingUp className="h-5 w-5" />,
};

export function DashboardPage() {
  const { stats, hiringTrend, monthlyApplicants, recentActivity, upcomingInterviews, latestApplicants } =
    mockDashboard;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Hiring overview and quick actions for your team."
        actions={
          <>
            <Link to={employerPaths.addJob}>
              <PrimaryButton>
                <Plus className="h-4 w-4" />
                Add Job
              </PrimaryButton>
            </Link>
            <Link to={employerPaths.bulkImport}>
              <SecondaryButton>
                <Upload className="h-4 w-4" />
                Bulk Import
              </SecondaryButton>
            </Link>
          </>
        }
      />

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-7">
        {stats.map((s) => (
          <StatCard key={s.id} label={s.label} value={s.value} delta={s.delta} icon={statIcons[s.id]} />
        ))}
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <SimpleBarChart title="Hiring Trend" values={hiringTrend} />
        <SimpleBarChart title="Monthly Applicants" values={monthlyApplicants} />
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm lg:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800">Recent Activity</h3>
            <EmployerBadge tone="primary">Live</EmployerBadge>
          </div>
          <ul className="space-y-2">
            {recentActivity.map((item) => (
              <li key={item.id} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                <p className="text-xs text-slate-700">{item.text}</p>
                <p className="mt-0.5 text-[11px] text-slate-400">{item.time}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold text-slate-800">Upcoming Interviews</h3>
          <ul className="space-y-2">
            {upcomingInterviews.map((iv) => (
              <li key={iv.id} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50/80 px-2.5 py-1.5">
                <div>
                  <p className="text-xs font-medium text-slate-800">{iv.name}</p>
                  <p className="text-[11px] text-slate-500">{iv.role}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{iv.when}</p>
                </div>
                <EmployerBadge tone="primary">{iv.mode}</EmployerBadge>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800">Latest Applicants</h3>
            <Link to={employerPaths.applicants} className="text-[11px] font-medium text-[#1A56DB] hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {latestApplicants.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <div>
                  <Link
                    to={employerPaths.applicantProfile(a.id)}
                    className="text-xs font-medium text-slate-800 hover:text-[#1A56DB]"
                  >
                    {a.name}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    {a.role} · {a.exp}
                  </p>
                </div>
                <span className="rounded-md bg-[#EBF2FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#1A56DB]">
                  {a.score}%
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold text-slate-800">Quick Actions</h3>
        <div className="flex flex-wrap gap-2">
          <Link to={employerPaths.addJob}>
            <PrimaryButton>
              <Plus className="h-4 w-4" />
              Post a Job
            </PrimaryButton>
          </Link>
          <Link to={employerPaths.bulkImport}>
            <SecondaryButton>
              <FileUp className="h-4 w-4" />
              Bulk Import
            </SecondaryButton>
          </Link>
          <Link to={employerPaths.applicants}>
            <SecondaryButton>
              <Users className="h-4 w-4" />
              Review Applicants
            </SecondaryButton>
          </Link>
          <Link to={employerPaths.analytics}>
            <SecondaryButton>
              <TrendingUp className="h-4 w-4" />
              Analytics
            </SecondaryButton>
          </Link>
        </div>
      </section>
    </div>
  );
}
