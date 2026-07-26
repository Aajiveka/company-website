import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Badge, Breadcrumbs, Card, Select, Skeleton } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';

interface RequiredSkill {
  name: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  hasSkill: boolean;
}

interface SkillGapData {
  targetRole: string;
  requiredSkills: RequiredSkill[];
  matchPercentage: number;
  recommendations: string[];
}

const LEVEL_TONE: Record<RequiredSkill['level'], BadgeTone> = {
  advanced: 'green',
  intermediate: 'amber',
  beginner: 'blue',
};

const TARGET_ROLES = [
  { label: 'Software Engineer', value: 'software-engineer' },
  { label: 'Data Analyst', value: 'data-analyst' },
  { label: 'Product Manager', value: 'product-manager' },
  { label: 'UX Designer', value: 'ux-designer' },
  { label: 'DevOps Engineer', value: 'devops-engineer' },
  { label: 'Business Analyst', value: 'business-analyst' },
];

function CircularProgress({ percentage }: { percentage: number }) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <div
      className="relative flex h-36 w-36 items-center justify-center rounded-full"
      style={{
        background: `conic-gradient(var(--color-primary, #2563eb) ${clamped * 3.6}deg, #e5e7eb ${clamped * 3.6}deg)`,
      }}
    >
      <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white dark:bg-gray-800">
        <span className="font-heading text-3xl font-bold text-navy">{clamped}%</span>
      </div>
    </div>
  );
}

function SkillGapSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <Skeleton className="h-36 w-36 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-11 w-64" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-40 rounded-xl" />
    </div>
  );
}

export default function SkillGapPage() {
  const { t } = useTranslation('dashboard');
  const [targetRole, setTargetRole] = useState('');

  const { data, isLoading } = useQuery<SkillGapData>({
    queryKey: ['skill-gap', targetRole],
    queryFn: async () => {
      const res = await api.get('/candidates/me/skill-gap', {
        params: targetRole ? { role: targetRole } : undefined,
      });
      return res.data;
    },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('skillGap.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">
        {t('skillGap.heading')}
      </h1>

      {isLoading ? (
        <SkillGapSkeleton />
      ) : (
        <div className="space-y-8">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            <CircularProgress percentage={data?.matchPercentage ?? 0} />

            <div className="flex flex-1 flex-col gap-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {t('skillGap.overallMatch')}
              </p>
              <Select
                label={t('skillGap.targetRole')}
                options={TARGET_ROLES}
                placeholder={t('skillGap.selectRole')}
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                className="max-w-xs"
              />
              {data?.targetRole && (
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {t('skillGap.analyzingFor', { role: data.targetRole })}
                </p>
              )}
            </div>
          </div>

          <section>
            <h2 className="mb-4 font-heading text-lg font-semibold text-navy">
              {t('skillGap.requiredSkills')}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data?.requiredSkills.map((skill) => (
                <Card
                  key={skill.name}
                  className={cn(
                    'transition',
                    skill.hasSkill
                      ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/20'
                      : 'border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-navy">{skill.name}</h3>
                      <span className="mt-1.5 inline-block">
                        <Badge tone={LEVEL_TONE[skill.level]}>
                          {t(`skillGap.level.${skill.level}`)}
                        </Badge>
                      </span>
                    </div>
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                        skill.hasSkill
                          ? 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400'
                          : 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400',
                      )}
                    >
                      {skill.hasSkill ? (
                        <Check className="h-4 w-4" aria-label={t('skillGap.acquired')} />
                      ) : (
                        <X className="h-4 w-4" aria-label={t('skillGap.missing')} />
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {data?.recommendations && data.recommendations.length > 0 && (
            <Card>
              <h2 className="mb-3 font-heading text-lg font-semibold text-navy">
                {t('skillGap.recommendations')}
              </h2>
              <ul className="list-inside list-disc space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {data.recommendations.map((rec) => (
                  <li key={rec}>{rec}</li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
