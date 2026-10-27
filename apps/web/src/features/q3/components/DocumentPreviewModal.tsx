import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { fetchDocumentFile } from '../q3.api';
import { dot, fmtDay, fmtDayTime, fmtSize } from '../q3.format';
import type { DocumentState, Q3Document } from '../q3.types';
import { Q3Modal } from './Q3Modal';
import { Pill, Q3Button } from './primitives';
import { useQ3Toast } from './q3-toast-context';

const STATE_PILL: Record<DocumentState, { label: string; tone: 'green' | 'blue' | 'amber' | 'red' }> = {
  Verified: { label: 'Verified', tone: 'green' },
  Uploaded: { label: 'Uploaded · verify', tone: 'blue' },
  NeedsCorrection: { label: 'Needs correction', tone: 'amber' },
  Missing: { label: 'Missing', tone: 'red' },
};

type Preview = { status: 'loading' } | { status: 'ready'; url: string; kind: 'image' | 'pdf' | 'other' } | { status: 'none' };

/**
 * The document preview overlay (Figma "overlay/modal · Document preview"). The file comes
 * through the API client as a Blob — the bearer token has to travel with it — and is shown
 * from an object URL, revoked as soon as the modal lets go of it.
 */
export function DocumentPreviewModal({
  doc,
  candidateName,
  onClose,
}: {
  doc: Q3Document | null;
  candidateName: string;
  onClose: () => void;
}) {
  const toast = useQ3Toast();
  const [preview, setPreview] = useState<Preview>({ status: 'none' });
  const [downloading, setDownloading] = useState(false);
  const id = doc?.docUploadId ?? null;
  const canPreview = !!doc?.canPreview;

  useEffect(() => {
    if (id == null || !canPreview) {
      setPreview({ status: 'none' });
      return;
    }
    let url: string | null = null;
    let cancelled = false;
    setPreview({ status: 'loading' });
    fetchDocumentFile(id, true)
      .then((blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        const kind = blob.type.startsWith('image/') ? 'image' : blob.type === 'application/pdf' ? 'pdf' : 'other';
        setPreview({ status: 'ready', url, kind });
      })
      .catch(() => !cancelled && setPreview({ status: 'none' }));
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [id, canPreview]);

  const download = async () => {
    if (!doc || id == null) return;
    setDownloading(true);
    try {
      const blob = await fetchDocumentFile(id, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName ?? doc.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      // Give the browser a tick to start the download before the URL goes away.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Download started', dot(doc.fileName, fmtSize(doc.sizeBytes)));
    } catch (err) {
      toast.error("Couldn't download the file", getErrorMessage(err));
    } finally {
      setDownloading(false);
    }
  };

  const pill = doc ? STATE_PILL[doc.state] : null;

  return (
    <Q3Modal
      open={!!doc}
      onClose={onClose}
      width={620}
      title={doc?.name ?? 'Document'}
      subtitle={
        doc
          ? dot(doc.fileName, fmtSize(doc.sizeBytes), doc.uploadedAt ? `uploaded ${fmtDay(doc.uploadedAt)} by ${candidateName}` : null)
          : undefined
      }
      footer={
        <>
          <Q3Button onClick={() => void download()} loading={downloading} disabled={id == null} className="min-h-[38px]">
            Download
          </Q3Button>
          <Q3Button variant="primary" onClick={onClose}>
            Close
          </Q3Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className={cn(
            'flex h-[268px] items-center justify-center overflow-hidden rounded-[10px] bg-q3-chip',
            !(preview.status === 'ready' && preview.kind === 'pdf') && 'p-6',
          )}
        >
          {preview.status === 'loading' ? (
            <Loader2 className="h-6 w-6 animate-spin text-q3-muted" aria-label="Loading preview" />
          ) : preview.status === 'ready' && preview.kind === 'image' ? (
            <img src={preview.url} alt={doc?.name ?? 'Document'} className="max-h-full max-w-full rounded-md object-contain" />
          ) : preview.status === 'ready' && preview.kind === 'pdf' ? (
            // <object> rather than a sandboxed <iframe>: browsers refuse to run their PDF viewer in a sandbox.
            <object data={preview.url} type="application/pdf" aria-label={doc?.name ?? 'Document preview'} className="h-full w-full">
              <div className="flex h-full items-center justify-center p-6">
                <PlaceholderPage />
              </div>
            </object>
          ) : (
            <PlaceholderPage />
          )}
        </div>
        {pill && (
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={pill.tone}>{pill.label}</Pill>
            {doc?.state === 'Verified' && (doc.verifiedBy || doc.verifiedAt) && (
              <span className="text-[12.5px] leading-[15px] text-q3-muted">
                {dot(doc.verifiedBy ? `Verified by ${doc.verifiedBy}` : 'Verified', doc.verifiedAt ? fmtDayTime(doc.verifiedAt) : null)}
              </span>
            )}
            {doc?.state === 'NeedsCorrection' && doc.comment && (
              <span className="text-[12.5px] leading-[15px] text-q3-amber">{doc.comment}</span>
            )}
          </div>
        )}
      </div>
    </Q3Modal>
  );
}

/** The design's skeleton page, shown when the file type can't be drawn in the browser. */
function PlaceholderPage() {
  return (
    <div className="relative flex h-[220px] w-full max-w-[360px] flex-col gap-2.5 rounded-md bg-q3-surface p-[22px] shadow-[0_2px_8px_rgb(0_0_0/0.08)]">
      <div className="flex gap-3.5">
        <span className="h-[78px] w-16 shrink-0 rounded bg-q3-track" />
        <div className="flex flex-1 flex-col gap-[9px] pt-1">
          <span className="h-2 w-[150px] max-w-full rounded bg-q3-track" />
          <span className="h-2 w-[110px] max-w-full rounded bg-q3-track" />
          <span className="h-2 w-[170px] max-w-full rounded bg-q3-track" />
          <span className="h-2 w-[90px] max-w-full rounded bg-q3-track" />
        </div>
      </div>
      <span className="h-2 w-[300px] max-w-full rounded bg-q3-chip" />
      <span className="h-2 w-[260px] max-w-full rounded bg-q3-chip" />
      <span className="h-2 w-[280px] max-w-full rounded bg-q3-chip" />
      <p className="mt-auto text-center text-xs text-q3-muted">Preview not available — download to view</p>
    </div>
  );
}
