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
 * The design groups uploads into three named categories; the schema's unit is a *requested
 * document* (`CandidateDocumentMap` → `MstrDocuments`), which an employer configures. So each
 * requirement renders as its own card and the design's explanatory blurbs are matched onto it
 * by name — a requirement the design never anticipated still gets a card, just without a
 * hand-written description.
 */
const BLURBS: { match: RegExp; blurb: string }[] = [
  {
    match: /certificat|course|award/i,
    blurb: 'Professional certifications, course completions & awards',
  },
  {
    match: /aadhaar|aadhar|pan|passport|identity|govt|government|id proof/i,
    blurb: 'Aadhaar, PAN card, passport or any official identity proof',
  },
  {
    match: /offer|noc|experience letter|relieving|other/i,
    blurb: 'Offer letters, NOC, experience letters or any other files',
  },
];

const blurbFor = (name: string) =>
  BLURBS.find((b) => b.match.test(name))?.blurb ?? 'Upload the file your employer has requested';

const ACCEPTED = '.pdf,.jpg,.png';

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
            {uploaded.length} {uploaded.length === 1 ? 'file' : 'files'} uploaded
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
  const hasFile = !!doc.uploadedOn;

  return (
    <Card className="flex flex-col">
      <CardBody className="flex flex-1 flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-aj-canvas text-aj-blue dark:bg-gray-700">
            <FileText className="size-5" aria-hidden />
          </span>
          {/* The design labels an untouched requirement "No files" rather than "Pending". */}
          <Pill tone={hasFile ? TONE[doc.status] : 'slate'}>{hasFile ? doc.status : 'No files'}</Pill>
        </div>

        <div className="flex-1">
          <p className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">{doc.name}</p>
          <p className="mt-0.5 text-xs leading-snug text-slate-500">{blurbFor(doc.name)}</p>
          {hasFile && <p className="mt-1.5 text-xs text-slate-400">Uploaded {longDate(doc.uploadedOn)}</p>}
        </div>

        <button
          type="button"
          onClick={onOpen}
          className="self-start text-xs font-semibold text-aj-blue transition-colors hover:text-aj-blue-hover"
        >
          {hasFile ? 'Manage files' : 'Upload'}
        </button>
      </CardBody>
    </Card>
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
            All Categories
          </button>
        }
      />
      <CardBody>
        <p className="text-[13px] text-slate-500">{blurbFor(doc.name)}</p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Pill tone={doc.uploadedOn ? TONE[doc.status] : 'slate'}>
            {doc.uploadedOn ? doc.status : 'No files'}
          </Pill>
          <Btn onClick={() => inputRef.current?.click()} disabled={upload.isPending || doc.documentTypeId == null}>
            <Upload className="size-4" aria-hidden />
            {upload.isPending ? 'Uploading…' : doc.uploadedOn ? 'Replace file' : 'Upload File'}
          </Btn>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            onFile(file);
          }}
        />

        <div className="mt-5 border-t border-aj-line-soft pt-4 dark:border-gray-700">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Uploaded Files</p>
          {doc.uploadedOn ? (
            <div className="mt-3 flex items-center gap-3 rounded-lg border border-aj-line bg-aj-surface-soft px-3.5 py-3 dark:border-gray-700 dark:bg-gray-900">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-aj-blue text-white">
                <FileText className="size-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">{doc.name}</p>
                <p className="truncate text-xs text-slate-500">Uploaded {longDate(doc.uploadedOn)}</p>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-xs italic text-slate-400">No files</p>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-400">Accepted: {ACCEPTED}</p>
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
