import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, CardSkeleton, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface AssessmentQuestion {
  questionId: number;
  question: string;
  options: string[];
}

interface Assessment {
  assessmentId: number;
  title: string;
  description: string;
  timeLimitMinutes: number;
  questions: AssessmentQuestion[];
}

interface AssessmentResult {
  score: number;
  total: number;
  passed: boolean;
  correctAnswers: Record<number, number>;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function SkillAssessmentPage() {
  const { t } = useTranslation('dashboard');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const { data: assessment, isLoading } = useQuery({
    queryKey: ['assessment', id],
    queryFn: () => api.get<Assessment>(`/assessments/${id}`).then((r) => r.data),
  });

  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<AssessmentResult | null>(null);

  const submit = useMutation({
    mutationFn: (payload: { assessmentId: number; answers: Record<number, number> }) =>
      api.post<AssessmentResult>(`/assessments/${id}/submit`, payload).then((r) => r.data),
    onSuccess: (data) => setResult(data),
    onError: () => notify(t('assessment.submitFailed'), 'error'),
  });

  const handleSubmit = useCallback(() => {
    if (!assessment) return;
    submit.mutate({ assessmentId: assessment.assessmentId, answers });
  }, [assessment, answers, submit]);

  useEffect(() => {
    if (started && timeLeft > 0 && !result) {
      const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (started && timeLeft === 0 && !result && assessment) {
      handleSubmit();
    }
  }, [started, timeLeft, result, assessment, handleSubmit]);

  const onStart = () => {
    if (!assessment) return;
    setStarted(true);
    setTimeLeft(assessment.timeLimitMinutes * 60);
  };

  const selectAnswer = (questionId: number, optionIdx: number) => {
    setAnswers((a) => ({ ...a, [questionId]: optionIdx }));
  };

  if (isLoading) return <div className="mx-auto max-w-3xl"><CardSkeleton /></div>;
  if (!assessment) return <div className="mx-auto max-w-3xl"><Card><p className="text-sm text-gray-500">{t('assessment.notFound')}</p></Card></div>;

  const questions = assessment.questions;
  const question = questions[currentQ];

  // Results screen
  if (result) {
    return (
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('assessment.results') }]} />
        <Card className="text-center">
          <div className={cn(
            'mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full',
            result.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30',
          )}>
            {result.passed ? (
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            ) : (
              <XCircle className="h-10 w-10 text-red-500" />
            )}
          </div>
          <h2 className="text-xl font-bold text-navy">
            {result.passed ? t('assessment.passed') : t('assessment.failed')}
          </h2>
          <p className="mt-2 text-3xl font-bold text-primary">{result.score}/{result.total}</p>
          <p className="mt-1 text-sm text-gray-500">{t('assessment.scoreLabel')}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/candidate/profile')}>
              {t('common:actions.back')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Start screen
  if (!started) {
    return (
      <div className="mx-auto max-w-3xl">
        <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: assessment.title }]} />
        <Card className="text-center">
          <h1 className="text-xl font-bold text-navy">{assessment.title}</h1>
          <p className="mt-2 text-sm text-gray-500">{assessment.description}</p>
          <div className="mt-4 flex justify-center gap-6 text-sm text-gray-600">
            <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-primary" /> {assessment.timeLimitMinutes} {t('assessment.minutes')}</span>
            <span>{questions.length} {t('assessment.questions')}</span>
          </div>
          <Button className="mt-6" onClick={onStart}>{t('assessment.startButton')}</Button>
        </Card>
      </div>
    );
  }

  // Quiz screen
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-navy">
          {t('assessment.questionOf', { current: currentQ + 1, total: questions.length })}
        </span>
        <span className={cn('flex items-center gap-1.5 text-sm font-medium', timeLeft < 60 ? 'text-danger' : 'text-gray-600')}>
          <Clock className="h-4 w-4" /> {formatTime(timeLeft)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }} />
      </div>

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-navy">{question.question}</h2>
        <div className="space-y-2">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => selectAnswer(question.questionId, i)}
              className={cn(
                'flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left text-sm transition',
                answers[question.questionId] === i
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300',
              )}
            >
              <span className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                answers[question.questionId] === i ? 'bg-primary text-white' : 'bg-gray-100 text-gray-500 dark:bg-gray-600',
              )}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={currentQ === 0}
            onClick={() => setCurrentQ((c) => c - 1)}
          >
            {t('common:actions.back')}
          </Button>
          {currentQ < questions.length - 1 ? (
            <Button size="sm" onClick={() => setCurrentQ((c) => c + 1)}>
              {t('common:actions.next')}
            </Button>
          ) : (
            <Button size="sm" onClick={handleSubmit} isLoading={submit.isPending}>
              {t('assessment.submitButton')}
            </Button>
          )}
        </div>
      </Card>

      {/* Question navigator */}
      <div className="mt-4 flex flex-wrap gap-2">
        {questions.map((q, i) => (
          <button
            key={q.questionId}
            onClick={() => setCurrentQ(i)}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition',
              currentQ === i ? 'bg-primary text-white' :
              answers[q.questionId] !== undefined ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
              'bg-gray-100 text-gray-500 dark:bg-gray-700',
            )}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}
