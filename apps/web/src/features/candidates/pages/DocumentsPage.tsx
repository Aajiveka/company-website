import { useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { FileText, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Card, DocumentListSkeleton, statusTone, useToast } from '@/components/ui';
import { useCandidateDocuments, useUploadCandidateDocument } from '../candidate.api';

/** Candidate — document upload & status (candidate-doc.aspx). */
export default function DocumentsPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useCandidateDocuments();
  const upload = useUploadCandidateDocument();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<number | null>(null);

  const onPick = (documentTypeId: number | null) => {
    if (documentTypeId == null) return;
    setTarget(documentTypeId);
    fileRef.current?.click();
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || target == null) return;
    upload.mutate(
      { documentTypeId: target, file },
      {
        onSuccess: () => notify(t('documents.uploadSuccess', { name: file.name }), 'success'),
        onError: (err) =>
          notify(isAxiosError(err) ? err.response?.data?.message ?? t('documents.uploadFailed') : t('documents.uploadFailed'), 'error'),
        onSettled: () => setTarget(null),
      },
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('documents.heading') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('documents.heading')}</h1>

      <input ref={fileRef} type="file" className="hidden" onChange={onFile} aria-hidden />

      {isLoading ? (
        <DocumentListSkeleton />
      ) : (data ?? []).length === 0 ? (
        <Card className="text-center text-gray-500">
          {t('documents.noDocuments')} {t('documents.recruiterNote')}
        </Card>
      ) : (
        <div className="space-y-3">
          {(data ?? []).map((doc) => (
            <Card key={doc.documentId} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-navy">{doc.name}</p>
                  <p className="text-xs text-gray-400">
                    {doc.uploadedOn ? t('documents.uploaded', { date: doc.uploadedOn }) : t('documents.notUploaded')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                <button
                  onClick={() => onPick(doc.documentTypeId)}
                  disabled={upload.isPending && target === doc.documentTypeId}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  {doc.status === 'Pending' ? t('documents.upload') : t('documents.reUpload')}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
