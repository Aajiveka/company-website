import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, FileText, Inbox, Phone, Send, TriangleAlert, Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { Q3Shell } from '../components/Q3Shell';
import { ReturnToQ2Modal } from '../components/ReturnToQ2Modal';
import { useQ3Toast } from '../components/q3-toast-context';
import {
  Avatar,
  CardHeader,
  CardMessage,
  IconTile,
  Pill,
  Q3Button,
  Q3Card,
  Q3Checkbox,
  SkeletonRows,
  TableHead,
} from '../components/primitives';
import { useForwardCvs, useQ3Referrals } from '../q3.api';
import { dot, expLabel, fmtDayTime } from '../q3.format';
import type { ReferralBatch, ReferredRow } from '../q3.types';

const COLS = 'grid grid-cols-[30px_minmax(0,1fr)_108px_92px_96px_150px] items-center';
const cvs = (n: number) => `${n} CV${n === 1 ? '' : 's'}`;

/** A CV without a file cannot go to a company — it can only go back to Q2. */
const selectable = (b: ReferralBatch) => b.rows.filter((r) => r.hasCv).map((r) => r.referralId);

/**
 * 02 · Referred CVs — Q3's validation inbox. Each batch is one job's referrals from Q2;
 * valid CVs are forwarded to the company (starting its 14-day review window), the rest go
 * back to Q2 with a reason.
 *
 * Every row with a CV starts selected: the common case is "forward all that can be
 * forwarded", and the coordinator unticks the odd one out.
 */
export default function Q3ReferredCvsPage() {
  const toast = useQ3Toast();
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQ3Referrals();
  const forward = useForwardCvs();

  const [activeId, setActiveId] = useState<string | null>(null);
  /** Per-batch picks; a batch without an entry uses the default (all rows with a CV). */
  const [picks, setPicks] = useState<Record<string, number[]>>({});
  const [returning, setReturning] = useState<ReferredRow[] | null>(null);
  /** Which Forward button started the pending request — 'batch' or a row's referralId. */
  const [source, setSource] = useState<'batch' | number | null>(null);

  const batches = data?.batches ?? [];
  const batch = batches.find((b) => b.batchId === activeId) ?? batches[0];

  const allowed = batch ? selectable(batch) : [];
  // Intersect with the live rows, so a refetch that drops a row also drops it from the pick.
  const selected = batch ? (picks[batch.batchId] ?? allowed).filter((id) => allowed.includes(id)) : [];
  const allSelected = allowed.length > 0 && selected.length === allowed.length;
  const k = selected.length;

  const setSelected = (ids: number[]) => batch && setPicks((p) => ({ ...p, [batch.batchId]: ids }));
  const toggleRow = (id: number, on: boolean) =>
    setSelected(on ? [...selected, id] : selected.filter((x) => x !== id));
  const toggleAll = () => setSelected(allSelected ? [] : allowed);

  async function doForward(ids: number[], from: 'batch' | number) {
    if (!batch || !ids.length) return;
    setSource(from);
    try {
      await forward.mutateAsync(ids);
      toast.success(`Forwarded to ${batch.company}`, `${cvs(ids.length)} · 14-day review window started`);
      navigate('/q3/company-review');
    } catch (err) {
      toast.error('Could not forward', getErrorMessage(err));
    }
  }

  function openBatchReturn() {
    if (!batch) return;
    const unselected = batch.rows.filter((r) => !selected.includes(r.referralId));
    setReturning(unselected.length ? unselected : batch.rows);
  }

  const batchPending = forward.isPending && source === 'batch';

  let body: React.ReactNode;
  if (isLoading) {
    body = (
      <>
        <Q3Card className="h-20 animate-pulse" aria-hidden />
        <Q3Card>
          <CardHeader title="Referred CVs" subtitle="Loading referrals…" />
          <SkeletonRows rows={5} className="border-t border-q3-line" />
        </Q3Card>
      </>
    );
  } else if (isError) {
    body = (
      <Q3Card>
        <CardMessage
          icon={TriangleAlert}
          title="Could not load the referrals"
          body="Check your connection and try again."
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      </Q3Card>
    );
  } else if (!batch) {
    body = (
      <Q3Card>
        <CardMessage icon={Inbox} title="No referrals waiting" body="When Q2 forwards a CV it lands here for validation." />
      </Q3Card>
    );
  } else {
    body = (
      <>
        {/* Batch header */}
        <Q3Card className="flex flex-wrap items-center gap-3.5 px-5 py-[18px]">
          <IconTile icon={Inbox} tone="blue" size={42} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-base font-semibold leading-[19px] text-q3-ink">Referral batch {batch.batchId}</h2>
              <Pill tone="gray" dot={false} className="text-q3-ink-mid">
                {cvs(batch.rows.length)}
              </Pill>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] leading-[15px] text-q3-muted">
              <span>Referred by {batch.referredBy} (Q2)</span>
              <span className="text-q3-muted-light" aria-hidden>
                ·
              </span>
              <span>{fmtDayTime(batch.referredAt)}</span>
              <span className="text-q3-muted-light" aria-hidden>
                ·
              </span>
              <span className="font-medium text-q3-ink-soft">
                For {batch.company} — {batch.jobTitle}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <Q3Button icon={Undo2} onClick={openBatchReturn} disabled={!batch.rows.length || forward.isPending}>
              Return to Q2
            </Q3Button>
            <Q3Button
              variant="primary"
              icon={Send}
              disabled={k === 0 || (forward.isPending && !batchPending)}
              loading={batchPending}
              onClick={() => void doForward(selected, 'batch')}
            >
              Forward {k} to company
            </Q3Button>
          </div>
        </Q3Card>

        {/* Batch switch */}
        {batches.length > 1 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-[12.5px] font-semibold leading-[15px] text-q3-muted">Batches</span>
            {batches.map((b) => {
              const on = b.batchId === batch.batchId;
              return (
                <button
                  key={b.batchId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setActiveId(b.batchId)}
                  className={cn(
                    'rounded-lg px-[11px] py-1.5 text-[12.5px] leading-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
                    on
                      ? 'bg-q3-blue font-semibold text-white'
                      : 'border border-q3-line bg-q3-surface font-medium text-q3-ink-soft hover:bg-q3-field',
                  )}
                >
                  {b.batchId} · {b.rows.length}
                </button>
              );
            })}
          </div>
        )}

        {/* Table */}
        <Q3Card className="overflow-hidden">
          <CardHeader
            title="Referred CVs"
            subtitle={`Forward valid CVs directly, or return the batch to Q2 · ${k} of ${batch.rows.length} selected`}
          >
            <Q3Button size="sm" variant="soft" icon={Check} onClick={toggleAll} disabled={!allowed.length}>
              {allSelected ? 'Clear' : 'Select all'}
            </Q3Button>
          </CardHeader>
          {batch.rows.length === 0 ? (
            <CardMessage icon={Inbox} title="This batch is empty" body="Every CV in it has been forwarded or returned." />
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[860px]">
                <TableHead className={COLS}>
                  <Q3Checkbox
                    checked={allSelected}
                    onChange={toggleAll}
                    disabled={!allowed.length}
                    aria-label="Select all CVs with a file"
                  />
                  <span>Candidate</span>
                  <span>CV</span>
                  <span>Contact</span>
                  <span>Profile</span>
                  <span className="text-right">Action</span>
                </TableHead>
                <ul>
                  {batch.rows.map((r) => (
                    <CvRow
                      key={r.referralId}
                      row={r}
                      checked={selected.includes(r.referralId)}
                      onCheck={(on) => toggleRow(r.referralId, on)}
                      onForward={() => void doForward([r.referralId], r.referralId)}
                      onReturn={() => setReturning([r])}
                      forwarding={forward.isPending && source === r.referralId}
                      busy={forward.isPending}
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Q3Card>
      </>
    );
  }

  return (
    <Q3Shell title="Referred CVs" subtitle="Forward valid CVs from Q2 to the company, or return the batch to Q2">
      <div className="space-y-5">{body}</div>
      {batch && (
        <ReturnToQ2Modal
          open={returning != null}
          onClose={() => setReturning(null)}
          batch={batch}
          rows={returning ?? []}
        />
      )}
    </Q3Shell>
  );
}

function CvRow({
  row,
  checked,
  onCheck,
  onForward,
  onReturn,
  forwarding,
  busy,
}: {
  row: ReferredRow;
  checked: boolean;
  onCheck: (on: boolean) => void;
  onForward: () => void;
  onReturn: () => void;
  forwarding: boolean;
  busy: boolean;
}) {
  const p = Math.max(0, Math.min(100, Math.round(row.profileCompleteness)));
  const bar = p >= 100 ? 'bg-q3-green' : p >= 50 ? 'bg-q3-blue' : 'bg-q3-amber';
  return (
    <li className={cn(COLS, 'border-b border-q3-line px-5 py-3.5 transition last:border-b-0 hover:bg-q3-blue-wash')}>
      <Q3Checkbox
        checked={row.hasCv && checked}
        disabled={!row.hasCv}
        onChange={onCheck}
        aria-label={row.hasCv ? `Select ${row.name}` : `${row.name} has no CV and cannot be forwarded`}
      />
      <div className="flex min-w-0 items-center gap-2">
        <Avatar name={row.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-[17px] text-q3-ink">{row.name}</p>
          <p className="mt-px truncate text-xs leading-[15px] text-q3-muted">{dot(row.designation, expLabel(row.totalExp))}</p>
        </div>
      </div>
      {row.hasCv ? (
        <span className="flex items-center gap-2 text-[12.5px] font-semibold leading-[15px] text-q3-green">
          <FileText className="h-[15px] w-[15px]" aria-hidden /> Available
        </span>
      ) : (
        <span className="flex items-center gap-2 text-[12.5px] font-semibold leading-[15px] text-q3-amber">
          <TriangleAlert className="h-[15px] w-[15px]" aria-hidden /> Missing
        </span>
      )}
      {row.contactVerified ? (
        <span className="flex items-center gap-2 text-[12.5px] font-medium leading-[15px] text-q3-ink-soft">
          <Phone className="h-3.5 w-3.5 text-q3-green" aria-hidden /> Verified
        </span>
      ) : (
        <span className="flex items-center gap-2 text-[12.5px] font-medium leading-[15px] text-q3-amber">
          <Phone className="h-3.5 w-3.5" aria-hidden /> Unverified
        </span>
      )}
      <div className="w-[72px]">
        <p className="text-xs font-semibold leading-[15px] text-q3-ink-soft">{p}%</p>
        <div
          className="mt-[5px] h-1.5 rounded-[3px] bg-q3-track"
          role="progressbar"
          aria-valuenow={p}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${row.name}'s profile completeness`}
        >
          <div className={cn('h-full rounded-[3px]', bar)} style={{ width: `${p}%` }} />
        </div>
      </div>
      <div className="flex justify-end">
        {row.hasCv ? (
          <Q3Button
            size="sm"
            variant="soft"
            icon={Send}
            className="gap-1.5"
            loading={forwarding}
            disabled={busy && !forwarding}
            onClick={onForward}
            aria-label={`Forward ${row.name} to the company`}
          >
            Forward
          </Q3Button>
        ) : (
          <Q3Button
            size="sm"
            icon={Undo2}
            className="gap-1.5"
            disabled={busy}
            onClick={onReturn}
            aria-label={`Return ${row.name} to Q2`}
          >
            Return to Q2
          </Q3Button>
        )}
      </div>
    </li>
  );
}
