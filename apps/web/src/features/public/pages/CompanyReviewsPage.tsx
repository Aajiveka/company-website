import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Star, ThumbsUp, User } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button, Card, Input, Modal, Pagination, Skeleton, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/cn';

/* ---------- types ---------- */
interface Review {
  id: number;
  rating: number;
  title: string;
  pros: string;
  cons: string;
  reviewerName: string | null;
  anonymous: boolean;
  recommend: boolean;
  createdAt: string;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>; // 1-5 => count
}

interface ReviewsResponse {
  rows: Review[];
  total: number;
  page: number;
  pageCount: number;
  summary: ReviewSummary;
}

type SortOption = 'recent' | 'highest' | 'lowest';

const PAGE_SIZE = 10;

/* ---------- Stars component ---------- */
function Stars({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type={onChange ? 'button' : undefined}
          onClick={() => onChange?.(s)}
          className={cn(onChange && 'cursor-pointer', !onChange && 'cursor-default')}
          aria-label={`${s} star${s > 1 ? 's' : ''}`}
        >
          <Star
            className={cn(
              dim,
              s <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600',
            )}
          />
        </button>
      ))}
    </div>
  );
}

/* ---------- Distribution bar ---------- */
function DistributionBar({
  star,
  count,
  max,
}: {
  star: number;
  count: number;
  max: number;
}) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-3 text-right text-gray-500 dark:text-gray-400">{star}</span>
      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden />
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-amber-400 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs text-gray-500 dark:text-gray-400">{count}</span>
    </div>
  );
}

/* ---------- page ---------- */
export default function CompanyReviewsPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation('public');
  const { notify } = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<SortOption>('recent');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formRating, setFormRating] = useState(0);
  const [formTitle, setFormTitle] = useState('');
  const [formPros, setFormPros] = useState('');
  const [formCons, setFormCons] = useState('');
  const [formRecommend, setFormRecommend] = useState(true);
  const [formAnonymous, setFormAnonymous] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['companyReviews', id, page, sort],
    queryFn: async () => {
      const { data } = await api.get<ReviewsResponse>(
        `/companies/${id}/reviews`,
        { params: { page, sort, pageSize: PAGE_SIZE } },
      );
      return data;
    },
    enabled: !!id,
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      await api.post(`/companies/${id}/reviews`, {
        rating: formRating,
        title: formTitle,
        pros: formPros,
        cons: formCons,
        recommend: formRecommend,
        anonymous: formAnonymous,
      });
    },
    onSuccess: () => {
      notify(t('companyReviews.submitted'), 'success');
      setShowModal(false);
      resetForm();
      qc.invalidateQueries({ queryKey: ['companyReviews', id] });
    },
    onError: () => {
      notify(t('companyReviews.submitFailed'), 'error');
    },
  });

  const resetForm = () => {
    setFormRating(0);
    setFormTitle('');
    setFormPros('');
    setFormCons('');
    setFormRecommend(true);
    setFormAnonymous(false);
  };

  const summary = data?.summary;
  const reviews = data?.rows ?? [];
  const maxDist = summary ? Math.max(...Object.values(summary.distribution), 1) : 1;

  const SORT_OPTIONS: { value: SortOption; label: string }[] = [
    { value: 'recent', label: t('companyReviews.sortRecent') },
    { value: 'highest', label: t('companyReviews.sortHighest') },
    { value: 'lowest', label: t('companyReviews.sortLowest') },
  ];

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });

  return (
    <>
      <Seo
        title={t('companyReviews.heading')}
        description="Read and write company reviews on Aajiveka."
        path={`/companies/${id}/reviews`}
      />

      <section className="py-10 md:py-14">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h1 className="font-heading text-2xl font-bold text-navy dark:text-white">
              {t('companyReviews.heading')}
            </h1>
            <Button onClick={() => setShowModal(true)}>
              {t('companyReviews.writeReview')}
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
              <Skeleton className="h-32 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* Rating summary */}
              {summary && (
                <Card className="mb-8">
                  <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
                    <div className="text-center sm:pr-8">
                      <p className="font-heading text-5xl font-bold text-navy dark:text-white">
                        {summary.averageRating.toFixed(1)}
                      </p>
                      <Stars value={Math.round(summary.averageRating)} size="md" />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {t('companyReviews.totalReviews', { count: summary.totalReviews })}
                      </p>
                    </div>
                    <div className="flex-1 space-y-1.5">
                      {[5, 4, 3, 2, 1].map((s) => (
                        <DistributionBar
                          key={s}
                          star={s}
                          count={summary.distribution[s] ?? 0}
                          max={maxDist}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Sort */}
              <div className="mb-6 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('companyReviews.showingReviews', { count: data?.total ?? 0 })}
                </p>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as SortOption);
                    setPage(1);
                  }}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reviews list */}
              {reviews.length === 0 ? (
                <Card className="text-center">
                  <div className="flex flex-col items-center gap-3 py-8">
                    <Star className="h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden />
                    <p className="text-navy dark:text-white">{t('companyReviews.noReviews')}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('companyReviews.beFirst')}</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <div className="flex items-start justify-between">
                        <div>
                          <Stars value={review.rating} size="sm" />
                          <h3 className="mt-2 font-semibold text-navy dark:text-white">{review.title}</h3>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(review.createdAt)}
                        </span>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="text-xs font-medium uppercase text-green-600 dark:text-green-400">
                            {t('companyReviews.pros')}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {review.pros}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase text-red-500 dark:text-red-400">
                            {t('companyReviews.cons')}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            {review.cons}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                          <User className="h-4 w-4" aria-hidden />
                          {review.anonymous
                            ? t('companyReviews.anonymous')
                            : review.reviewerName}
                        </div>
                        {review.recommend && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                            <ThumbsUp className="h-3.5 w-3.5" aria-hidden />
                            {t('companyReviews.recommends')}
                          </span>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {(data?.pageCount ?? 0) > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    page={page}
                    pageCount={data!.pageCount}
                    onChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* Write a Review Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('companyReviews.writeReview')}
        className="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitReview.mutate();
          }}
          className="space-y-4"
        >
          {/* Rating */}
          <div>
            <label className="mb-1 block text-sm font-medium text-navy dark:text-gray-200">
              {t('companyReviews.yourRating')}
            </label>
            <Stars value={formRating} onChange={setFormRating} size="md" />
          </div>

          {/* Title */}
          <div>
            <label className="mb-1 block text-sm font-medium text-navy dark:text-gray-200">
              {t('companyReviews.reviewTitle')}
            </label>
            <Input
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder={t('companyReviews.reviewTitlePlaceholder')}
              required
            />
          </div>

          {/* Pros */}
          <div>
            <label className="mb-1 block text-sm font-medium text-navy dark:text-gray-200">
              {t('companyReviews.pros')}
            </label>
            <textarea
              value={formPros}
              onChange={(e) => setFormPros(e.target.value)}
              placeholder={t('companyReviews.prosPlaceholder')}
              rows={3}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Cons */}
          <div>
            <label className="mb-1 block text-sm font-medium text-navy dark:text-gray-200">
              {t('companyReviews.cons')}
            </label>
            <textarea
              value={formCons}
              onChange={(e) => setFormCons(e.target.value)}
              placeholder={t('companyReviews.consPlaceholder')}
              rows={3}
              required
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Recommend toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formRecommend}
              onChange={(e) => setFormRecommend(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {t('companyReviews.recommendCompany')}
          </label>

          {/* Anonymous toggle */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={formAnonymous}
              onChange={(e) => setFormAnonymous(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            {t('companyReviews.postAnonymously')}
          </label>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowModal(false)}
            >
              {t('companyReviews.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={formRating === 0 || submitReview.isPending}
            >
              {submitReview.isPending
                ? t('companyReviews.submitting')
                : t('companyReviews.submitReview')}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
