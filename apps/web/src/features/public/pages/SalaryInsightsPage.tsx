import { useMemo } from 'react';
import { MapPin, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardSkeleton } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';
import { PageBanner } from '../components/PageBanner';

interface SalaryData {
  byDesignation: { designation: string; avgCtc: number; minCtc: number; maxCtc: number; count: number }[];
  byCity: { city: string; avgCtc: number; count: number }[];
}

function useSalaryInsights() {
  return useQuery({
    queryKey: ['public', 'salary-insights'],
    queryFn: () => api.get<SalaryData>('/jobs/salary-insights').then((r) => r.data),
    staleTime: 5 * 60_000,
  });
}

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

function SalaryBar({ label, value, maxValue, sub, color }: {
  label: string; value: number; maxValue: number; sub?: string; color: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="truncate font-medium text-navy">{label}</span>
        <span className="ml-2 shrink-0 font-semibold text-primary">{lpa(value)} LPA</span>
      </div>
      {sub && <p className="mb-1 text-xs text-gray-400">{sub}</p>}
      <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className={cn('h-full rounded-full transition-all duration-500', color)}
          style={{ width: maxValue > 0 ? `${(value / maxValue) * 100}%` : '0%' }}
        />
      </div>
    </div>
  );
}

/** Public salary insights page — anonymous benchmarking data. */
export default function SalaryInsightsPage() {
  const { t } = useTranslation('jobs');
  const { data, isLoading } = useSalaryInsights();

  const byDesignation = useMemo(() => {
    if (!data?.byDesignation) return { items: [], maxValue: 1 };
    const sorted = [...data.byDesignation].sort((a, b) => b.avgCtc - a.avgCtc).slice(0, 15);
    return { items: sorted, maxValue: Math.max(...sorted.map((d) => d.avgCtc), 1) };
  }, [data]);

  const byCity = useMemo(() => {
    if (!data?.byCity) return { items: [], maxValue: 1 };
    const sorted = [...data.byCity].sort((a, b) => b.avgCtc - a.avgCtc).slice(0, 12);
    return { items: sorted, maxValue: Math.max(...sorted.map((c) => c.avgCtc), 1) };
  }, [data]);

  return (
    <>
      <Seo
        title="Salary Insights"
        description="Explore anonymous salary benchmarking data by designation and city on Aajiveka. Know your market worth."
        path="/salary-insights"
      />
      <PageBanner variant="about" title={t('salary.heading')} />

      <section className="py-12 md:py-16">
        <div className="container max-w-5xl">
          <p className="mb-8 text-center text-sm text-gray-500">{t('salary.disclaimer')}</p>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2">
              <CardSkeleton /> <CardSkeleton />
            </div>
          ) : !data ? (
            <Card className="text-center">
              <p className="text-sm text-gray-500">{t('salary.noData')}</p>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {/* By Designation */}
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {t('salary.byDesignation')}
                </h2>
                <div className="space-y-4">
                  {byDesignation.items.map((d) => (
                    <SalaryBar
                      key={d.designation}
                      label={d.designation}
                      value={d.avgCtc}
                      maxValue={byDesignation.maxValue}
                      sub={`${lpa(d.minCtc)}–${lpa(d.maxCtc)} LPA · ${d.count} jobs`}
                      color="bg-primary"
                    />
                  ))}
                </div>
              </Card>

              {/* By City */}
              <Card>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-navy">
                  <MapPin className="h-5 w-5 text-amber-500" />
                  {t('salary.byCity')}
                </h2>
                <div className="space-y-4">
                  {byCity.items.map((c) => (
                    <SalaryBar
                      key={c.city}
                      label={c.city}
                      value={c.avgCtc}
                      maxValue={byCity.maxValue}
                      sub={`${c.count} jobs`}
                      color="bg-amber-500"
                    />
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
