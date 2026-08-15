import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, CalendarCheck, CheckCircle2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useCompanyJobs, useApplicants } from '../client.api';

interface StatCard {
  key: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  to: string;
}

export function EmployerDashboardStats() {
  const { t } = useTranslation('dashboard');
  const { data: jobs } = useCompanyJobs();
  const { data: applicants } = useApplicants({ page: 1, pageSize: 100 });

  const stats = useMemo((): StatCard[] => {
    const jobList = jobs?.items ?? [];
    const appList = applicants?.items ?? [];

    const activeJobs = jobList.filter((j) => j.status === 'Active').length;
    const totalApplicants = applicants?.total ?? appList.length;
    const shortlisted = appList.filter((a) => a.jobStatus === 'Shortlisted').length;
    const interviews = appList.filter((a) => a.jobStatus === 'Interview').length;

    return [
      {
        key: 'activePostings',
        value: activeJobs,
        icon: <Briefcase className="h-5 w-5" />,
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        to: '/company/jobs',
      },
      {
        key: 'totalApplicants',
        value: totalApplicants,
        icon: <Users className="h-5 w-5" />,
        color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        to: '/company/applicants',
      },
      {
        key: 'shortlisted',
        value: shortlisted,
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        to: '/company/applicants',
      },
      {
        key: 'interviewsScheduled',
        value: interviews,
        icon: <CalendarCheck className="h-5 w-5" />,
        color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        to: '/company/applicants',
      },
    ];
  }, [jobs, applicants]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {stats.map((s) => (
        <Link
          key={s.key}
          to={s.to}
          className="group rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
        >
          <div className={cn('mb-3 inline-flex rounded-lg p-2', s.color)}>
            {s.icon}
          </div>
          <p className="text-2xl font-bold text-navy">{s.value}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t(`employerStats.${s.key}`)}
          </p>
        </Link>
      ))}
    </div>
  );
}
