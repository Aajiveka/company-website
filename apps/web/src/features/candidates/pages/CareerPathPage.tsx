import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ChevronUp, Briefcase, Clock, TrendingUp } from 'lucide-react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Badge, Breadcrumbs, Button, Card, Skeleton } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

interface CareerStep {
  title: string;
  description: string;
  skills: string[];
}

interface CareerPath {
  pathId: number;
  targetRole: string;
  timelineYears: number;
  salaryGrowth: string;
  confidence: number;
  steps: CareerStep[];
}

interface CareerPathData {
  currentRole: string;
  experience: number;
  paths: CareerPath[];
}

function confidenceTone(confidence: number): BadgeTone {
  if (confidence > 70) return 'green';
  if (confidence > 40) return 'amber';
  return 'red';
}

function confidenceColor(confidence: number): string {
  if (confidence > 70) return 'bg-green-500';
  if (confidence > 40) return 'bg-amber-500';
  return 'bg-red-500';
}

function CareerPathSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function StepTimeline({ steps, t }: { steps: CareerStep[]; t: (key: string) => string }) {
  return (
    <div className="relative ml-3 border-l-2 border-gray-200 pl-6 dark:border-gray-700">
      {steps.map((step, idx) => (
        <div key={idx} className="relative pb-6 last:pb-0">
          <div className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-blue-500 bg-white dark:bg-gray-800">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
          <h4 className="text-sm font-semibold text-navy">
            {t('careerPath.stepLabel')} {idx + 1}: {step.title}
          </h4>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{step.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {step.skills.map((skill) => (
              <Badge key={skill} tone="purple">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PathCard({ path, t }: { path: CareerPath; t: (key: string, opts?: Record<string, unknown>) => string }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const tone = confidenceTone(path.confidence);

  return (
    <Card className="flex flex-col">
      <div className="flex-1 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-heading text-lg font-semibold text-navy">{path.targetRole}</h3>
          <Badge tone="green">{path.salaryGrowth}</Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            ~{path.timelineYears} {t('careerPath.years')}
          </span>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-gray-400">{t('careerPath.confidence')}</span>
            <Badge tone={tone}>{path.confidence}%</Badge>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <div
              className={cn('h-full rounded-full transition-all', confidenceColor(path.confidence))}
              style={{ width: `${Math.max(0, Math.min(100, path.confidence))}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-navy transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
        >
          <span>
            {t('careerPath.steps')} ({path.steps.length})
          </span>
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {expanded && (
          <div className="pt-1">
            <StepTimeline steps={path.steps} t={t} />
          </div>
        )}
      </div>

      <Button
        className="mt-4 w-full"
        onClick={() => navigate(`/jobs?q=${encodeURIComponent(path.targetRole)}`)}
      >
        <Briefcase className="mr-2 h-4 w-4" />
        {t('careerPath.exploreJobs')}
      </Button>
    </Card>
  );
}

export default function CareerPathPage() {
  const { t } = useTranslation('dashboard');

  const { data, isLoading } = useQuery<CareerPathData>({
    queryKey: ['career-path'],
    queryFn: async () => {
      const res = await api.get('/candidates/me/career-path');
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('careerPath.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
        {t('careerPath.heading')}
      </h1>

      {isLoading ? (
        <CareerPathSkeleton />
      ) : !data || data.paths.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <TrendingUp className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">
            {t('careerPath.emptyState')}
          </p>
        </Card>
      ) : (
        <div className="space-y-8">
          <Card className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400">
              <Briefcase className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('careerPath.currentRole')}
              </p>
              <h2 className="font-heading text-lg font-semibold text-navy">
                {data.currentRole}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {t('careerPath.experience', { count: data.experience })}
              </p>
            </div>
          </Card>

          <section>
            <h2 className="mb-4 font-heading text-lg font-semibold text-navy">
              {t('careerPath.recommendedPaths')}
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {data.paths.slice(0, 3).map((path) => (
                <PathCard key={path.pathId} path={path} t={t} />
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
