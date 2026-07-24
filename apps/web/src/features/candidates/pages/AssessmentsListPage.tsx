import { Award, Clock, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Badge, Card, CardSkeleton } from '@/components/ui';
import { api } from '@/lib/axios';

interface AssessmentSummary {
  assessmentId: number;
  title: string;
  description: string;
  timeLimitMinutes: number;
  questionCount: number;
  status: 'available' | 'completed' | 'expired';
  score?: number;
}

export default function AssessmentsListPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useQuery({
    queryKey: ['candidate', 'assessments'],
    queryFn: () => api.get<AssessmentSummary[]>('/candidates/me/assessments').then((r) => r.data),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('assessment.listHeading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('assessment.listHeading')}</h1>

      {isLoading ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : !data?.length ? (
        <Card className="text-center">
          <Award className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-navy">{t('assessment.noAssessments')}</p>
          <p className="mt-1 text-sm text-gray-500">{t('assessment.noAssessmentsHint')}</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.map((a) => (
            <Card key={a.assessmentId} className="transition hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-navy">{a.title}</h3>
                  <p className="mt-1 text-sm text-gray-500">{a.description}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {a.timeLimitMinutes} min</span>
                    <span>{a.questionCount} {t('assessment.questions')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {a.status === 'completed' && a.score !== undefined && (
                    <span className="text-lg font-bold text-primary">{a.score}%</span>
                  )}
                  <Badge tone={a.status === 'completed' ? 'green' : a.status === 'expired' ? 'red' : 'blue'}>
                    {t(`assessment.status_${a.status}`)}
                  </Badge>
                  {a.status === 'available' && (
                    <Link
                      to={`/candidate/assessments/${a.assessmentId}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      {t('assessment.takeTest')} <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
