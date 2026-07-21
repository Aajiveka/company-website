import { Check, X } from 'lucide-react';
import { Badge, Breadcrumbs, statusTone, Table, useToast, type Column } from '@/components/ui';
import { useDocumentReviews, useReviewDocument } from '../recruitment.api';
import type { CandidateDocReview } from '../recruitment.types';

/** QC — verify candidate documents (mark-documents.aspx / documents-status.aspx). */
export default function DocumentReviewPage() {
  const { data, isLoading } = useDocumentReviews();
  const review = useReviewDocument();
  const { notify } = useToast();

  const act = (documentId: number, status: 'Verified' | 'Rejected') =>
    review.mutate(
      { documentId, status },
      { onSuccess: () => notify(`Document ${status.toLowerCase()}.`, status === 'Verified' ? 'success' : 'info') },
    );

  const columns: Column<CandidateDocReview>[] = [
    { key: 'candidate', header: 'Candidate' },
    { key: 'document', header: 'Document' },
    { key: 'status', header: 'Status', render: (d) => <Badge tone={statusTone(d.status)}>{d.status}</Badge> },
    {
      key: 'actions',
      header: 'Actions',
      render: (d) =>
        d.status === 'Pending' ? (
          <div className="flex gap-2">
            <button
              onClick={() => act(d.documentId, 'Verified')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <Check className="h-3.5 w-3.5" /> Verify
            </button>
            <button
              onClick={() => act(d.documentId, 'Rejected')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">Reviewed</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: 'Recruitment', to: '/recruitment/candidates' }, { label: 'Documents' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Document Verification</h1>
      <Table columns={columns} data={data ?? []} rowKey={(d) => d.documentId} isLoading={isLoading} emptyMessage="No documents to review." />
    </div>
  );
}
