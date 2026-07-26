import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, statusTone, Table, useToast, type Column } from '@/components/ui';
import { useDocumentReviews, useReviewDocument } from '../recruitment.api';
import type { CandidateDocReview } from '../recruitment.types';

/** QC — verify candidate documents (mark-documents.aspx / documents-status.aspx). */
export default function DocumentReviewPage() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useDocumentReviews();
  const review = useReviewDocument();
  const { notify } = useToast();

  const act = (documentId: number, status: 'Verified' | 'Rejected') =>
    review.mutate(
      { documentId, status },
      { onSuccess: () => notify(status === 'Verified' ? t('recruitment.documentVerified') : t('recruitment.documentRejected'), status === 'Verified' ? 'success' : 'info') },
    );

  const columns: Column<CandidateDocReview>[] = [
    { key: 'candidate', header: t('labels.candidate') },
    { key: 'document', header: t('recruitment.document') },
    { key: 'status', header: t('labels.status'), render: (d) => <Badge tone={statusTone(d.status)}>{d.status}</Badge> },
    {
      key: 'actions',
      header: t('labels.actions'),
      render: (d) =>
        d.status === 'Pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => act(d.documentId, 'Verified')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100"
            >
              <Check className="h-3.5 w-3.5" /> {t('actions.verify')}
            </button>
            <button
              onClick={() => act(d.documentId, 'Rejected')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100"
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
      <Breadcrumbs items={[{ label: t('recruitment'), to: '/recruitment/candidates' }, { label: t('sidebar.documents') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('recruitment.documentVerification')}</h1>
      <Table columns={columns} data={data ?? []} rowKey={(d) => d.documentId} isLoading={isLoading} emptyMessage={t('recruitment.noDocumentsToReview')} />
    </div>
  );
}
