import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, Clock, FileX2, Inbox, Mail, Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { Crumbs, Q3Shell } from '../components/Q3Shell';
import { Avatar, CardHeader, CardMessage, KpiCard, Q3Button, Q3Card, SkeletonRows, TabChip, TableHead } from '../components/primitives';
import { Q2StatePill, ReturnReasonPill } from '../components/ReturnedPills';
import { ReturnMailModal } from '../components/ReturnMailModal';
import { useQ3Returned } from '../q3.api';
import { fmtDay, sentAt } from '../q3.format';
import type { ReturnedRow, ReturnedTab } from '../q3.types';

const TABS: Array<{ key: ReturnedTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'awaiting', label: 'Awaiting Q2' },
  { key: 'expired', label: 'Auto-expired' },
  { key: 'returned', label: 'Returned by Q3' },
];

const isTab = (v: string | null): v is ReturnedTab => TABS.some((t) => t.key === v);
const tabHref = (tab: ReturnedTab) => (tab === 'all' ? '/q3/returned' : `/q3/returned?tab=${tab}`);

const COLS = 'grid grid-cols-[minmax(226px,1fr)_214px_86px_172px_168px_120px_100px] items-center';

/**
 * 07 · Returned to Q2 — every CV that went back to Q2 in the last 30 days, whether Q3 returned
 * it at validation or the 14-day review window ran out. The tab lives in `?tab=` so the
 * dashboard's "View" on auto-expired CVs can deep-link to it.
 */
export default function Q3ReturnedPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: ReturnedTab = isTab(raw) ? raw : 'all';
  const setTab = (next: ReturnedTab) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (next === 'all') n.delete('tab');
        else n.set('tab', next);
        return n;
      },
      { replace: true },
    );

  const { data, isPending, isError, error, refetch } = useQ3Returned(tab);
  const [mailFor, setMailFor] = useState<number | null>(null);
  const k = data?.kpis;

  return (
    <Q3Shell
      title="Returned to Q2"
      subtitle={<Crumbs root="Returned to Q2">CVs sent back to Q2 with a status update</Crumbs>}
    >
      <div className="flex flex-col gap-5">
        {isError && !data ? null : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              to={tabHref('awaiting')}
              icon={Undo2}
              tone="blue"
              value={k?.awaiting.value ?? 0}
              badge={k?.awaiting.today ? `${k.awaiting.today} returned today` : null}
              title="Awaiting Q2"
              help="Status mail sent · not yet acknowledged"
              loading={isPending}
            />
            <KpiCard
              to={tabHref('expired')}
              icon={Clock}
              tone="amber"
              value={k?.expired.value ?? 0}
              badge="Day 14"
              title="Auto-expired"
              help="Not shortlisted in the review window"
              loading={isPending}
            />
            <KpiCard
              to={tabHref('returned')}
              icon={FileX2}
              tone="red"
              value={k?.returnedAtValidation.value ?? 0}
              badge="last 30 days"
              title="Returned at validation"
              help="Missing CV, mismatch or duplicate"
              loading={isPending}
            />
          </div>
        )}

        <Q3Card className="min-w-0 overflow-hidden">
          <CardHeader
            title="Returned CVs"
            subtitle={
              data ? `${data.counts.all} in the last 30 days · Q2 can fix and re-refer any of them` : ' '
            }
          >
            <div className="flex max-w-full gap-2 overflow-x-auto" role="group" aria-label="Filter returned CVs">
              {TABS.map((t) => (
                <TabChip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                  {t.label}
                  {data ? ` · ${data.counts[t.key]}` : ''}
                </TabChip>
              ))}
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <div className="min-w-[1126px]">
              <TableHead className={cn(COLS, 'py-[15.5px]')}>
                <span>Candidate</span>
                <span>Referred for</span>
                <span>Returned</span>
                <span>Reason</span>
                <span>Status mail to Q2</span>
                <span>Q2</span>
                <span aria-hidden />
              </TableHead>

              {isPending ? (
                <SkeletonRows rows={5} />
              ) : isError ? (
                <CardMessage
                  icon={AlertCircle}
                  title="Couldn't load returned CVs"
                  body={getErrorMessage(error)}
                  action={{ label: 'Retry', onClick: () => void refetch() }}
                />
              ) : data.rows.length === 0 ? (
                <CardMessage
                  icon={Inbox}
                  title={tab === 'all' ? 'Nothing returned in the last 30 days' : 'No CVs in this tab'}
                  body={tab === 'all' ? 'CVs sent back to Q2 will show up here.' : undefined}
                  action={tab === 'all' ? undefined : { label: 'Show all', onClick: () => setTab('all') }}
                />
              ) : (
                <ul>
                  {data.rows.map((row) => (
                    <ReturnedRowItem key={row.referralId} row={row} onViewMail={() => setMailFor(row.referralId)} />
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 border-t border-q3-line bg-q3-amber-tint px-5 py-3.5">
            <Clock className="mt-px h-4 w-4 shrink-0 text-q3-amber" aria-hidden />
            <p className="text-[12.5px] leading-[15px] text-q3-ink-soft">
              Q2 gets an automatic status mail for every returned CV. Once Q2 fixes the issue and re-refers, the candidate
              re-enters at Referred CVs with a fresh 14-day window.
            </p>
          </div>
        </Q3Card>
      </div>

      <ReturnMailModal referralId={mailFor} onClose={() => setMailFor(null)} />
    </Q3Shell>
  );
}

/** Rows Q2 hasn't picked up yet carry the designs' blue wash, so they stand out. */
function ReturnedRowItem({ row, onViewMail }: { row: ReturnedRow; onViewMail: () => void }) {
  return (
    <li className={cn(COLS, 'border-b border-q3-line px-5 py-[13px] last:border-b-0', row.q2 === 'Awaiting' && 'bg-q3-blue-wash')}>
      <div className="flex min-w-0 items-center gap-2.5 pr-3">
        <Avatar name={row.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-[17px] text-q3-ink">{row.name}</p>
          <p className="mt-px truncate text-xs leading-[15px] text-q3-muted">{row.designation}</p>
        </div>
      </div>
      <div className="min-w-0 pr-3">
        <p className="truncate text-[13px] font-medium leading-4 text-q3-ink">{row.company}</p>
        <p className="mt-0.5 truncate text-xs leading-[15px] text-q3-muted">{row.jobTitle}</p>
      </div>
      <p className="text-[13px] font-medium leading-4 text-q3-ink">{fmtDay(row.returnedAt)}</p>
      <div>
        <ReturnReasonPill reason={row.reason} expired={row.expired} />
      </div>
      <div className="flex min-w-0 items-center gap-1.5 pr-2 text-xs leading-[15px]">
        {row.mailSentAt ? (
          <>
            <Mail className="h-3.5 w-3.5 shrink-0 text-q3-muted" aria-hidden />
            <span className="truncate text-q3-ink-soft">Sent {sentAt(row.mailSentAt)}</span>
          </>
        ) : (
          <span className="text-q3-muted">Not sent</span>
        )}
      </div>
      <div>
        <Q2StatePill state={row.q2} />
      </div>
      <div className="flex justify-end">
        <Q3Button size="sm" variant="soft" icon={Mail} onClick={onViewMail} aria-label={`View status mail for ${row.name}`}>
          View mail
        </Q3Button>
      </div>
    </li>
  );
}
