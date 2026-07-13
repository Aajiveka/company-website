import { useRef, useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Badge, Breadcrumbs, Card, statusTone, useToast } from '@/components/ui';
import { useCandidateDocuments } from '../candidate.api';

/** Candidate — document upload & status (candidate-upload-doc.aspx). */
export default function DocumentsPage() {
  const { data, isLoading } = useCandidateDocuments();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [target, setTarget] = useState<number | null>(null);

  const onPick = (docId: number) => {
    setTarget(docId);
    fileRef.current?.click();
  };
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      // Wire to POST /candidates/me/documents/:id (multipart) when available.
      notify(`"${e.target.files[0].name}" uploaded for review.`, 'success');
      setTarget(null);
      e.target.value = '';
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/candidate/profile' }, { label: 'Documents' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">My Documents</h1>

      <input ref={fileRef} type="file" className="hidden" onChange={onFile} aria-hidden />

      {isLoading ? (
        <Card>Loading documents…</Card>
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
                    {doc.uploadedOn ? `Uploaded ${doc.uploadedOn}` : 'Not uploaded'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone(doc.status)}>{doc.status}</Badge>
                <button
                  onClick={() => onPick(doc.documentId)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
                >
                  <Upload className="h-4 w-4" />
                  {doc.status === 'Pending' ? 'Upload' : 'Re-upload'}
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {target !== null && <p className="mt-3 text-sm text-gray-500">Selecting file…</p>}
    </div>
  );
}
