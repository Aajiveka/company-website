import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, CalendarCheck, CheckCircle2, Send } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useAppliedJobs, useSavedJobIds } from '../candidate.api';

interface StatCard {
  key: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  to: string;
}

export function DashboardStats() {
  const { t } = useTranslation('dashboard');
  const { data: appliedJobs } = useAppliedJobs();
  const { data: savedIds } = useSavedJobIds();

  const stats = useMemo((): StatCard[] => {
    const jobs = appliedJobs ?? [];
    const shortlisted = jobs.filter((j) => j.status === 'Shortlisted' || j.status === 'Selected').length;
    const upcoming = jobs.filter(
      (j) => j.interview && new Date(j.interview.scheduledOn) >= new Date(),
    ).length;

    return [
      {
        key: 'totalApplied',
        value: jobs.length,
        icon: <Send className="h-5 w-5" />,
        color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        to: '/candidate/applied-jobs',
      },
      {
        key: 'shortlisted',
        value: shortlisted,
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        to: '/candidate/applied-jobs',
      },
      {
        key: 'upcomingInterviews',
        value: upcoming,
        icon: <CalendarCheck className="h-5 w-5" />,
        color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        to: '/candidate/applied-jobs',
      },
      {
        key: 'savedJobs',
        value: savedIds?.length ?? 0,
        icon: <Bookmark className="h-5 w-5" />,
        color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        to: '/candidate/saved-jobs',
      },
    ];
  }, [appliedJobs, savedIds]);

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
            {t(`stats.${s.key}`)}
          </p>
        </Link>
      ))}
    </div>
  );
}
