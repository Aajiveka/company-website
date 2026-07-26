import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Calendar, Kanban } from 'lucide-react';
import { Badge, Breadcrumbs, Card, Skeleton, statusTone } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Application {
  id: number;
  jobId: number;
  designation: string;
  company: string;
  status: string;
  appliedAt: string;
}

type Stage = 'Applied' | 'Shortlisted' | 'Interview' | 'Selected' | 'Rejected';

const STAGES: Stage[] = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'];

const STAGE_COLORS: Record<Stage, string> = {
  Applied: 'border-t-blue-500',
  Shortlisted: 'border-t-amber-500',
  Interview: 'border-t-purple-500',
  Selected: 'border-t-green-500',
  Rejected: 'border-t-red-500',
};

const STAGE_HEADER_BG: Record<Stage, string> = {
  Applied: 'bg-blue-50 dark:bg-blue-900/20',
  Shortlisted: 'bg-amber-50 dark:bg-amber-900/20',
  Interview: 'bg-purple-50 dark:bg-purple-900/20',
  Selected: 'bg-green-50 dark:bg-green-900/20',
  Rejected: 'bg-red-50 dark:bg-red-900/20',
};

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

function useApplications() {
  return useQuery({
    queryKey: ['candidate', 'applications'],
    queryFn: () => api.get<Application[]>('/candidates/me/applications').then((r) => r.data),
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function normalizeStatus(status: string): Stage {
  if (status === 'Applied' || status === 'Mapped') return 'Applied';
  if (status === 'Shortlisted') return 'Shortlisted';
  if (status.startsWith('Interview')) return 'Interview';
  if (status === 'Selected') return 'Selected';
  if (status === 'Rejected') return 'Rejected';
  return 'Applied';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/* ------------------------------------------------------------------ */
/*  Application card                                                   */
/* ------------------------------------------------------------------ */

function ApplicationCard({ app }: { app: Application }) {
  return (
    <Card className={cn('border-t-4', STAGE_COLORS[normalizeStatus(app.status)])}>
      <h4 className="font-heading text-sm font-semibold text-navy dark:text-gray-100">
        {app.designation}
      </h4>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">{app.company}</p>
      <div className="mt-3 flex items-center justify-between">
        <Badge tone={statusTone(app.status)}>{app.status}</Badge>
        <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
          <Calendar className="h-3 w-3" aria-hidden />
          {formatDate(app.appliedAt)}
        </span>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Column                                                             */
/* ------------------------------------------------------------------ */

function KanbanColumn({ stage, apps }: { stage: Stage; apps: Application[] }) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="flex w-64 shrink-0 flex-col sm:w-auto sm:flex-1">
      {/* Header */}
      <div
        className={cn(
          'mb-3 flex items-center justify-between rounded-lg px-3 py-2',
          STAGE_HEADER_BG[stage],
        )}
      >
        <span className="text-sm font-semibold text-navy dark:text-gray-200">
          {t(`tracker.stages.${stage.toLowerCase()}`)}
        </span>
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-bold text-gray-700 dark:bg-gray-600 dark:text-gray-200">
          {apps.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex flex-1 flex-col gap-3">
        {apps.length === 0 ? (
          <p className="py-6 text-center text-xs text-gray-400 dark:text-gray-500">
            {t('tracker.noApplications')}
          </p>
        ) : (
          apps.map((app) => <ApplicationCard key={app.id} app={app} />)
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function KanbanSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {STAGES.map((stage) => (
        <div key={stage} className="flex w-64 shrink-0 flex-col sm:w-auto sm:flex-1">
          <Skeleton className="mb-3 h-9 w-full rounded-lg" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-xl bg-white p-4 shadow-card dark:bg-gray-800">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function ApplicationTrackerPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useApplications();

  const grouped = useMemo(() => {
    const map: Record<Stage, Application[]> = {
      Applied: [],
      Shortlisted: [],
      Interview: [],
      Selected: [],
      Rejected: [],
    };
    if (!data) return map;
    for (const app of data) {
      const stage = normalizeStatus(app.status);
      map[stage].push(app);
    }
    return map;
  }, [data]);

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('tracker.heading') },
        ]}
      />

      <div className="mb-6 flex items-center gap-3">
        <Kanban className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="font-heading text-2xl font-bold text-navy dark:text-gray-100">
          {t('tracker.heading')}
        </h1>
      </div>

      {isLoading ? (
        <KanbanSkeleton />
      ) : !data?.length ? (
        <Card className="py-12 text-center">
          <Kanban className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden />
          <p className="text-gray-500 dark:text-gray-400">{t('tracker.emptyState')}</p>
        </Card>
      ) : (
        <div
          className={cn(
            'flex gap-4 overflow-x-auto pb-4',
            // Mobile: horizontal scroll with snap
            'snap-x snap-mandatory sm:snap-none',
            '[&>*]:snap-center',
          )}
        >
          {STAGES.map((stage) => (
            <KanbanColumn key={stage} stage={stage} apps={grouped[stage]} />
          ))}
        </div>
      )}
    </div>
  );
}
