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
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  SimpleBarChart,
  StatCard,
} from '@/employer/components/Cards/ui';
import { employerPaths } from '@/employer/constants/paths';
import { useApplicants, useCompanyAnalytics } from '@/employer/services/employer.api';
import { applicantStatusTone } from '@/employer/utils/pipelineActions';
import { getErrorMessage } from '@/lib/axios';

const statIcons: Record<string, ReactNode> = {
  totalJobs: <Briefcase className="h-5 w-5" />,
  activeJobs: <Briefcase className="h-5 w-5" />,
  draftJobs: <Briefcase className="h-5 w-5" />,
  applicants: <Users className="h-5 w-5" />,
  interviews: <Calendar className="h-5 w-5" />,
  hired: <Users className="h-5 w-5" />,
};

export function DashboardPage() {
  const { data: analytics, isLoading, isError, error } = useCompanyAnalytics();
  const { data: applicantsRes } = useApplicants({ page: 1, pageSize: 50 });
  const applicants = applicantsRes?.items ?? [];

  const stats = [
    { id: 'totalJobs', label: 'Total Jobs', value: analytics?.totalJobs ?? 0 },
    { id: 'activeJobs', label: 'Active Jobs', value: analytics?.activeJobs ?? 0 },
    { id: 'draftJobs', label: 'Draft Jobs', value: analytics?.draftJobs ?? 0 },
    { id: 'applicants', label: 'Applicants', value: analytics?.totalApplications ?? 0 },
    { id: 'interviews', label: 'Interviews', value: analytics?.interviewScheduled ?? 0 },
    { id: 'hired', label: 'Hired', value: analytics?.selected ?? 0 },
  ];

  const funnelSeries = analytics
    ? [
        analytics.mapped,
        analytics.shortlisted,
        analytics.interviewScheduled,
        analytics.selected,
        analytics.rejected,
      ]
    : [];

  const jobAppsSeries = (analytics?.jobPerformance ?? []).slice(0, 12).map((j) => j.applications);
  const latest = applicants.slice(0, 6);
  const interviews = applicants.filter((a) => a.status === 'Interview').slice(0, 6);

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

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load dashboard')}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
        {stats.map((s) => (
          <StatCard
            key={s.id}
            label={s.label}
            value={isLoading ? '…' : s.value}
            icon={statIcons[s.id]}
          />
        ))}
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-2">
        <SimpleBarChart title="Pipeline (Mapped → Hired / Rejected)" values={funnelSeries} />
        <SimpleBarChart
          title="Applications by job"
          values={jobAppsSeries.length ? jobAppsSeries : [0]}
        />
      </div>

      <div className="mt-3 grid gap-2 lg:grid-cols-3">
        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm lg:col-span-1">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800">Pipeline snapshot</h3>
            <EmployerBadge tone="primary">Live</EmployerBadge>
          </div>
          <ul className="space-y-2 text-xs text-slate-700">
            <li className="flex justify-between border-b border-slate-100 pb-2">
              <span>New / Mapped</span>
              <span className="font-semibold">{analytics?.mapped ?? 0}</span>
            </li>
            <li className="flex justify-between border-b border-slate-100 pb-2">
              <span>Shortlisted</span>
              <span className="font-semibold">{analytics?.shortlisted ?? 0}</span>
            </li>
            <li className="flex justify-between border-b border-slate-100 pb-2">
              <span>Interview</span>
              <span className="font-semibold">{analytics?.interviewScheduled ?? 0}</span>
            </li>
            <li className="flex justify-between border-b border-slate-100 pb-2">
              <span>Hired</span>
              <span className="font-semibold">{analytics?.selected ?? 0}</span>
            </li>
            <li className="flex justify-between">
              <span>Rejected</span>
              <span className="font-semibold">{analytics?.rejected ?? 0}</span>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <h3 className="mb-2 text-xs font-semibold text-slate-800">Interview pipeline</h3>
          {interviews.length ? (
            <ul className="space-y-2">
              {interviews.map((iv) => (
                <li key={iv.jobSubscriberMapId} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50/80 px-2.5 py-1.5">
                  <div>
                    <Link
                      to={employerPaths.applicantProfile(iv.jobSubscriberMapId)}
                      className="text-xs font-medium text-slate-800 hover:text-[#1A56DB]"
                    >
                      {iv.fullName}
                    </Link>
                    <p className="text-[11px] text-slate-500">{iv.designation}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">Applied {iv.appliedOn}</p>
                  </div>
                  <EmployerBadge tone="warning">Interview</EmployerBadge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-slate-400">No applicants currently in interview.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-slate-800">Latest Applicants</h3>
            <Link to={employerPaths.applicants} className="text-[11px] font-medium text-[#1A56DB] hover:underline">
              View all
            </Link>
          </div>
          {latest.length ? (
            <ul className="space-y-2">
              {latest.map((a) => (
                <li key={a.jobSubscriberMapId} className="flex items-center justify-between gap-2">
                  <div>
                    <Link
                      to={employerPaths.applicantProfile(a.jobSubscriberMapId)}
                      className="text-xs font-medium text-slate-800 hover:text-[#1A56DB]"
                    >
                      {a.fullName}
                    </Link>
                    <p className="text-[11px] text-slate-500">
                      {a.designation} · {a.experience || '—'}
                    </p>
                  </div>
                  <EmployerBadge tone={applicantStatusTone(a.status)}>{a.status}</EmployerBadge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No applicants yet" description="Candidates will appear here when they apply." />
          )}
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
