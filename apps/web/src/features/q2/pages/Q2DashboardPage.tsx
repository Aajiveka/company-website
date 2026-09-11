import { Briefcase, Clock, ShieldCheck, Target, Users, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useQ2Stats } from '../q2.api';
import { Q2Shell } from '../components/Q2Shell';
import { EmployerJobsTable } from '../components/EmployerJobsTable';
import { Q2Card } from '../components/primitives';

interface Card {
  key: string;
  value: number;
  icon: LucideIcon;
  tone: string;
}

/**
 * The Q2 dashboard: the five matching cards above the Employer Jobs table.
 *
 * The card order, icons and help lines are the Figma's: Active Jobs "Posted by employers",
 * Total Applicants "Across all jobs", Relevant Matches "Match ≥ 60%", Forwarded to Q3
 * "Complete profiles", Sent back to Q1 "Incomplete profiles".
 */
export default function Q2DashboardPage() {
  const { t } = useTranslation('common');
  const { data, isLoading, isError, refetch } = useQ2Stats();

  const cards: Card[] = [
    {
      key: 'activeJobs',
      value: data?.activeJobs ?? 0,
      icon: Briefcase,
      tone: 'bg-q2-blue-soft text-q2-blue',
    },
    {
      key: 'totalApplicants',
      value: data?.totalApplicants ?? 0,
      icon: Users,
      tone: 'bg-q2-chip-cool text-q2-ink-slate',
    },
    {
      key: 'relevantMatches',
      value: data?.relevantMatches ?? 0,
      icon: Target,
      tone: 'bg-q2-emerald-soft text-q2-emerald-ink',
    },
    {
      key: 'forwardedToQ3',
      value: data?.forwardedToQ3 ?? 0,
      icon: ShieldCheck,
      tone: 'bg-q2-emerald-tint text-q2-emerald-ink',
    },
    {
      key: 'sentBackToQ1',
      value: data?.sentBackToQ1 ?? 0,
      icon: Clock,
      tone: 'bg-q2-amber-soft text-q2-amber',
    },
  ];

  return (
    <Q2Shell title={t('q2.title')} subtitle={t('q2.subtitle')}>
      {/* A failed /q2/stats must not be indistinguishable from five genuine zeros. */}
      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {cards.map((c) => (
            <Q2Card key={c.key} className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
                    c.tone,
                  )}
                >
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  {isLoading ? (
                    <span className="inline-block h-7 w-8 animate-pulse rounded bg-q2-chip dark:bg-gray-700" />
                  ) : (
                    <span className="font-display text-2xl font-extrabold text-q2-ink dark:text-white">
                      {c.value}
                    </span>
                  )}
                  <p className="mt-0.5 text-[13px] font-semibold text-q2-ink dark:text-gray-100">
                    {t(`q2.cards.${c.key}.title`)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-q2-muted">{t(`q2.cards.${c.key}.help`)}</p>
                </div>
              </div>
            </Q2Card>
          ))}
        </div>
      )}

      <EmployerJobsTable />
    </Q2Shell>
  );
}
