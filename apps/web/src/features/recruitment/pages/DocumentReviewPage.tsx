import { useState } from 'react';
import { Check, Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, statusTone, Table, useToast, type Column } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { useDocumentReviews, useDownloadDocument, useReviewDocument } from '../recruitment.api';
import type { CandidateDocReview } from '../recruitment.types';

/** QC — verify candidate documents (mark-documents.aspx / documents-status.aspx). */
export default function DocumentReviewPage() {
  const { t } = useTranslation('common');
  const { data, isLoading, isError, refetch } = useDocumentReviews();
  const review = useReviewDocument();
  const download = useDownloadDocument();
  const { notify } = useToast();

  /**
   * Which row is mid-review. `review.isPending` is one flag for one shared mutation, so
   * acting on any row greyed out the buttons on every other row.
   */
  const [actingOn, setActingOn] = useState<number | null>(null);

  const act = (documentId: number, status: 'Verified' | 'Rejected') => {
    setActingOn(documentId);
    review.mutate(
      { documentId, status },
      {
        onSuccess: () =>
          notify(
            status === 'Verified' ? t('recruitment.documentVerified') : t('recruitment.documentRejected'),
            status === 'Verified' ? 'success' : 'info',
          ),
        // Without this a failed Verify did nothing visible at all: the row stayed Pending
        // and the reviewer had no way to tell the click had not worked.
        onError: () => notify(t('errors.somethingWrong'), 'error'),
        onSettled: () => setActingOn(null),
      },
    );
  };

  const columns: Column<CandidateDocReview>[] = [
    { key: 'candidate', header: t('labels.candidate') },
    {
      // Verify/Reject used to be offered against nothing but a type label — the reviewer
      // could not open the document they were judging. The path was on the row all along.
      key: 'document',
      header: t('recruitment.document'),
      render: (d) => (
        <button
          type="button"
          disabled={download.isPending}
          onClick={() =>
            download.mutate(
              { documentId: d.documentId, fileName: d.document },
              { onError: () => notify(t('errors.somethingWrong'), 'error') },
            )
          }
          className="inline-flex items-center gap-1.5 text-primary underline-offset-2 hover:underline disabled:opacity-60"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          {d.document}
        </button>
      ),
    },
    { key: 'status', header: t('labels.status'), render: (d) => <Badge tone={statusTone(d.status)}>{d.status}</Badge> },
    {
      key: 'actions',
      header: t('labels.actions'),
      render: (d) =>
        d.status === 'Pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => act(d.documentId, 'Verified')}
              disabled={actingOn === d.documentId}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100 disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" /> {t('actions.verify')}
            </button>
            <button
              onClick={() => act(d.documentId, 'Rejected')}
              disabled={actingOn === d.documentId}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" /> {t('actions.reject')}
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">{t('recruitment.reviewed')}</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('recruitment.title'), to: '/recruitment/candidates' }, { label: t('sidebar.documents') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('recruitment.documentVerification')}</h1>
      {/* Without this branch a failed load was indistinguishable from an empty queue —
          the reviewer saw "No documents to review" and moved on. */}
      {isError ? (
        <EmptyState
          variant="error"
          title={t('errors.couldNotLoad')}
          description={t('errors.tryAgain')}
          action={{ label: t('actions.retry'), onClick: () => void refetch() }}
        />
      ) : (
        <Table columns={columns} data={data ?? []} rowKey={(d) => d.documentId} isLoading={isLoading} emptyMessage={t('recruitment.noDocumentsToReview')} />
      )}
    </div>
  );
}
