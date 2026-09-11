import { useState } from 'react';
import {
  Archive,
  ListChecks,
  ShieldCheck,
  Sparkles,
  Clock,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import EmptyState from '@/components/EmptyState';
import { cn } from '@/lib/cn';
import { useQ1Stats } from '../q1.api';
import type { QueueTab } from '../q1.types';
import { CandidateQueue } from '../components/CandidateQueue';
import { greeting } from '../q1.format';
import { Q1Shell } from '../components/Q1Shell';
import { Q1Card } from '../components/primitives';

interface Card {
  key: string;
  value: number;
  delta?: { value: number; label: string };
  icon: LucideIcon;
  tone: string;
}

/** The Q1 dashboard: five pipeline cards above the Candidate Queue. */
export default function Q1DashboardPage() {
  const { t } = useTranslation('common');
  const { data, isLoading, isError, refetch } = useQ1Stats();
  const [tab, setTab] = useState<QueueTab>('all');

  const cards: Card[] = [
    {
      key: 'newCandidates',
      value: data?.newCandidates ?? 0,
      delta: data?.newToday ? { value: data.newToday, label: t('q1.cards.today') } : undefined,
      icon: Sparkles,
      tone: 'bg-q1-blue-soft text-q1-blue',
    },
    {
      key: 'pendingScreening',
      value: data?.pendingScreening ?? 0,
      icon: ListChecks,
      tone: 'bg-q1-chip text-q1-slate',
    },
    {
      key: 'followUpsDue',
      value: data?.followUpsDue ?? 0,
      delta: data?.followUpsDueToday
        ? { value: data.followUpsDueToday, label: t('q1.cards.due') }
        : undefined,
      icon: Clock,
      tone: 'bg-q1-amber-soft text-q1-amber',
    },
    {
      key: 'verified',
      value: data?.verified ?? 0,
      delta: data?.verifiedToday ? { value: data.verifiedToday, label: t('q1.cards.today') } : undefined,
      icon: ShieldCheck,
      tone: 'bg-q1-green-soft text-q1-green',
    },
    {
      key: 'notInterested',
      value: data?.notInterested ?? 0,
      icon: Archive,
      tone: 'bg-q1-red-soft text-q1-red',
    },
  ];

  return (
    <Q1Shell title={greeting(t)} subtitle={t('q1.dashboard.subtitle')}>
      {/* A failed /q1/stats used to be indistinguishable from zeros — the old QC1 dashboard
          pulsed four skeleton cards forever. This one says so, and offers a retry. */}
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
            <Q1Card key={c.key} className="p-4">
              <div className="flex items-start gap-3">
                <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', c.tone)}>
                  <c.icon className="h-5 w-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    {isLoading ? (
                      <span className="inline-block h-7 w-8 animate-pulse rounded bg-q1-chip dark:bg-gray-700" />
                    ) : (
                      <span className="font-display text-2xl font-extrabold text-q1-ink dark:text-white">
                        {c.value}
                      </span>
                    )}
                    {c.delta && (
                      <span className="text-[11px] font-semibold text-q1-green">
                        +{c.delta.value} {c.delta.label}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] font-semibold text-q1-ink dark:text-gray-100">
                    {t(`q1.cards.${c.key}.title`)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-q1-muted">{t(`q1.cards.${c.key}.help`)}</p>
                </div>
              </div>
            </Q1Card>
          ))}
        </div>
      )}

      <CandidateQueue tab={tab} onTabChange={setTab} showTabs />
    </Q1Shell>
  );
}
