import { useState } from 'react';
import { PrimaryButton, SecondaryButton, EmployerBadge } from '@/employer/components/Cards/ui';
import {
  useApplicantDocuments,
  useReviewApplicantDocument,
} from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';

/** Review loop for the documents Q3 collected after selection. */
export function ApplicantDocumentsPanel({ mapId }: { mapId: number }) {
  const { data: docs = [], refetch } = useApplicantDocuments(mapId);
  const review = useReviewApplicantDocument(mapId);
  const [error, setError] = useState<string | null>(null);

  const onReview = async (docUploadId: number, status: 'Approved' | 'NeedsCorrection') => {
    setError(null);
    try {
      await review.mutateAsync({ docUploadId, status });
      void refetch();
    } catch (err) {
      setError(getErrorMessage(err, 'Review failed'));
    }
  };

  return (
    <div className="space-y-2 text-xs">
      {error && <p className="text-rose-600">{error}</p>}
      {docs.length === 0 ? (
        <p className="text-slate-400">No documents yet.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => {
            const uploadId = d.docUploadId;
            return (
              <li
                key={uploadId ?? `requested-${d.documentType}`}
                className="border-b border-slate-100 pb-2 last:border-0"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {d.documentType || `Doc #${uploadId}`}
                  </span>
                  <EmployerBadge
                    tone={
                      d.status === 'Verified'
                        ? 'success'
                        : d.status === 'Rejected'
                          ? 'danger'
                          : d.status === 'Requested'
                            ? 'warning'
                            : 'neutral'
                    }
                  >
                    {d.status === 'Requested' ? 'Awaiting upload' : d.status}
                  </EmployerBadge>
                </div>
                {uploadId != null && d.status !== 'Verified' && (
                  <div className="mt-1 flex gap-1">
                    <PrimaryButton
                      disabled={review.isPending}
                      onClick={() => void onReview(uploadId, 'Approved')}
                    >
                      Approve
                    </PrimaryButton>
                    <SecondaryButton
                      disabled={review.isPending}
                      onClick={() => void onReview(uploadId, 'NeedsCorrection')}
                    >
                      Needs correction
                    </SecondaryButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
