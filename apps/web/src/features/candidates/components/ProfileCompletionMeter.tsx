import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Circle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Card } from '@/components/ui';
import { useCvEditProfile } from '../candidate.api';
import { computeCompletion, type CompletionSection } from '../profileCompletion';

export function ProfileCompletionMeter() {
  const { t } = useTranslation('dashboard');
  const { data } = useCvEditProfile();

  const { sections, percent } = useMemo(() => {
    if (!data) return { sections: [] as CompletionSection[], percent: 0 };
    return computeCompletion(data);
  }, [data]);

  if (!data) return null;

  const tone =
    percent === 100
      ? 'text-green-600 dark:text-green-400'
      : percent >= 50
        ? 'text-yellow-600 dark:text-yellow-400'
        : 'text-red-600 dark:text-red-400';

  const barColor =
    percent === 100
      ? 'bg-green-500'
      : percent >= 50
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">{t('completion.heading')}</h2>
        <span className={cn('text-2xl font-bold', tone)}>{percent}%</span>
      </div>

      {/* Progress bar */}
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${percent}%` }}
        />
      </div>

      {percent < 100 && (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('completion.hint')}
        </p>
      )}

      {/* Section checklist. Every section is editable in place on the profile page now, so the
          checklist links there rather than sending the candidate to a separate CV editor. */}
      <ul className="mt-4 space-y-2">
        {sections.map((sec) => (
          <li key={sec.key}>
            <Link
              to={`/candidate/profile#${sec.anchor}`}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition hover:bg-gray-50 dark:hover:bg-gray-700/50',
                sec.done ? 'text-gray-500 dark:text-gray-400' : 'text-navy font-medium',
              )}
            >
              {sec.done ? (
                <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-green-500" />
              ) : (
                <Circle className="h-4.5 w-4.5 shrink-0 text-gray-300 dark:text-gray-600" />
              )}
              <span className="flex-1">{t(`completion.${sec.key}`)}</span>
              {!sec.done && <ChevronRight className="h-4 w-4 text-gray-400" />}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
