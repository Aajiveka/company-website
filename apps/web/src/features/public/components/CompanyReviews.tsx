import { useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';
import { useAuth } from '@/features/auth/auth.store';

interface Review {
  reviewId: number;
  subscriberName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function useCompanyReviews(clientId: string) {
  return useQuery({
    queryKey: ['company', 'reviews', clientId],
    queryFn: () => api.get<Review[]>(`/clients/${clientId}/reviews`).then((r) => r.data),
    enabled: !!clientId,
  });
}

function useSubmitReview(clientId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { rating: number; comment: string }) =>
      api.post(`/clients/${clientId}/reviews`, payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['company', 'reviews', clientId] }),
  });
}

function StarRating({ value, onChange, readOnly = false }: { value: number; onChange?: (v: number) => void; readOnly?: boolean }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => setHover(0)}
          className={cn('transition', readOnly ? 'cursor-default' : 'cursor-pointer')}
          aria-label={`${star} star`}
        >
          <Star
            className={cn(
              'h-5 w-5',
              (hover || value) >= star ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600',
            )}
          />
        </button>
      ))}
    </div>
  );
}

/** Company reviews section — shown on public company profile. */
export function CompanyReviews({ clientId }: { clientId: string }) {
  const { t } = useTranslation('dashboard');
  const { isAuthenticated } = useAuth();
  const { notify } = useToast();
  const { data: reviews, isLoading } = useCompanyReviews(clientId);
  const submit = useSubmitReview(clientId);
  const [showForm, setShowForm] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const avgRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;
    submit.mutate({ rating, comment }, {
      onSuccess: () => {
        notify(t('reviews.submitted'), 'success');
        setShowForm(false);
        setRating(0);
        setComment('');
      },
      onError: () => notify(t('reviews.submitFailed'), 'error'),
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-navy">
          <MessageSquare className="h-5 w-5 text-primary" />
          {t('reviews.heading')} {reviews?.length ? `(${reviews.length})` : ''}
        </h2>
        {avgRating && (
          <div className="flex items-center gap-1.5">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            <span className="text-sm font-semibold text-navy">{avgRating}</span>
          </div>
        )}
      </div>

      {/* Write review */}
      {isAuthenticated && !showForm && (
        <Button variant="outline" size="sm" className="mb-4" onClick={() => setShowForm(true)}>
          {t('reviews.writeReview')}
        </Button>
      )}

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-navy">{t('reviews.yourRating')}</label>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-navy">{t('reviews.yourComment')}</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:border-primary dark:border-gray-700 dark:bg-gray-800"
                placeholder={t('reviews.commentPlaceholder')}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={rating === 0} isLoading={submit.isPending}>
                {t('reviews.submitButton')}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(false)}>
                {t('common:actions.cancel')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Reviews list */}
      {isLoading ? (
        <p className="text-sm text-gray-500">{t('common:actions.loading')}</p>
      ) : !reviews?.length ? (
        <Card className="text-center">
          <p className="text-sm text-gray-500">{t('reviews.noReviews')}</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <Card key={r.reviewId}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-navy">{r.subscriberName}</p>
                  <StarRating value={r.rating} readOnly />
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(r.createdAt).toLocaleDateString()}
                </span>
              </div>
              {r.comment && <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{r.comment}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
