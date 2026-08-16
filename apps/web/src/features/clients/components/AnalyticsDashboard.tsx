import { useMemo } from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCompanyJobs, useApplicants } from '../client.api';

interface BarItem {
  label: string;
  value: number;
  color: string;
}

function HorizontalBar({ items, maxValue }: { items: BarItem[]; maxValue: number }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
            <span className="font-semibold text-navy">{item.value}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
            <div
              className={cn('h-full rounded-full transition-all duration-500', item.color)}
              style={{ width: maxValue > 0 ? `${(item.value / maxValue) * 100}%` : '0%' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Employer analytics — applicant pipeline + job performance breakdown. */
export function AnalyticsDashboard() {
  const { t } = useTranslation('dashboard');
  const { data: jobs } = useCompanyJobs();
  const { data: applicants } = useApplicants({ page: 1, pageSize: 100 });

  const pipeline = useMemo(() => {
    const list = applicants?.items ?? [];
    const applied = list.filter((a) => a.jobStatus === 'Applied' || a.jobStatus === 'Mapped').length;
    const shortlisted = list.filter((a) => a.jobStatus === 'Shortlisted').length;
    const interview = list.filter((a) => a.jobStatus === 'Interview').length;
    const selected = list.filter((a) => a.jobStatus === 'Selected').length;
    const rejected = list.filter((a) => a.jobStatus === 'Rejected').length;

    const items: BarItem[] = [
      { label: t('analytics.applied'), value: applied, color: 'bg-blue-500' },
      { label: t('analytics.shortlisted'), value: shortlisted, color: 'bg-amber-500' },
      { label: t('analytics.interview'), value: interview, color: 'bg-purple-500' },
      { label: t('analytics.selected'), value: selected, color: 'bg-green-500' },
      { label: t('analytics.rejected'), value: rejected, color: 'bg-red-400' },
    ];
    const maxValue = Math.max(...items.map((i) => i.value), 1);
    return { items, maxValue, total: list.length };
  }, [applicants, t]);

  const topJobs = useMemo(() => {
    const jobList = jobs?.items ?? [];
    const sorted = [...jobList]
      .filter((j) => j.status === 'Active')
      .sort((a, b) => b.applicants - a.applicants)
      .slice(0, 5);

    const items: BarItem[] = sorted.map((j) => ({
      label: j.designation,
      value: j.applicants,
      color: 'bg-primary',
    }));
    const maxValue = Math.max(...items.map((i) => i.value), 1);
    return { items, maxValue };
  }, [jobs]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Applicant Pipeline */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy">
          <TrendingUp className="h-5 w-5 text-primary" />
          {t('analytics.pipeline')}
        </h3>
        {pipeline.total === 0 ? (
          <p className="text-sm text-gray-500">{t('analytics.noApplicants')}</p>
        ) : (
          <HorizontalBar items={pipeline.items} maxValue={pipeline.maxValue} />
        )}
      </Card>

      {/* Top Jobs by Applicants */}
      <Card>
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-navy">
          <BarChart3 className="h-5 w-5 text-primary" />
          {t('analytics.topJobs')}
        </h3>
        {topJobs.items.length === 0 ? (
          <p className="text-sm text-gray-500">{t('analytics.noJobs')}</p>
        ) : (
          <HorizontalBar items={topJobs.items} maxValue={topJobs.maxValue} />
        )}
      </Card>
    </div>
  );
}
