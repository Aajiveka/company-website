import { useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { Button, Card, useToast } from '@/components/ui';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';

/* ---------- types / schema ---------- */

const RECOMMENDATIONS = ['Strong Hire', 'Hire', 'No Hire', 'Strong No Hire'] as const;

const ratingField = z.number().min(1, 'Rating required').max(5);

const feedbackSchema = z.object({
  technicalSkills: ratingField,
  communication: ratingField,
  problemSolving: ratingField,
  culturalFit: ratingField,
  strengths: z.string().min(1, 'Strengths are required'),
  improvements: z.string().min(1, 'Areas for improvement are required'),
  recommendation: z.enum(RECOMMENDATIONS, { required_error: 'Select a recommendation' }),
});

type FeedbackValues = z.infer<typeof feedbackSchema>;

interface Props {
  interviewId: string;
  candidateName: string;
  onClose: () => void;
}

/* ---------- hooks ---------- */

function useSubmitFeedback(interviewId: string) {
  return useMutation({
    mutationFn: (payload: FeedbackValues & { overallRating: number }) =>
      api.post(`/recruitment/interviews/${interviewId}/feedback`, payload).then((r) => r.data),
  });
}

/* ---------- star rating ---------- */

interface StarRatingProps {
  value: number;
  onChange: (v: number) => void;
  error?: string;
  label: string;
}

function StarRating({ value, onChange, error, label }: StarRatingProps) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded p-0.5 outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
          >
            <Star
              className={cn(
                'h-6 w-6 transition-colors',
                star <= value
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-none text-gray-300 dark:text-gray-600',
              )}
            />
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- component ---------- */

const RATING_CATEGORIES = [
  { key: 'technicalSkills' as const, i18n: 'feedback.technicalSkills' },
  { key: 'communication' as const, i18n: 'feedback.communication' },
  { key: 'problemSolving' as const, i18n: 'feedback.problemSolving' },
  { key: 'culturalFit' as const, i18n: 'feedback.culturalFit' },
];

export default function InterviewFeedbackForm({ interviewId, candidateName, onClose }: Props) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const submit = useSubmitFeedback(interviewId);

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FeedbackValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      technicalSkills: 0,
      communication: 0,
      problemSolving: 0,
      culturalFit: 0,
      strengths: '',
      improvements: '',
      recommendation: undefined,
    },
  });

  const ratings = watch(['technicalSkills', 'communication', 'problemSolving', 'culturalFit']);
  const overallRating = useMemo(() => {
    const filled = ratings.filter((r) => r > 0);
    if (filled.length === 0) return 0;
    return Number((filled.reduce((a, b) => a + b, 0) / filled.length).toFixed(1));
  }, [ratings]);

  const onSubmit = (values: FeedbackValues) => {
    submit.mutate(
      { ...values, overallRating },
      {
        onSuccess: () => {
          notify(t('feedback.success'), 'success');
          onClose();
        },
        onError: (e) =>
          notify(
            isAxiosError(e)
              ? (e.response?.data?.message ?? t('feedback.error'))
              : t('feedback.error'),
            'error',
          ),
      },
    );
  };

  return (
    <Card className="mx-auto max-w-2xl">
      <h2 className="mb-1 text-xl font-semibold text-navy dark:text-gray-100">
        {t('feedback.title')}
      </h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        {t('feedback.candidate')}: {candidateName}
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
        {/* Star ratings */}
        <div className="grid gap-4 sm:grid-cols-2">
          {RATING_CATEGORIES.map(({ key, i18n }) => (
            <Controller
              key={key}
              name={key}
              control={control}
              render={({ field }) => (
                <StarRating
                  label={t(i18n)}
                  value={field.value}
                  onChange={field.onChange}
                  error={errors[key]?.message}
                />
              )}
            />
          ))}
        </div>

        {/* Overall rating */}
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-navy dark:text-gray-200">
              {t('feedback.overallRating')}:
            </span>
            <span className="text-lg font-bold text-primary">{overallRating}</span>
            <span className="text-sm text-gray-400">/ 5</span>
          </div>
        </div>

        {/* Strengths */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
            {t('feedback.strengths')}
            <span className="ml-0.5 text-danger" aria-hidden>*</span>
          </label>
          <textarea
            className={cn(
              'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition',
              'placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30',
              'dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
              errors.strengths
                ? 'border-danger focus:ring-danger/30'
                : 'border-gray-300 focus:border-primary dark:border-gray-600',
            )}
            rows={3}
            placeholder={t('feedback.strengthsPlaceholder')}
            {...register('strengths')}
          />
          {errors.strengths && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {errors.strengths.message}
            </p>
          )}
        </div>

        {/* Areas for improvement */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
            {t('feedback.improvements')}
            <span className="ml-0.5 text-danger" aria-hidden>*</span>
          </label>
          <textarea
            className={cn(
              'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition',
              'placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30',
              'dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
              errors.improvements
                ? 'border-danger focus:ring-danger/30'
                : 'border-gray-300 focus:border-primary dark:border-gray-600',
            )}
            rows={3}
            placeholder={t('feedback.improvementsPlaceholder')}
            {...register('improvements')}
          />
          {errors.improvements && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {errors.improvements.message}
            </p>
          )}
        </div>

        {/* Recommendation */}
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-navy dark:text-gray-200">
            {t('feedback.recommendation')}
            <span className="ml-0.5 text-danger" aria-hidden>*</span>
          </legend>
          <div className="flex flex-wrap gap-3">
            {RECOMMENDATIONS.map((rec) => (
              <label
                key={rec}
                className="flex cursor-pointer items-center gap-1.5 text-sm text-gray-700 dark:text-gray-300"
              >
                <input
                  type="radio"
                  value={rec}
                  className="h-4 w-4 border-gray-300 text-primary focus:ring-primary/30 dark:border-gray-600"
                  {...register('recommendation')}
                />
                {t(`feedback.rec.${rec}`)}
              </label>
            ))}
          </div>
          {errors.recommendation && (
            <p role="alert" className="mt-1 text-xs text-danger">
              {errors.recommendation.message}
            </p>
          )}
        </fieldset>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t('feedback.cancel')}
          </Button>
          <Button type="submit" size="sm" isLoading={submit.isPending}>
            {t('feedback.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}
