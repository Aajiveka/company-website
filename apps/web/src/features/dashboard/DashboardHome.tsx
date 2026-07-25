import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Briefcase,
  Users,
  BarChart3,
  Shield,
  UserCog,
  FileCheck,
  UserSearch,
} from 'lucide-react';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui';
import DashboardWidgets from '@/features/candidates/components/DashboardWidgets';

/* ------------------------------------------------------------------ */
/*  Shared quick-link card                                            */
/* ------------------------------------------------------------------ */

interface QuickLink {
  to: string;
  labelKey: string;
  icon: React.ReactNode;
  color: string;
}

function QuickLinks({ links }: { links: QuickLink[] }) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {links.map((link) => (
        <Link key={link.to} to={link.to}>
          <Card
            className={cn(
              'group flex items-center gap-4 transition hover:shadow-md',
            )}
          >
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                link.color,
              )}
            >
              {link.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium text-navy dark:text-white">
                {t(link.labelKey)}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 transition group-hover:translate-x-1 dark:text-gray-500" />
          </Card>
        </Link>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Welcome card                                                      */
/* ------------------------------------------------------------------ */

function WelcomeCard({ nameKey }: { nameKey: string }) {
  const { t } = useTranslation('dashboard');
  const { user } = useAuth();

  return (
    <Card className="mb-6">
      <h1 className="text-xl font-bold text-navy dark:text-white">
        {t('stats.welcome', { name: user?.fullName ?? '' })}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {t(nameKey)}
      </p>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Client (Employer) dashboard                                       */
/* ------------------------------------------------------------------ */

function ClientDashboard() {
  const links: QuickLink[] = [
    {
      to: '/company/jobs',
      labelKey: 'client.manageJobs',
      icon: <Briefcase className="h-5 w-5" />,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      to: '/company/applicants',
      labelKey: 'client.viewApplicants',
      icon: <Users className="h-5 w-5" />,
      color: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
    },
    {
      to: '/company/analytics',
      labelKey: 'client.analytics',
      icon: <BarChart3 className="h-5 w-5" />,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
    },
  ];

  return (
    <div>
      <WelcomeCard nameKey="client.subtitle" />
      <QuickLinks links={links} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Admin dashboard                                                   */
/* ------------------------------------------------------------------ */

function AdminDashboard() {
  const links: QuickLink[] = [
    {
      to: '/admin',
      labelKey: 'admin.dashboard',
      icon: <Shield className="h-5 w-5" />,
      color: 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
    },
    {
      to: '/admin/users',
      labelKey: 'admin.manageUsers',
      icon: <UserCog className="h-5 w-5" />,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    },
    {
      to: '/admin/jobs',
      labelKey: 'admin.manageJobs',
      icon: <Briefcase className="h-5 w-5" />,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
    },
  ];

  return (
    <div>
      <WelcomeCard nameKey="admin.subtitle" />
      <QuickLinks links={links} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  QC (QC1 / QC2) dashboard                                         */
/* ------------------------------------------------------------------ */

function QcDashboard() {
  const links: QuickLink[] = [
    {
      to: '/recruitment/candidates',
      labelKey: 'qc.reviewCandidates',
      icon: <UserSearch className="h-5 w-5" />,
      color: 'bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400',
    },
    {
      to: '/recruitment/documents',
      labelKey: 'qc.reviewDocuments',
      icon: <FileCheck className="h-5 w-5" />,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
    },
  ];

  return (
    <div>
      <WelcomeCard nameKey="qc.subtitle" />
      <QuickLinks links={links} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Candidate (Subscriber) dashboard                                  */
/* ------------------------------------------------------------------ */

function CandidateDashboard() {
  return (
    <div>
      <WelcomeCard nameKey="stats.subtitle" />
      <DashboardWidgets />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page component                                               */
/* ------------------------------------------------------------------ */

export default function DashboardHome() {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');

  if (!user) {
    return (
      <Card>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('stats.loadingUser')}
        </p>
      </Card>
    );
  }

  switch (user.roleId) {
    case Role.Subscriber:
      return <CandidateDashboard />;
    case Role.Client:
      return <ClientDashboard />;
    case Role.Admin:
      return <AdminDashboard />;
    case Role.QC1:
    case Role.QC2:
      return <QcDashboard />;
    default:
      return <CandidateDashboard />;
  }
}
