import { useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
  Award,
  Building2,
  Check,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  RefreshCw,
  Send,
  Upload,
  UserCheck,
  X,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import {
  useApproveDocuments,
  useForwardDocuments,
  useMarkJoined,
  useQ3Documents,
  useRequestDocuments,
  useSendBackDocument,
  useVerifyDocument,
} from '../q3.api';
import { dot, expLabel, firstName, fmtDay, fmtSize, fmtWeekday, type Tone } from '../q3.format';
import type { DocumentState, DocumentsDetail, Q3Document } from '../q3.types';
import { Crumbs, Q3Shell } from '../components/Q3Shell';
import { Q3Modal } from '../components/Q3Modal';
import { QueueIndex, QueueSwitcher } from '../components/QueueSwitcher';
import { DocumentPreviewModal } from '../components/DocumentPreviewModal';
import { GenerateOfferModal } from '../components/GenerateOfferModal';
import {
  Avatar,
  CardMessage,
  Pill,
  Q3Button,
  Q3Card,
  Q3Checkbox,
  SectionLabel,
  SkeletonRows,
  Stepper,
  fieldClass,
} from '../components/primitives';
import { useQ3Toast } from '../components/q3-toast-context';

/** The design's labels. The API's `step` is the current one (1-based); 8 means all done. */
const STEPS = ['Uploaded', 'Q3 verify', 'Forwarded', 'Company approval', 'Offer letter', 'Accepted', 'Joining'];

const STATE_PILL: Record<DocumentState, { label: string; tone: Tone }> = {
  Verified: { label: 'Verified', tone: 'green' },
  Uploaded: { label: 'Uploaded · verify', tone: 'blue' },
  NeedsCorrection: { label: 'Needs correction', tone: 'amber' },
  Missing: { label: 'Missing', tone: 'red' },
};

const SEND_BACK_REASONS = ['Blurry scan', 'Wrong document', 'Expired', 'Incomplete'];

/** A YYYY-MM-DD from the API, as local midnight — `new Date('2026-10-30')` would be UTC. */
const localDay = (ymd: string) => new Date(`${ymd.slice(0, 10)}T00:00:00`);

/** "Thu, 02 Oct" — the request message and toast spell the due day with a comma. */
const dueLabel = (d: string | Date) => fmtWeekday(d).replace(' ', ', ');

/** "a, b and c" */
const joinAnd = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

/**
 * Documents & Offer (Figma "06 · Documents & Offer") — the selected candidate's papers, Q3's
 * verification, the hand-off to the company and the offer through to joining. Serves both the
 * Documents and the Offers & Joining queues; only the crumb and the queue differ.
 */
export default function Q3DocumentsPage() {
  const { mapId = '' } = useParams();
  const offers = useLocation().pathname.startsWith('/q3/offers');
  if (!mapId) {
    return offers ? (
      <QueueIndex
        name="offers"
        title="Documents & Offer"
        subtitle="Offers & Joining"
        emptyTitle="No offers in progress"
        emptyBody="Candidates whose documents the company approved appear here until they join."
      />
    ) : (
      <QueueIndex
        name="documents"
        title="Documents & Offer"
        subtitle="Documents"
        emptyTitle="No documents pending"
        emptyBody="Selected candidates collecting their joining documents appear here."
      />
    );
  }
  return <DocumentsDetailView key={mapId} mapId={mapId} offers={offers} />;
}

function DocumentsDetailView({ mapId, offers }: { mapId: string; offers: boolean }) {
  const { data, isLoading, isError, refetch } = useQ3Documents(mapId);
  const root = offers ? 'Offers & Joining' : 'Documents';
  const rootTo = offers ? '/q3/offers' : '/q3/documents';

  const subtitle = data ? (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <Crumbs root={root} rootTo={rootTo}>
        {data.candidate.name} · {data.company} — {data.jobTitle}
      </Crumbs>
      <QueueSwitcher name={offers ? 'offers' : 'documents'} mapId={data.mapId} />
    </span>
  ) : (
    <Crumbs root={root} rootTo={rootTo} />
  );

  return (
    <Q3Shell title="Documents & Offer" subtitle={subtitle}>
      {isLoading ? (
        <Q3Card>
          <SkeletonRows rows={5} />
        </Q3Card>
      ) : isError || !data ? (
        <Q3Card>
          <CardMessage
            title="Couldn't load this application"
            body="Check your connection and try again."
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        </Q3Card>
      ) : (
        <Detail detail={data} />
      )}
    </Q3Shell>
  );
}

function Detail({ detail }: { detail: DocumentsDetail }) {
  const toast = useQ3Toast();
  const request = useRequestDocuments(detail.mapId);
  const [preview, setPreview] = useState<Q3Document | null>(null);

  // The request panel's state lives here: a row's "Re-request" sends the panel's message.
  const requestable = detail.documents.filter((d) => d.state === 'Missing' || d.state === 'NeedsCorrection');
  const [excluded, setExcluded] = useState<Set<number>>(new Set());
  const included = requestable.filter((d) => !excluded.has(d.documentTypeId));
  const [custom, setCustom] = useState<string | null>(null);
  const [email, setEmail] = useState(true);
  const [whatsapp, setWhatsapp] = useState(true);

  const due = detail.docsDueAt ? localDay(detail.docsDueAt) : new Date(Date.now() + 3 * 86_400_000);
  const autoMessage = included.length
    ? `Hi ${firstName(detail.candidate.name)}, congratulations again! Please upload ${joinAnd(
        included.map((d) => d.name.toLowerCase()),
      )} by ${dueLabel(due)}.`
    : '';
  const message = custom ?? autoMessage;

  const sendRequest = (documentTypeIds: number[], channels: { email: boolean; whatsapp: boolean }) =>
    request.mutate(
      { documentTypeIds, message: message.trim(), ...channels },
      {
        onSuccess: (res) =>
          toast.success('Request sent to candidate', dot(res.channels, res.dueAt ? `due ${dueLabel(localDay(res.dueAt))}` : null)),
        onError: (err) => toast.error("Couldn't send the request", getErrorMessage(err)),
      },
    );

  return (
    <div className="flex flex-col gap-5">
      <HeaderCard detail={detail} />
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
        <DocumentsCard
          detail={detail}
          onView={setPreview}
          onReRequest={(d) => sendRequest([d.documentTypeId], { email: true, whatsapp })}
          reRequesting={request.isPending ? (request.variables?.documentTypeIds.length === 1 ? request.variables.documentTypeIds[0] : null) : null}
        />
        <div className="flex flex-col gap-5">
          <RequestCard
            requestable={requestable}
            excluded={excluded}
            onToggle={(id) => {
              setExcluded((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
            message={message}
            onMessage={setCustom}
            email={email}
            whatsapp={whatsapp}
            onEmail={setEmail}
            onWhatsapp={setWhatsapp}
            sending={request.isPending && (request.variables?.documentTypeIds.length ?? 0) !== 1}
            disabled={request.isPending}
            onSend={() => sendRequest(included.map((d) => d.documentTypeId), { email, whatsapp })}
            canSend={included.length > 0 && (email || whatsapp) && !!message.trim()}
          />
          <OfferCard detail={detail} />
        </div>
      </div>
      <DocumentPreviewModal doc={preview} candidateName={detail.candidate.name} onClose={() => setPreview(null)} />
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────

function HeaderCard({ detail }: { detail: DocumentsDetail }) {
  const c = detail.candidate;
  const round = detail.roundLabel === 'Final' ? 'Final round' : detail.roundLabel;
  return (
    <Q3Card className="flex flex-col gap-5 px-5 py-[18px]">
      <div className="flex flex-wrap items-center gap-3.5">
        <Avatar name={c.name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold leading-[21px] text-q3-ink">{c.name}</h2>
            {detail.selectedAt && <Pill tone="green">{round ? `Selected · ${round}` : 'Selected'}</Pill>}
          </div>
          <p className="mt-1 text-[12.5px] leading-[15px] text-q3-muted">{dot(c.designation, expLabel(c.totalExp), c.location)}</p>
        </div>
        {detail.docsRequestedAt && (
          <span className="inline-flex items-center gap-2 rounded-lg border border-q3-line bg-q3-field px-3 py-2 text-xs font-medium leading-[15px] text-q3-ink-soft">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {detail.company} requested documents · {fmtDay(detail.docsRequestedAt)}
          </span>
        )}
      </div>
      {/* Seven labels don't fit a phone; scroll them rather than let them overlap. */}
      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <Stepper steps={STEPS} current={detail.step} />
        </div>
      </div>
    </Q3Card>
  );
}

// ── Candidate documents ────────────────────────────────────────────────

function DocumentsCard({
  detail,
  onView,
  onReRequest,
  reRequesting,
}: {
  detail: DocumentsDetail;
  onView: (d: Q3Document) => void;
  onReRequest: (d: Q3Document) => void;
  reRequesting: number | null;
}) {
  const toast = useQ3Toast();
  const verify = useVerifyDocument();
  const forward = useForwardDocuments(detail.mapId);
  const approve = useApproveDocuments(detail.mapId);
  const [approveOpen, setApproveOpen] = useState(false);
  const [sendBack, setSendBack] = useState<Q3Document | null>(null);
  const { verified, total } = detail.counts;
  const pct = total ? Math.round((verified / total) * 100) : 0;

  const doVerify = (d: Q3Document) =>
    d.docUploadId != null &&
    verify.mutate(d.docUploadId, {
      onSuccess: (res) => toast.success('Document verified', `${res.name} · ${res.verified} of ${res.total} verified`),
      onError: (err) => toast.error("Couldn't verify the document", getErrorMessage(err)),
    });

  const doForward = () =>
    forward.mutate(undefined, {
      onSuccess: (res) =>
        toast.success(`Forwarded to ${res.company}`, `${res.forwarded} verified document${res.forwarded === 1 ? '' : 's'}`),
      onError: (err) => toast.error("Couldn't forward the documents", getErrorMessage(err)),
    });

  const doApprove = () =>
    approve.mutate(undefined, {
      onSuccess: () => {
        setApproveOpen(false);
        toast.success('Documents approved', 'Offer letter unlocked');
      },
      onError: (err) => toast.error("Couldn't record the approval", getErrorMessage(err)),
    });

  // The header slot follows the hand-off: forward → record approval → approved.
  const headerAction = !detail.docsForwardedAt ? (
    <Q3Button
      variant="primary"
      icon={Send}
      className="gap-1.5"
      disabled={total === 0 || verified !== total}
      title={verified !== total ? 'Verify every document before forwarding' : undefined}
      loading={forward.isPending}
      onClick={doForward}
    >
      Forward to company
    </Q3Button>
  ) : !detail.docsApprovedAt ? (
    <Q3Button variant="primary" icon={CheckCircle2} className="gap-1.5" onClick={() => setApproveOpen(true)}>
      Record company approval
    </Q3Button>
  ) : (
    <Pill tone="green">Approved by {detail.company}</Pill>
  );

  return (
    <Q3Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-3.5 px-5 py-[18px]">
        <div className="min-w-[13rem] flex-1">
          <h2 className="text-base font-semibold leading-[19px] text-q3-ink">Candidate documents</h2>
          <div className="mt-[5px] flex items-center gap-2.5">
            <span className="text-[12.5px] font-medium leading-[15px] text-q3-muted">
              {verified} of {total} verified
            </span>
            <span
              className="h-1.5 w-[120px] overflow-hidden rounded-full bg-q3-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={verified}
              aria-label="Documents verified"
            >
              <span className="block h-full rounded-full bg-q3-green transition-[width]" style={{ width: `${pct}%` }} />
            </span>
          </div>
        </div>
        {headerAction}
      </div>

      {detail.documents.length === 0 ? (
        <div className="border-t border-q3-line">
          <CardMessage icon={FileText} title="No documents requested yet" body="Use the request panel to ask the candidate for documents." />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[minmax(0,1fr)_96px_150px_132px] border-y border-q3-line bg-q3-head px-5 py-2.5 text-[11px] font-semibold uppercase leading-[13px] tracking-[0.6px] text-q3-muted">
              <span>Document</span>
              <span>Uploaded</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            <ul className="divide-y divide-q3-line">
              {detail.documents.map((d) => (
                <DocumentRow
                  key={d.documentTypeId}
                  doc={d}
                  onView={() => onView(d)}
                  onVerify={() => doVerify(d)}
                  verifying={verify.isPending && verify.variables === d.docUploadId}
                  onSendBack={() => setSendBack(d)}
                  onReRequest={() => onReRequest(d)}
                  reRequesting={reRequesting === d.documentTypeId}
                />
              ))}
            </ul>
          </div>
        </div>
      )}

      <Q3Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        width={440}
        title="Record company approval"
        footer={
          <>
            <Q3Button onClick={() => setApproveOpen(false)}>Cancel</Q3Button>
            <Q3Button variant="primary" icon={CheckCircle2} loading={approve.isPending} onClick={doApprove}>
              Approve
            </Q3Button>
          </>
        }
      >
        <p className="text-[13px] leading-5 text-q3-ink-soft">
          Has {detail.company} approved all documents? This unlocks the offer letter.
        </p>
      </Q3Modal>

      <SendBackModal key={sendBack?.docUploadId ?? 'none'} doc={sendBack} onClose={() => setSendBack(null)} />
    </Q3Card>
  );
}

function DocumentRow({
  doc: d,
  onView,
  onVerify,
  verifying,
  onSendBack,
  onReRequest,
  reRequesting,
}: {
  doc: Q3Document;
  onView: () => void;
  onVerify: () => void;
  verifying: boolean;
  onSendBack: () => void;
  onReRequest: () => void;
  reRequesting: boolean;
}) {
  const pill = STATE_PILL[d.state];
  const uploaded = d.docUploadId != null;
  const sub =
    d.state === 'NeedsCorrection' ? (
      <span className="text-q3-amber">{dot(d.fileName, d.comment)}</span>
    ) : uploaded ? (
      dot(d.fileName, fmtSize(d.sizeBytes))
    ) : (
      'Not uploaded yet'
    );

  return (
    <li
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_96px_150px_132px] items-center px-5 py-3',
        d.state === 'Uploaded' && 'bg-q3-blue-wash',
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]',
            uploaded ? 'bg-q3-blue-soft text-q3-blue' : 'bg-q3-chip text-q3-muted',
          )}
          aria-hidden
        >
          <FileText className="h-[15px] w-[15px]" />
        </span>
        <div className="min-w-0 pr-3">
          {uploaded ? (
            <button
              type="button"
              onClick={onView}
              className="block max-w-full truncate rounded text-left text-[13.5px] font-semibold leading-4 text-q3-ink hover:text-q3-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40"
              title={`Preview ${d.name}`}
            >
              {d.name}
            </button>
          ) : (
            <p className="truncate text-[13.5px] font-semibold leading-4 text-q3-ink">{d.name}</p>
          )}
          <p className="mt-px truncate text-xs leading-[15px] text-q3-muted">{sub}</p>
        </div>
      </div>
      <span className="text-[12.5px] leading-[15px] text-q3-ink-soft">{d.uploadedAt ? fmtDay(d.uploadedAt) : '—'}</span>
      <span>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </span>
      <div className="flex items-center gap-1.5">
        {d.state === 'Verified' && (
          <Q3Button size="sm" icon={Eye} className="min-h-[29px] gap-1.5 px-2.5" disabled={!uploaded} onClick={onView}>
            View
          </Q3Button>
        )}
        {d.state === 'Uploaded' && (
          <>
            <Q3Button
              size="sm"
              icon={Check}
              className="gap-1.5 bg-q3-green-soft px-2.5 text-q3-green hover:bg-q3-green/15 disabled:opacity-55"
              variant="ghost"
              loading={verifying}
              onClick={onVerify}
            >
              Verify
            </Q3Button>
            <button
              type="button"
              onClick={onSendBack}
              aria-label="Send back for correction"
              title="Send back for correction"
              className="inline-flex h-7 w-9 items-center justify-center rounded-lg border border-q3-red-line bg-q3-surface text-q3-red transition hover:bg-q3-red-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-red/40"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </>
        )}
        {(d.state === 'NeedsCorrection' || d.state === 'Missing') && (
          <Q3Button size="sm" variant="soft" icon={RefreshCw} className="gap-1.5 px-2.5" loading={reRequesting} onClick={onReRequest}>
            Re-request
          </Q3Button>
        )}
      </div>
    </li>
  );
}

/** "Send back for correction" — the reason travels to the candidate with the re-upload ask. */
function SendBackModal({ doc, onClose }: { doc: Q3Document | null; onClose: () => void }) {
  const toast = useQ3Toast();
  const sendBack = useSendBackDocument();
  const [comment, setComment] = useState('');
  const [touched, setTouched] = useState(false);
  const empty = !comment.trim();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (empty || doc?.docUploadId == null) return;
    sendBack.mutate(
      { docUploadId: doc.docUploadId, comment: comment.trim() },
      {
        onSuccess: () => {
          toast.success('Sent back for correction', 'Candidate asked to re-upload');
          onClose();
        },
        onError: (err) => toast.error("Couldn't send it back", getErrorMessage(err)),
      },
    );
  };

  return (
    <Q3Modal
      open={!!doc}
      onClose={onClose}
      width={480}
      title="Send back for correction"
      subtitle={doc ? dot(doc.name, doc.fileName) : undefined}
      footer={
        <>
          <Q3Button onClick={onClose}>Cancel</Q3Button>
          <Q3Button type="submit" form="q3-send-back" variant="danger" icon={X} loading={sendBack.isPending}>
            Send back
          </Q3Button>
        </>
      }
    >
      <form id="q3-send-back" onSubmit={submit} noValidate className="flex flex-col gap-3">
        <SectionLabel>Quick reasons</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {SEND_BACK_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setComment(r)}
              aria-pressed={comment === r}
              className={cn(
                'rounded-full px-2.5 py-[5px] text-xs font-medium leading-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
                comment === r ? 'bg-q3-blue-soft text-q3-blue' : 'bg-q3-chip text-q3-ink-soft hover:bg-q3-track',
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <label htmlFor="q3-send-back-comment" className="mt-1 text-[12.5px] font-semibold leading-[15px] text-q3-ink-soft">
          What needs fixing
        </label>
        <input
          id="q3-send-back-comment"
          className={fieldClass}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="e.g. Blurry scan — please upload a clearer copy"
          aria-invalid={touched && empty}
        />
        {touched && empty && <p className="text-xs text-q3-red">Tell the candidate what to fix.</p>}
      </form>
    </Q3Modal>
  );
}

// ── Request panel ──────────────────────────────────────────────────────

function RequestCard({
  requestable,
  excluded,
  onToggle,
  message,
  onMessage,
  email,
  whatsapp,
  onEmail,
  onWhatsapp,
  sending,
  disabled,
  canSend,
  onSend,
}: {
  requestable: Q3Document[];
  excluded: Set<number>;
  onToggle: (id: number) => void;
  message: string;
  onMessage: (v: string) => void;
  email: boolean;
  whatsapp: boolean;
  onEmail: (v: boolean) => void;
  onWhatsapp: (v: boolean) => void;
  sending: boolean;
  disabled: boolean;
  canSend: boolean;
  onSend: () => void;
}) {
  return (
    <Q3Card>
      <PanelHeader icon={Upload} tileClass="bg-q3-amber-soft text-q3-amber" title="Request missing / corrected docs" sub="Sent to candidate by Q3" />
      <div className="flex flex-col gap-3 px-5 py-4">
        <SectionLabel>Include</SectionLabel>
        {requestable.length === 0 ? (
          <p className="text-[12.5px] leading-[15px] text-q3-muted">All requested documents are in</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {requestable.map((d) => {
                const on = !excluded.has(d.documentTypeId);
                return (
                  <button
                    key={d.documentTypeId}
                    type="button"
                    onClick={() => onToggle(d.documentTypeId)}
                    aria-pressed={on}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-[5px] text-xs font-medium leading-[15px] transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
                      on ? 'bg-q3-blue-soft text-q3-blue' : 'border border-q3-line bg-q3-surface text-q3-muted hover:bg-q3-field',
                    )}
                  >
                    {on && <Check className="h-3 w-3" aria-hidden />}
                    {d.name}
                  </button>
                );
              })}
            </div>
            <label htmlFor="q3-doc-request-message" className="sr-only">
              Message to the candidate
            </label>
            <textarea
              id="q3-doc-request-message"
              rows={3}
              value={message}
              onChange={(e) => onMessage(e.target.value)}
              className={cn(fieldClass, 'resize-y rounded-[9px] leading-[18px]')}
            />
            <div className="flex flex-wrap items-center gap-4">
              <Q3Checkbox size={16} checked={email} onChange={onEmail} label={<span className="text-[12.5px] font-medium text-q3-ink-soft">Email</span>} />
              <Q3Checkbox
                size={16}
                checked={whatsapp}
                onChange={onWhatsapp}
                label={<span className="text-[12.5px] font-medium text-q3-ink-soft">WhatsApp</span>}
              />
            </div>
          </>
        )}
      </div>
      <div className="border-t border-q3-line px-5 py-3.5">
        <Q3Button
          variant="primary"
          icon={Send}
          className="w-full gap-1.5"
          disabled={!canSend || (disabled && !sending)}
          loading={sending}
          onClick={onSend}
        >
          Send request to candidate
        </Q3Button>
      </div>
    </Q3Card>
  );
}

function PanelHeader({
  icon: Icon,
  tileClass,
  title,
  sub,
  children,
}: {
  icon: typeof Upload;
  tileClass: string;
  title: string;
  sub: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-q3-line px-5 py-[18px]">
      <span className={cn('inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px]', tileClass)} aria-hidden>
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold leading-[18px] text-q3-ink">{title}</h2>
        <p className="mt-0.5 text-xs leading-[15px] text-q3-muted">{sub}</p>
      </div>
      {children}
    </div>
  );
}

// ── Offer & joining ────────────────────────────────────────────────────

function OfferCard({ detail }: { detail: DocumentsDetail }) {
  const toast = useQ3Toast();
  const joined = useMarkJoined(detail.mapId);
  const [offerOpen, setOfferOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const approved = !!detail.docsApprovedAt;
  const offer = detail.offer;
  const isJoined = !!detail.joinedAt;
  const first = firstName(detail.candidate.name);

  const rows: Array<{ label: string; right: string; rightClass?: string; done: boolean; active: boolean }> = [
    {
      label: 'Offer letter generation',
      right: !approved ? 'Waiting for approval' : !offer ? 'Ready' : offer.sentAt ? `Sent ${fmtDay(offer.sentAt)}` : 'Draft',
      rightClass: approved && !offer ? 'text-q3-blue font-medium' : undefined,
      done: !!offer,
      active: approved && !offer,
    },
    {
      label: 'Candidate accepts offer',
      right: !offer
        ? '—'
        : offer.status === 'Accepted'
          ? `Accepted${offer.respondedAt ? ` ${fmtDay(offer.respondedAt)}` : ''}`
          : offer.status === 'Rejected'
            ? 'Declined'
            : offer.status === 'Expired'
              ? 'Expired'
              : 'Awaiting response',
      rightClass:
        offer?.status === 'Accepted'
          ? 'text-q3-green font-medium'
          : offer?.status === 'Rejected' || offer?.status === 'Expired'
            ? 'text-q3-red font-medium'
            : undefined,
      done: offer?.status === 'Accepted',
      active: !!offer && (offer.status === 'Sent' || offer.status === 'Draft'),
    },
    {
      label: 'Joining process',
      right: isJoined
        ? `Joined ${fmtDay(detail.joinedAt!)}`
        : offer?.joiningDate
          ? `Target joining · ${fmtDay(localDay(offer.joiningDate))}`
          : '—',
      rightClass: isJoined ? 'text-q3-green font-medium' : undefined,
      done: isJoined,
      active: offer?.status === 'Accepted' && !isJoined,
    },
  ];

  const markJoined = () =>
    joined.mutate(undefined, {
      onSuccess: () => {
        setJoinOpen(false);
        toast.success(`${first} has joined`, `${detail.company} · ${fmtDay(new Date())}`);
      },
      onError: (err) => toast.error("Couldn't mark as joined", getErrorMessage(err)),
    });

  const footer = !approved ? (
    <Q3Button icon={FileText} className="min-h-[38px] w-full gap-1.5" disabled title="Unlocks after the company approves the documents">
      Generate offer letter
    </Q3Button>
  ) : !offer ? (
    <Q3Button variant="primary" icon={FileText} className="w-full gap-1.5" onClick={() => setOfferOpen(true)}>
      Generate offer letter
    </Q3Button>
  ) : isJoined ? (
    <Q3Button icon={UserCheck} className="min-h-[38px] w-full gap-1.5" disabled>
      Joined
    </Q3Button>
  ) : offer.status === 'Accepted' ? (
    <Q3Button variant="primary" icon={UserCheck} className="w-full gap-1.5" onClick={() => setJoinOpen(true)}>
      Mark as joined
    </Q3Button>
  ) : offer.status === 'Rejected' || offer.status === 'Expired' ? (
    <Q3Button className="min-h-[38px] w-full" disabled>
      Offer {offer.status === 'Rejected' ? 'declined' : 'expired'}
    </Q3Button>
  ) : (
    <Q3Button className="min-h-[38px] w-full" disabled>
      Waiting for candidate
    </Q3Button>
  );

  return (
    <Q3Card>
      <PanelHeader icon={Award} tileClass="bg-q3-green-soft text-q3-green" title="Offer & joining" sub="Unlocks after company approves documents">
        {!approved && <Lock className="h-4 w-4 shrink-0 text-q3-muted-light" aria-label="Locked" />}
      </PanelHeader>
      <ol className="flex flex-col gap-3 px-5 py-3.5">
        {rows.map((r, i) => (
          <li key={r.label} className="flex items-center gap-2.5">
            <span
              className={cn(
                'inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                r.done
                  ? 'bg-q3-green text-white'
                  : r.active
                    ? 'bg-q3-blue text-white'
                    : 'border-[1.5px] border-q3-line-strong bg-q3-surface text-q3-muted-light',
              )}
              aria-hidden
            >
              {r.done ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                'min-w-0 flex-1 truncate text-[13px] font-medium leading-4',
                r.done || r.active ? 'text-q3-ink-soft' : 'text-q3-muted',
              )}
            >
              {r.label}
            </span>
            <span className={cn('shrink-0 text-xs leading-[15px] text-q3-muted-light', r.rightClass)}>{r.right}</span>
          </li>
        ))}
      </ol>
      <div className="px-5 pb-4">{footer}</div>

      <GenerateOfferModal key={String(offerOpen)} open={offerOpen} onClose={() => setOfferOpen(false)} detail={detail} />
      <Q3Modal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        width={440}
        title="Mark as joined"
        footer={
          <>
            <Q3Button onClick={() => setJoinOpen(false)}>Cancel</Q3Button>
            <Q3Button variant="primary" icon={UserCheck} loading={joined.isPending} onClick={markJoined}>
              Mark as joined
            </Q3Button>
          </>
        }
      >
        <p className="text-[13px] leading-5 text-q3-ink-soft">
          Has {detail.candidate.name} joined {detail.company}? This closes the application as joined.
        </p>
      </Q3Modal>
    </Q3Card>
  );
}
