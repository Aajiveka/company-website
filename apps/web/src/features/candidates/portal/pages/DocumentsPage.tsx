import { useMemo, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { ArrowLeft, FileText, FolderClosed, Upload } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useCandidateDocuments, useUploadCandidateDocument } from '../../candidate.api';
import type { CandidateDocument } from '../../candidate.types';
import { ModuleHeader } from '../components/ModuleFrame';
import { Btn, Card, CardBody, CardHeader, EmptyState, ErrorState, Pill, SkeletonRows } from '../components/primitives';
import { longDate } from '../format';

/**
 * Documents — Figma nodes 7:5916 (empty), 7:5476 (categories) and 7:5635 (one category).
 *
 * The design groups uploads into categories; the schema's unit is a *requested document*
 * (`CandidateDocumentMap` → `MstrDocuments`), so each requirement is presented as its own
 * card and drilling in shows that requirement's upload state. That keeps the design's
 * two-level shape without inventing a category table.
 */
export default function DocumentsPage() {
  const { data, isLoading, isError, refetch } = useCandidateDocuments();
  const [openId, setOpenId] = useState<number | null>(null);

  const docs = useMemo(() => data ?? [], [data]);
  const uploaded = docs.filter((d) => d.status !== 'Pending');
  const open = docs.find((d) => d.documentId === openId) ?? null;

  return (
    <>
      <ModuleHeader
        title="Documents"
        action={
          <span className="text-xs text-slate-500">
            {uploaded.length} of {docs.length} uploaded
          </span>
        }
      />

      {isError ? (
        <Card>
          <ErrorState message="We could not load your documents." onRetry={refetch} />
        </Card>
      ) : isLoading ? (
        <Card>
          <CardBody>
            <SkeletonRows rows={3} />
          </CardBody>
        </Card>
      ) : !docs.length ? (
        <Card>
          <EmptyState
            icon={<FolderClosed className="size-10" aria-hidden />}
            title="No documents requested yet"
            description="When an employer asks for a document it will appear here for you to upload."
          />
        </Card>
      ) : open ? (
        <DocumentDetail doc={open} onBack={() => setOpenId(null)} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {docs.map((doc) => (
            <DocumentCard key={doc.documentId} doc={doc} onOpen={() => setOpenId(doc.documentId)} />
          ))}
        </div>
      )}
    </>
  );
}

const TONE = {
  Verified: 'green',
  Uploaded: 'blue',
  Rejected: 'red',
  Pending: 'slate',
} as const;

function DocumentCard({ doc, onOpen }: { doc: CandidateDocument; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col gap-3 rounded-xl border border-aj-line bg-white p-4 text-left shadow-aj-card transition-colors hover:border-aj-blue dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 items-center justify-center rounded-lg bg-aj-canvas text-aj-blue dark:bg-gray-700">
          <FileText className="size-5" aria-hidden />
        </span>
        <Pill tone={TONE[doc.status]}>{doc.status}</Pill>
      </div>
      <div>
        <p className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">{doc.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {doc.uploadedOn ? `Uploaded ${longDate(doc.uploadedOn)}` : 'No file yet'}
        </p>
      </div>
    </button>
  );
}

function DocumentDetail({ doc, onBack }: { doc: CandidateDocument; onBack: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUploadCandidateDocument();
  const { notify } = useToast();
  const [error, setError] = useState<string | null>(null);

  const onFile = (file: File | undefined) => {
    if (!file || doc.documentTypeId == null) return;
    setError(null);
    upload.mutate(
      { documentTypeId: doc.documentTypeId, file },
      {
        onSuccess: () => notify(`${file.name} uploaded.`, 'success'),
        onError: (err) =>
          setError(
            isAxiosError(err) && err.response?.status === 413
              ? 'That file is too large.'
              : 'Upload failed. Please try again.',
          ),
      },
    );
  };

  return (
    <Card>
      <CardHeader
        title={doc.name}
        action={
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
          >
            <ArrowLeft className="size-3.5" aria-hidden />
            All documents
          </button>
        }
      />
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Pill tone={TONE[doc.status]}>{doc.status}</Pill>
            <p className="mt-1.5 text-xs text-slate-500">
              {doc.uploadedOn ? `Uploaded ${longDate(doc.uploadedOn)}` : 'Nothing uploaded yet'}
            </p>
          </div>
          <Btn onClick={() => inputRef.current?.click()} disabled={upload.isPending || doc.documentTypeId == null}>
            <Upload className="size-4" aria-hidden />
            {upload.isPending ? 'Uploading…' : doc.uploadedOn ? 'Replace file' : 'Upload file'}
          </Btn>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            onFile(file);
          }}
        />

        <p className="mt-3 text-xs text-slate-400">Accepted: .pdf, .jpg, .png</p>
        {doc.documentTypeId == null && (
          <p className="mt-2 text-xs text-amber-600">
            This requirement has no document type configured, so it cannot be uploaded yet.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      </CardBody>
    </Card>
  );
}
