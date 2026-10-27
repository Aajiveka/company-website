import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Bell, Building2, Calendar, CircleCheck, Hourglass, Pencil, TriangleAlert, Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { useQ3Toast } from '../components/q3-toast-context';
import { ModeSegmented } from '../components/ModeSegmented';
import { Q3Shell } from '../components/Q3Shell';
import { RoundSetupModal } from '../components/RoundSetupModal';
import {
  Avatar,
  CardHeader,
  CardMessage,
  IconTile,
  Pill,
  Q3Button,
  Q3Card,
  SectionLabel,
  SkeletonRows,
  TabChip,
  TableHead,
} from '../components/primitives';
import { useQ3CompanyReview, useQ3Shortlist, useRemindExpiring } from '../q3.api';
import { TONE_PILL, TONE_TEXT, dot, expLabel, fmtDay, fmtDayTime, fmtTime, fmtWeekday, initialsOf, type Tone } from '../q3.format';
import type { CompanyReviewRow, CompanyReviewState, CompanyReviewTab, Q3Round, Shortlist } from '../q3.types';

const TABS: Array<{ key: CompanyReviewTab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'inReview', label: 'In review' },
  { key: 'shortlisted', label: 'Shortlisted' },
  { key: 'expiring', label: 'Expiring ≤ 2 days' },
  { key: 'expired', label: 'Auto-expired' },
];

const STATUS: Record<CompanyReviewState, { label: string; tone: Tone }> = {
  Shortlisted: { label: 'Shortlisted', tone: 'green' },
  SlotsAwaited: { label: 'Slots awaited', tone: 'violet' },
  Expiring: { label: 'Expiring', tone: 'red' },
  InReview: { label: 'In review', tone: 'amber' },
  AutoExpired: { label: 'Auto-expired', tone: 'red' },
};

const BAR: Record<Tone, string> = {
  green: 'bg-q3-green',
  red: 'bg-q3-red',
  amber: 'bg-q3-amber',
  blue: 'bg-q3-blue',
  violet: 'bg-q3-violet',
  gray: 'bg-q3-muted-light',
};

const COLS = 'grid grid-cols-[minmax(162px,1fr)_138px_86px_168px_120px] items-center';
const days = (n: number) => `${n} day${n === 1 ? '' : 's'}`;

/** The REVIEW WINDOW note and bar colour for a row. */
function windowNote(r: CompanyReviewRow): { note: string; tone: Tone } {
  if (r.state === 'Shortlisted' || r.state === 'SlotsAwaited') return { note: 'shortlisted', tone: 'green' };
  if (r.state === 'AutoExpired') return { note: 'to Q2', tone: 'gray' };
  const tone: Tone = r.daysLeft <= 1 || r.state === 'Expiring' ? 'red' : r.daysLeft <= 4 ? 'amber' : 'blue';
  return { note: `${days(r.daysLeft)} left`, tone };
}

/** "R1" → "Round 1", "Final" → "Final round". */
const roundLabel = (round: Q3Round) => (round.label === 'Final' ? 'Final round' : `Round ${round.roundNumber}`);

/**
 * 03 · Company Review — every CV with a company, on its 14-day clock. The tracker on the left
 * picks an application; the panel on the right shows what the company sent back (or that it
 * has not yet) and is where the coordinator captures the shortlist details.
 */
export default function Q3CompanyReviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<CompanyReviewTab>('all');
  const paramId = Number(params.get('mapId')) || null;
  const [picked, setPicked] = useState<number | null>(paramId);

  const { data, isLoading, isError, refetch, isPlaceholderData } = useQ3CompanyReview(tab);
  const rows = data?.rows ?? [];
  // Fall back to the first live row: an expired one has nothing to act on in the panel.
  const selected =
    rows.find((r) => r.mapId === picked) ?? rows.find((r) => r.state !== 'AutoExpired') ?? null;

  function open(r: CompanyReviewRow) {
    if (r.state === 'AutoExpired') navigate('/q3/returned?tab=expired');
    else setPicked(r.mapId);
  }

  let table: React.ReactNode;
  if (isLoading) table = <SkeletonRows rows={6} className="border-t border-q3-line" />;
  else if (isError)
    table = (
      <CardMessage
        icon={TriangleAlert}
        title="Could not load the review tracker"
        body="Check your connection and try again."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    );
  else if (!rows.length)
    table = (
      <CardMessage
        icon={Hourglass}
        title={tab === 'all' ? 'No CVs with companies' : 'Nothing in this view'}
        body={tab === 'all' ? 'Forwarded CVs appear here with their 14-day review window.' : 'Try another tab.'}
      />
    );
  else
    table = (
      <div className={cn('overflow-x-auto transition-opacity', isPlaceholderData && 'opacity-60')}>
        <div className="min-w-[714px]">
          <TableHead className={COLS}>
            <span>Candidate</span>
            <span>Company</span>
            <span>Forwarded</span>
            <span>Review window</span>
            <span>Status</span>
          </TableHead>
          <ul>
            {rows.map((r) => (
              <li key={r.mapId} className="border-b border-q3-line last:border-b-0">
                <TrackerRow row={r} active={selected?.mapId === r.mapId} onOpen={() => open(r)} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    );

  return (
    <Q3Shell title="Company Review" subtitle="Track the 14-day review window and capture shortlist details from companies">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by review state">
          {TABS.map((t) => (
            <TabChip key={t.key} variant="outlined" active={tab === t.key} onClick={() => setTab(t.key)} count={data?.counts[t.key]}>
              {t.label}
            </TabChip>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
          <Q3Card className="overflow-hidden">
            <CardHeader title="Review window tracker" subtitle="Forwarded CVs · Day 1 starts on forwarding">
              {(data?.counts.expiring ?? 0) > 0 && <RemindExpiringButton />}
            </CardHeader>
            {table}
          </Q3Card>
          <ShortlistPanel
            row={selected}
            listLoading={isLoading}
            // A captured shortlist leaves "In review" / "Expiring"; follow the candidate to
            // the tab it now belongs in rather than letting the panel jump to someone else.
            onShortlisted={(mapId) => {
              setPicked(mapId);
              if (tab !== 'all') setTab('shortlisted');
            }}
          />
        </div>
      </div>
    </Q3Shell>
  );
}

function TrackerRow({ row, active, onOpen }: { row: CompanyReviewRow; active: boolean; onOpen: () => void }) {
  const { note, tone } = windowNote(row);
  const status = STATUS[row.state];
  const pct = Math.max(0, Math.min(100, (row.day / 14) * 100));
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={row.state === 'AutoExpired' ? undefined : active}
      aria-label={row.state === 'AutoExpired' ? `${row.name} — auto-expired, view in Returned to Q2` : undefined}
      className={cn(
        COLS,
        'w-full px-5 py-[13px] text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-q3-blue/40',
        active ? 'bg-q3-chip' : 'hover:bg-q3-field',
      )}
    >
      <span className="inline-flex min-w-0 items-center gap-2">
        <Avatar name={row.name} size={34} />
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold leading-4 text-q3-ink">{row.name}</span>
          <span className="mt-px block truncate text-xs leading-[15px] text-q3-muted">{row.designation}</span>
        </span>
      </span>
      <span className="truncate pr-2 text-[13px] font-medium leading-4 text-q3-ink-soft">{row.company}</span>
      <span className="text-[13px] leading-4 text-q3-ink-soft">{row.forwardedAt ? fmtDay(row.forwardedAt) : '—'}</span>
      <span className="block w-[150px]">
        <span className="flex items-baseline gap-1.5">
          <span className="text-[12.5px] font-semibold leading-[15px] text-q3-ink">Day {row.day} / 14</span>
          <span className={cn('text-[11.5px] font-medium leading-[14px]', tone === 'gray' ? 'text-q3-muted' : TONE_TEXT[tone])}>
            {note}
          </span>
        </span>
        <span className="mt-1.5 block h-1.5 rounded-[3px] bg-q3-track" aria-hidden>
          <span className={cn('block h-full rounded-[3px]', BAR[tone])} style={{ width: `${pct}%` }} />
        </span>
      </span>
      <span>
        <Pill tone={status.tone}>{status.label}</Pill>
      </span>
    </button>
  );
}

/**
 * Chases every company with a CV inside its last two days — the designs' "Reminders sent to 3
 * companies" toast. Shown only while something is expiring.
 */
function RemindExpiringButton() {
  const toast = useQ3Toast();
  const remind = useRemindExpiring();
  return (
    <Q3Button
      size="sm"
      variant="soft"
      icon={Bell}
      loading={remind.isPending}
      onClick={() =>
        remind.mutate(undefined, {
          onSuccess: (r) =>
            toast.success(
              `Reminders sent to ${r.companies} compan${r.companies === 1 ? 'y' : 'ies'}`,
              r.unreachable.length
                ? `CVs expiring within 2 days · no email for ${r.unreachable.join(', ')}`
                : 'CVs expiring within 2 days',
            ),
          onError: (err) => toast.error("Couldn't send the reminders", getErrorMessage(err)),
        })
      }
    >
      Remind companies
    </Q3Button>
  );
}

/** The right-hand card: shortlist received, awaiting shortlist, or nothing selected. */
function ShortlistPanel({
  row,
  listLoading,
  onShortlisted,
}: {
  row: CompanyReviewRow | null;
  listLoading: boolean;
  onShortlisted: (mapId: number) => void;
}) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState<'create' | 'edit' | null>(null);
  const live = row && row.state !== 'AutoExpired' ? row : null;
  const { data, isLoading, isError, refetch } = useQ3Shortlist(live?.mapId ?? null);

  if (listLoading || (live && isLoading)) {
    return (
      <Q3Card>
        <SkeletonRows rows={5} />
      </Q3Card>
    );
  }
  if (!row) {
    return (
      <Q3Card>
        <CardMessage icon={Building2} title="No CV selected" body="Pick a forwarded CV to see the company's shortlist details." />
      </Q3Card>
    );
  }
  if (!live) {
    return (
      <Q3Card>
        <CardMessage
          icon={Undo2}
          title="Auto-expired on Day 14"
          body={`${row.company} did not shortlist ${row.name} in time, so the CV went back to Q2.`}
          action={{ label: 'View in Returned to Q2', onClick: () => navigate('/q3/returned?tab=expired') }}
        />
      </Q3Card>
    );
  }
  if (isError || !data) {
    return (
      <Q3Card>
        <CardMessage
          icon={TriangleAlert}
          title="Could not load the shortlist"
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      </Q3Card>
    );
  }

  const round = data.round;
  const shortlisted = !!data.shortlistedAt || !!round;

  return (
    <>
      <Q3Card className="flex flex-col">
        <div className="flex items-center gap-3 border-b border-q3-line px-5 py-[18px]">
          <IconTile icon={shortlisted ? Building2 : Hourglass} tone={shortlisted ? 'blue' : 'amber'} size={40} />
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-semibold leading-[18px] text-q3-ink">
              {shortlisted ? 'Shortlist received' : 'Awaiting shortlist'}
            </h2>
            <p className="mt-0.5 truncate text-xs leading-[15px] text-q3-muted">
              {shortlisted
                ? dot(data.company, data.shortlistedAt && fmtDayTime(data.shortlistedAt))
                : dot(data.company, `Day ${data.day ?? live.day} of 14`)}
            </p>
          </div>
          {round && (
            <Pill tone="blue" dot={false}>
              {roundLabel(round)}
            </Pill>
          )}
        </div>

        <div className="space-y-4 px-5 py-4">
          <section>
            <SectionLabel>{shortlisted ? 'Selected candidate' : 'Candidate'}</SectionLabel>
            <div className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-q3-line bg-q3-field px-2.5 py-2">
              <Avatar name={data.candidate.name} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold leading-4 text-q3-ink">{data.candidate.name}</p>
                <p className="truncate text-[11.5px] leading-[14px] text-q3-muted">
                  {dot(data.candidate.designation, expLabel(data.candidate.totalExp))}
                </p>
              </div>
              {shortlisted && <CircleCheck className="h-[18px] w-[18px] shrink-0 text-q3-green" aria-label="Shortlisted" />}
            </div>
          </section>

          {round ? (
            <RoundDetails round={round} />
          ) : shortlisted ? (
            <p className="rounded-[10px] bg-q3-amber-tint px-3 py-2.5 text-[12.5px] leading-[18px] text-q3-ink-soft">
              {data.company} shortlisted this CV but its interview details are not captured yet. Add the interviewers, HR
              contact and slots the company shared.
            </p>
          ) : (
            <p className="text-[12.5px] leading-[18px] text-q3-ink-soft">
              {data.company} is reviewing this CV. When they shortlist, capture the interviewers, HR contact and interview slots
              here. If it is not shortlisted by Day 14, the CV returns to Q2 automatically
              {live.daysLeft > 0 ? ` — ${days(live.daysLeft)} left.` : '.'}
            </p>
          )}
        </div>

        <PanelFooter
          data={data}
          onCreate={() => setEditing('create')}
          onEdit={() => setEditing('edit')}
          onStart={() => navigate(`/q3/scheduling/${data.mapId}`)}
        />
      </Q3Card>

      <RoundSetupModal
        open={editing != null}
        onClose={() => setEditing(null)}
        onSaved={() => editing === 'create' && onShortlisted(data.mapId)}
        mapId={data.mapId}
        round={editing === 'edit' ? round : null}
        candidateName={data.candidate.name}
        company={data.company}
      />
    </>
  );
}

function PanelFooter({
  data,
  onCreate,
  onEdit,
  onStart,
}: {
  data: Shortlist;
  onCreate: () => void;
  onEdit: () => void;
  onStart: () => void;
}) {
  const round = data.round;
  if (!round) {
    return (
      <div className="flex border-t border-q3-line px-5 py-3.5">
        <Q3Button variant="primary" icon={data.shortlistedAt ? Pencil : CircleCheck} className="flex-1" onClick={onCreate}>
          {data.shortlistedAt ? 'Add interview details' : 'Capture shortlist'}
        </Q3Button>
      </div>
    );
  }
  const editable = round.status === 'Pending' || round.status === 'NoShow' || round.status === 'RescheduleRequested';
  const hasSlots = round.slots.length > 0;
  return (
    <div className="border-t border-q3-line px-5 py-3.5">
      <div className="flex flex-wrap gap-2.5">
        <Q3Button
          icon={Pencil}
          onClick={onEdit}
          disabled={!editable}
          title={editable ? undefined : 'This round is already confirmed'}
        >
          Edit
        </Q3Button>
        <Q3Button variant="primary" className="flex-1" disabled={!hasSlots} onClick={onStart}>
          Start slot coordination
          <ArrowRight aria-hidden />
        </Q3Button>
      </div>
      {!hasSlots && <p className="mt-2 text-xs text-q3-muted">Add the company's slots first.</p>}
    </div>
  );
}

function RoundDetails({ round }: { round: Q3Round }) {
  return (
    <>
      {round.interviewers.length > 0 && (
        <section>
          <SectionLabel>Interviewers</SectionLabel>
          <ul className="mt-2 space-y-2">
            {round.interviewers.map((p, i) => (
              <li key={`${p.name}-${i}`}>
                <PersonLine name={p.name} title={p.title} email={p.email} tone="gray" />
              </li>
            ))}
          </ul>
        </section>
      )}

      {round.hr && (
        <section>
          <SectionLabel>HR contact</SectionLabel>
          <div className="mt-2">
            <PersonLine name={round.hr.name} title={round.hr.title} email={round.hr.email} tone="amber" />
          </div>
        </section>
      )}

      <section>
        <SectionLabel>Interview slots ({round.slots.length})</SectionLabel>
        {round.slots.length ? (
          <ul className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {round.slots.map((s) => (
              <li
                key={s.slotId}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg border bg-q3-surface px-2.5 py-[7px] text-xs font-medium leading-[15px]',
                  s.isSelected ? 'border-q3-blue text-q3-blue' : 'border-q3-line text-q3-ink-soft',
                  s.isUnavailable && 'text-q3-muted-light line-through',
                )}
                title={s.isUnavailable ? 'Candidate unavailable' : s.isSelected ? 'Selected slot' : undefined}
              >
                <Calendar className="h-[13px] w-[13px] shrink-0" aria-hidden />
                <span className="truncate">
                  {fmtWeekday(s.at)} · {fmtTime(s.at)}
                </span>
                {s.isUnavailable && <span className="sr-only"> (unavailable)</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-q3-muted">No slots shared yet.</p>
        )}
      </section>

      <section>
        <SectionLabel>Interview mode</SectionLabel>
        <div className="mt-2">
          <ModeSegmented value={round.mode} />
        </div>
      </section>
    </>
  );
}

function PersonLine({
  name,
  title,
  email,
  tone,
}: {
  name: string;
  title?: string | null;
  email?: string | null;
  tone: 'gray' | 'amber';
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
          tone === 'gray' ? 'bg-q3-chip text-q3-ink-mid' : TONE_PILL.amber,
        )}
        aria-hidden
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-semibold leading-[15px] text-q3-ink">{dot(name, title)}</p>
        {email && <p className="truncate text-[11.5px] leading-[14px] text-q3-muted">{email}</p>}
      </div>
    </div>
  );
}
