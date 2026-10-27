import { Fragment, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Bell,
  CalendarClock,
  Check,
  Clock,
  Flag,
  Hourglass,
  ListChecks,
  Mail,
  Pause,
  PauseCircle,
  Plus,
  X,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { useNudge, useQ3Rounds } from '../q3.api';
import { TONE_PILL, dot, expLabel, firstName, fmtDay, fmtDayTime, fmtTime, fmtWeekday, sentAt, type Tone } from '../q3.format';
import type { Q3Round, RoundDecision, RoundsDetail } from '../q3.types';
import { Crumbs, Q3Shell } from '../components/Q3Shell';
import { QueueIndex, QueueSwitcher } from '../components/QueueSwitcher';
import { RecordDecisionModal } from '../components/RecordDecisionModal';
import { Avatar, CardHeader, CardMessage, Pill, Q3Button, Q3Card, SkeletonRows } from '../components/primitives';
import { useQ3Toast } from '../components/q3-toast-context';
import { DECISION_MAIL, isPassed, roundPill, roundTitle } from '../components/round-labels';

type Round = RoundsDetail['rounds'][number];

/**
 * Interview Rounds (Figma "05 · Interview Rounds") — one application's rounds, the company's
 * pending result and the decision that moves it on. Rounds are dynamic: a "next round"
 * decision creates the next one, so the stepper is drawn from whatever rounds exist.
 */
export default function Q3RoundsPage() {
  const { mapId = '' } = useParams();
  if (!mapId) {
    return (
      <QueueIndex
        name="decisions"
        title="Interview Rounds"
        subtitle="Decisions"
        emptyTitle="No decisions pending"
        emptyBody="Conducted interviews waiting on the company's result appear here."
      />
    );
  }
  return <RoundsDetailView key={mapId} mapId={mapId} />;
}

function RoundsDetailView({ mapId }: { mapId: string }) {
  const { data, isLoading, isError, refetch } = useQ3Rounds(mapId);
  const [dialog, setDialog] = useState<{ open: boolean; initial?: RoundDecision; seq: number }>({ open: false, seq: 0 });

  const subtitle = data ? (
    <span className="inline-flex min-w-0 flex-wrap items-center gap-2">
      <Crumbs root="Decisions" rootTo="/q3/decisions">
        {data.candidate.name} · {data.company} — {data.jobTitle}
      </Crumbs>
      <QueueSwitcher name="decisions" mapId={data.mapId} />
    </span>
  ) : (
    <Crumbs root="Decisions" rootTo="/q3/decisions" />
  );

  const openDecision = (initial?: RoundDecision) => setDialog((d) => ({ open: true, initial, seq: d.seq + 1 }));

  return (
    <Q3Shell title="Interview Rounds" subtitle={subtitle}>
      {isLoading ? (
        <Q3Card>
          <SkeletonRows rows={4} />
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
        <div className="flex flex-col gap-5">
          <CandidateCard detail={data} onRecord={openDecision} />
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
            <RoundHistory rounds={data.rounds} />
            <DecisionLegend />
          </div>
          <RecordDecisionModal
            key={dialog.seq}
            open={dialog.open}
            initial={dialog.initial}
            detail={data}
            onClose={() => setDialog((d) => ({ ...d, open: false }))}
          />
        </div>
      )}
    </Q3Shell>
  );
}

// ── Header card ────────────────────────────────────────────────────────

function CandidateCard({ detail, onRecord }: { detail: RoundsDetail; onRecord: (initial?: RoundDecision) => void }) {
  const toast = useQ3Toast();
  const nudge = useNudge();
  const c = detail.candidate;
  const latest = detail.rounds.find((r) => r.roundId === detail.latestRoundId) ?? null;
  const undecided = !!latest && latest.status === 'Completed' && !latest.decision;
  const closed = detail.stage === 'Closed' || latest?.decision === 'Rejected';

  const statusPill = latest ? latestPill(latest) : null;

  const doNudge = () =>
    nudge.mutate(detail.mapId, {
      onSuccess: (res) =>
        toast.success(`Nudge sent to ${res.company}`, `Reminder for ${firstName(c.name)}’s ${res.round} result`),
      onError: (err) => toast.error("Couldn't nudge the company", getErrorMessage(err)),
    });

  const addRoundHint = detail.canRecord
    ? 'Record the company’s decision and add the next round'
    : closed || detail.selected
      ? 'This application is closed to new rounds'
      : 'A round can be added once the current one has been conducted';

  return (
    <Q3Card className="flex flex-col gap-5 px-5 py-[18px]">
      <div className="flex flex-wrap items-center gap-3.5">
        <Avatar name={c.name} size={48} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[17px] font-semibold leading-[21px] text-q3-ink">{c.name}</h2>
            {statusPill && <Pill tone={statusPill.tone}>{statusPill.label}</Pill>}
            {detail.overdueDays > 0 && (
              <Pill tone="red">
                Result overdue {detail.overdueDays} day{detail.overdueDays === 1 ? '' : 's'}
              </Pill>
            )}
            {latest?.decision === 'Hold' && <Pill tone="gray">On hold</Pill>}
            {detail.selected && <Pill tone="green">Selected</Pill>}
          </div>
          <p className="mt-1 text-[12.5px] leading-[15px] text-q3-muted">
            {dot(c.designation, expLabel(c.totalExp), c.currentEmployer, c.location)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3.5">
          {undecided && (
            <Q3Button icon={Bell} onClick={doNudge} loading={nudge.isPending} className="min-h-[38px]">
              Nudge company
            </Q3Button>
          )}
          <Q3Button
            variant="primary"
            icon={ListChecks}
            disabled={!detail.canRecord}
            title={detail.canRecord ? undefined : 'A decision can be recorded once the round has been conducted'}
            onClick={() => onRecord()}
          >
            Record decision
          </Q3Button>
        </div>
      </div>

      <div role="group" className="flex items-center gap-2.5 overflow-x-auto" aria-label="Rounds">
        {detail.rounds.map((r, i) => (
          <Fragment key={r.roundId}>
            {i > 0 && <StepArrow />}
            <RoundStep round={r} current={r.roundId === detail.latestRoundId} />
          </Fragment>
        ))}
        {!detail.hasFinal && !detail.selected && !closed && (
          <>
            {detail.rounds.length > 0 && <StepArrow />}
            <StepCard
              icon={Flag}
              circle="border-[1.5px] border-q3-line-strong bg-q3-surface text-q3-muted"
              title="Final Round"
              titleClass="text-q3-muted"
              sub="Not scheduled"
              className="bg-q3-head"
            />
          </>
        )}
        <button
          type="button"
          onClick={() => onRecord('NextRound')}
          disabled={!detail.canRecord}
          title={addRoundHint}
          className={cn(
            'inline-flex h-[37px] shrink-0 items-center gap-1.5 rounded-[10px] border border-dashed border-q3-line-strong px-3 text-[12.5px] font-medium leading-[15px] text-q3-muted transition',
            'hover:border-q3-blue hover:text-q3-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
            'disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-q3-line-strong disabled:hover:text-q3-muted',
          )}
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Add round
        </button>
      </div>
    </Q3Card>
  );
}

/** The header's round pill: what is happening to the latest round right now. */
function latestPill(r: Q3Round): { label: string; tone: Tone } | null {
  if (r.decision === 'Rejected') return { label: 'Not selected', tone: 'red' };
  if (r.decision === 'Selected') return null; // the green "Selected" pill says it
  const t = roundTitle(r);
  switch (r.status) {
    case 'Completed':
      return { label: `${t} conducted`, tone: 'blue' };
    case 'Scheduled':
      return { label: `${t} scheduled`, tone: 'blue' };
    case 'Pending':
      return { label: 'Awaiting slots', tone: 'violet' };
    case 'NoShow':
      return { label: 'No-show', tone: 'red' };
    case 'RescheduleRequested':
      return { label: 'Reschedule asked', tone: 'violet' };
    case 'Cancelled':
      return { label: `${t} cancelled`, tone: 'gray' };
  }
}

function StepArrow() {
  return <ArrowRight className="h-3.5 w-3.5 shrink-0 text-q3-muted-light" aria-hidden />;
}

function StepCard({
  icon: Icon,
  circle,
  title,
  titleClass,
  sub,
  subClass,
  className,
}: {
  icon: LucideIcon;
  circle: string;
  title: string;
  titleClass?: string;
  sub: string;
  subClass?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex h-[53px] w-[216px] shrink-0 items-center gap-2.5 rounded-[10px] border border-q3-line px-3 py-2.5',
        className,
      )}
    >
      <span className={cn('inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full', circle)} aria-hidden>
        <Icon className="h-[13px] w-[13px]" strokeWidth={2.5} />
      </span>
      <div className="min-w-0">
        <p className={cn('truncate text-[13px] font-semibold leading-4 text-q3-ink', titleClass)}>{title}</p>
        <p className={cn('mt-px truncate text-[11.5px] leading-[14px] text-q3-muted', subClass)}>{sub}</p>
      </div>
    </div>
  );
}

/** One stepper card. Passed rounds are green, the round in play blue, hold amber, rejection red. */
function RoundStep({ round: r, current }: { round: Round; current: boolean }) {
  const title = roundTitle(r);
  if (isPassed(r.decision)) {
    return (
      <StepCard
        icon={Check}
        circle="bg-q3-green text-white"
        title={title}
        sub={`${r.decision === 'Selected' ? 'Selected' : 'Cleared'}${r.decidedAt ? ` · ${fmtDay(r.decidedAt)}` : ''}`}
        className="bg-q3-green-tint"
      />
    );
  }
  if (r.decision === 'Hold') {
    return (
      <StepCard
        icon={Pause}
        circle="bg-q3-amber text-white"
        title={title}
        sub="On hold"
        subClass="text-q3-amber"
        className="bg-q3-amber-tint"
      />
    );
  }
  if (r.decision === 'Rejected') {
    return <StepCard icon={X} circle="bg-q3-red text-white" title={title} sub="Not selected" subClass="text-q3-red" className="bg-q3-red-soft" />;
  }
  const live = current ? 'border-q3-blue bg-q3-blue-tint' : 'bg-q3-surface';
  const circle = current ? 'bg-q3-blue text-white' : 'border-[1.5px] border-q3-line-strong bg-q3-surface text-q3-muted';
  const subClass = current ? 'text-q3-blue' : undefined;
  switch (r.status) {
    case 'Completed':
      return <StepCard icon={Clock} circle={circle} title={title} sub="Awaiting result" subClass={subClass} className={live} />;
    case 'Scheduled':
      return (
        <StepCard
          icon={CalendarClock}
          circle={circle}
          title={title}
          sub={r.scheduledAt ? `Scheduled · ${fmtDay(r.scheduledAt)}` : 'Scheduled'}
          subClass={subClass}
          className={live}
        />
      );
    case 'NoShow':
      return <StepCard icon={X} circle={circle} title={title} sub="No-show" subClass="text-q3-red" className={live} />;
    case 'RescheduleRequested':
      return <StepCard icon={CalendarClock} circle={circle} title={title} sub="Reschedule asked" subClass={subClass} className={live} />;
    case 'Cancelled':
      return <StepCard icon={X} circle={circle} title={title} sub="Cancelled" className={live} />;
    case 'Pending':
      return <StepCard icon={Hourglass} circle={circle} title={title} sub="Awaiting slots" subClass={subClass} className={live} />;
  }
}

// ── Round history ──────────────────────────────────────────────────────

function RoundHistory({ rounds }: { rounds: Round[] }) {
  const newestFirst = [...rounds].sort((a, b) => b.roundNumber - a.roundNumber);
  return (
    <Q3Card className="flex flex-col gap-3.5 px-5 py-[18px]">
      <div>
        <h2 className="text-base font-semibold leading-[19px] text-q3-ink">Round history</h2>
        <p className="mt-[3px] text-[12.5px] leading-[15px] text-q3-muted">Rounds are dynamic — the company decides how many</p>
      </div>
      {newestFirst.length === 0 ? (
        <CardMessage icon={CalendarClock} title="No rounds yet" body="Rounds appear here once the company shares interview slots." />
      ) : (
        newestFirst.map((r) => <HistoryCard key={r.roundId} round={r} />)
      )}
    </Q3Card>
  );
}

function HistoryCard({ round: r }: { round: Round }) {
  const pill = roundPill(r);
  const when = r.scheduledAt ? dot(fmtWeekday(r.scheduledAt), fmtTime(r.scheduledAt), r.mode) : dot('Not scheduled yet', r.mode);
  const names = r.interviewers.map((i) => i.name).filter(Boolean).join(', ');
  const note = historyNote(r);
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-q3-line px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold leading-[17px] text-q3-ink">
          {roundTitle(r)}
          {r.roundName ? ` · ${r.roundName}` : ''}
        </h3>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      <p className="flex flex-wrap gap-x-3.5 gap-y-0.5 text-xs leading-[15px] text-q3-muted">
        <span>{when}</span>
        {names && <span>Interviewers: {names}</span>}
      </p>
      {note && (
        <p className={cn('flex items-start gap-2 rounded-lg px-2.5 py-2 text-xs leading-[15px] text-q3-ink-soft', note.bg)}>
          <note.icon className={cn('h-3.5 w-3.5 shrink-0', note.iconClass)} aria-hidden />
          <span>{note.text}</span>
        </p>
      )}
      {r.companyFeedback && <p className="text-xs italic leading-[16px] text-q3-muted">“{r.companyFeedback}”</p>}
    </div>
  );
}

const MAIL_NOTE_TONE: Record<RoundDecision, { bg: string; iconClass: string }> = {
  NextRound: { bg: 'bg-q3-green-tint', iconClass: 'text-q3-green' },
  FinalRound: { bg: 'bg-q3-green-tint', iconClass: 'text-q3-green' },
  Selected: { bg: 'bg-q3-green-tint', iconClass: 'text-q3-green' },
  Hold: { bg: 'bg-q3-field', iconClass: 'text-q3-muted' },
  Rejected: { bg: 'bg-q3-red-soft', iconClass: 'text-q3-red' },
};

/** The tinted line under a round: the promised result date, or the mail its decision sent. */
function historyNote(r: Round): { icon: LucideIcon; text: string; bg: string; iconClass: string } | null {
  if (r.decision) {
    const tone = MAIL_NOTE_TONE[r.decision];
    return r.decisionMailSentAt
      ? { icon: Mail, text: `${DECISION_MAIL[r.decision]} sent ${fmtDayTime(r.decisionMailSentAt)}`, ...tone }
      : { icon: Mail, text: `No ${DECISION_MAIL[r.decision].toLowerCase()} sent for this decision`, bg: 'bg-q3-field', iconClass: 'text-q3-muted' };
  }
  if (r.status === 'Completed') {
    const promised = r.resultDueAt ? `Company promised result by ${fmtDay(r.resultDueAt)}` : 'Waiting on the company’s result';
    return {
      icon: Clock,
      text: `${promised}${r.lastNudgeAt ? ` — reminder sent ${sentAt(r.lastNudgeAt)}` : ''}`,
      bg: 'bg-q3-amber-tint',
      iconClass: 'text-q3-amber',
    };
  }
  if (r.status === 'Pending' && r.slotsRequestedAt) {
    return { icon: CalendarClock, text: `Slots requested from the company ${sentAt(r.slotsRequestedAt)}`, bg: 'bg-q3-violet-soft', iconClass: 'text-q3-violet' };
  }
  return null;
}

// ── Legend ─────────────────────────────────────────────────────────────

const LEGEND: Array<{ icon: LucideIcon; tone: Tone; title: string; sub: string }> = [
  { icon: ArrowRight, tone: 'blue', title: 'Next round', sub: 'Congratulations mail (Round cleared) → next-round scheduling' },
  { icon: Flag, tone: 'violet', title: 'Final round', sub: 'Congratulations mail (Final round) → final interview' },
  { icon: PauseCircle, tone: 'gray', title: 'Hold', sub: 'Hold mail → parked under On Hold' },
  { icon: XCircle, tone: 'red', title: 'Rejected', sub: 'Rejection mail → candidate closed' },
  { icon: Award, tone: 'green', title: 'Selected (final only)', sub: 'Candidate selected → document collection' },
];

/** "What each decision triggers" — a static key to the decision modal. */
function DecisionLegend() {
  return (
    <Q3Card>
      <CardHeader
        bordered
        title={<span className="text-[15px] leading-[18px]">What each decision triggers</span>}
        subtitle={<span className="text-xs">Q3 handles the mail automatically</span>}
      />
      <ul className="flex flex-col gap-3 px-5 py-3.5">
        {LEGEND.map((l) => (
          <li key={l.title} className="flex items-center gap-3">
            <span className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]', TONE_PILL[l.tone])} aria-hidden>
              <l.icon className="h-[15px] w-[15px]" />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold leading-4 text-q3-ink">{l.title}</p>
              <p className="mt-px text-xs leading-4 text-q3-muted">{l.sub}</p>
            </div>
          </li>
        ))}
      </ul>
    </Q3Card>
  );
}
