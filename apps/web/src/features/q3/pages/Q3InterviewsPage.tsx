import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bell,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Filter,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Video,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import {
  useChecklist,
  useLogContact,
  useMarkConducted,
  useQ3Interviews,
  useRemind,
  useRequestSlots,
  useReschedule,
} from '../q3.api';
import {
  bareLink,
  firstName,
  fmtDay,
  fmtTime,
  fmtWeekday,
  inLabel,
  initialsOf,
  isSameDay,
  isoDate,
  linkHost,
  minutesUntil,
  relativeDay,
  type Tone,
} from '../q3.format';
import type { InterviewMode, InterviewPill, InterviewRow, InterviewsWeek } from '../q3.types';
import { Crumbs, Q3Shell } from '../components/Q3Shell';
import { useQ3Toast } from '../components/q3-toast-context';
import { roundTitle } from '../components/round-labels';
import { slotRange, whenLabel } from '../components/schedule-format';
import {
  Avatar,
  CardHeader,
  CardMessage,
  IconTile,
  KpiCard,
  Pill,
  Q3Button,
  Q3Card,
  RoundTag,
  SectionLabel,
  SkeletonRows,
  TabChip,
} from '../components/primitives';

const IN_PERSON = new Set(['Face-to-Face', 'Walk-in']);
const MODES: InterviewMode[] = ['Virtual', 'Telephonic', 'Face-to-Face', 'Walk-in'];
const DAY = 86_400_000;

type Tab = 'all' | 'today' | 'upcoming' | 'conducted' | 'reschedule';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'today', label: 'Today' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'conducted', label: 'Conducted' },
  { key: 'reschedule', label: 'Needs reschedule' },
];

function matchesTab(row: InterviewRow, tab: Tab, now: number) {
  const r = row.round;
  const at = r.scheduledAt ? new Date(r.scheduledAt) : null;
  switch (tab) {
    case 'all':
      return true;
    case 'today':
      return !!at && isSameDay(at, new Date(now));
    case 'upcoming':
      return (r.pill === 'Confirmed' || r.pill === 'StartingSoon') && !!at && at.getTime() > now;
    case 'conducted':
      return r.status === 'Completed';
    case 'reschedule':
      return r.pill === 'NoShow' || r.pill === 'RescheduleAsked';
  }
}

/** Monday 00:00 of the week `x` falls in, local time. */
function mondayOf(x: Date) {
  const m = new Date(x.getFullYear(), x.getMonth(), x.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

/** The API's weekEnd is the last day's midnight; tolerate an exclusive end too. */
function weekBounds(data: Pick<InterviewsWeek, 'weekStart' | 'weekEnd'>) {
  const start = new Date(data.weekStart);
  const end = new Date(data.weekEnd);
  const last = end.getTime() - start.getTime() >= 7 * DAY - 60_000 ? new Date(end.getTime() - DAY) : end;
  return { start, last };
}

/** Outside-click and Esc for the two header popovers. */
function usePopover() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return { open, setOpen, ref };
}

/** A 30s clock, so "Starts in 45 min" and "Mark conducted" follow real time between refetches. */
function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return now;
}

/**
 * Interviews (Figma "04b · Interviews"): the week's confirmed, running and finished
 * interviews grouped by day, and the next one with its day-of checklist. Each row's button
 * is the one thing that row needs next — remind, join, open the result, or reschedule.
 */
export default function Q3InterviewsPage() {
  const toast = useQ3Toast();
  const navigate = useNavigate();
  const now = useNow();
  const [week, setWeek] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [company, setCompany] = useState('');
  const [mode, setMode] = useState<InterviewMode | ''>('');
  const { data, isLoading, isError, refetch, isFetching } = useQ3Interviews(week);
  const remind = useRemind();
  const requestSlots = useRequestSlots();
  const weekMenu = usePopover();
  const filterMenu = usePopover();

  const bounds = data ? weekBounds(data) : null;
  const thisMonday = mondayOf(new Date(now));
  const weekOptions = [-1, 0, 1, 2, 3].map((offset) => {
    const m = new Date(thisMonday);
    m.setDate(m.getDate() + offset * 7);
    const sun = new Date(m);
    sun.setDate(sun.getDate() + 6);
    return {
      value: offset === 0 ? '' : isoDate(m),
      label: offset === -1 ? 'Previous week' : offset === 0 ? 'This week' : offset === 1 ? 'Next week' : `In ${offset} weeks`,
      range: `${fmtDay(m)} – ${fmtDay(sun)}`,
    };
  });
  const isThisWeek = bounds ? isSameDay(mondayOf(bounds.start), thisMonday) : week === '';
  const weekTitle = isThisWeek ? 'This week' : weekOptions.find((o) => o.value === week)?.label ?? 'Week';

  const rows = useMemo(() => {
    const list = (data?.rows ?? []).filter(
      (r) => matchesTab(r, tab, now) && (!company || r.company === company) && (!mode || r.round.mode === mode),
    );
    return list.sort((a, b) => (a.round.scheduledAt ?? '9').localeCompare(b.round.scheduledAt ?? '9'));
  }, [data, tab, company, mode, now]);

  const groups = useMemo(() => {
    const out: Array<{ key: string; day: Date | null; rows: InterviewRow[] }> = [];
    for (const r of rows) {
      const day = r.round.scheduledAt ? new Date(r.round.scheduledAt) : null;
      const key = day ? isoDate(day) : 'none';
      const last = out[out.length - 1];
      if (last?.key === key) last.rows.push(r);
      else out.push({ key, day, rows: [r] });
    }
    return out;
  }, [rows]);

  const sendRemind = (row: InterviewRow) =>
    remind.mutate(row.round.roundId, {
      onSuccess: (res) => {
        const at = res.at ?? row.round.scheduledAt;
        toast.success(`Reminder sent to ${res.name || row.name}`, `Mail · ${roundTitle(row.round)}${at ? ` at ${fmtTime(at)}` : ''}`);
      },
      onError: (err) => toast.error('Could not send the reminder', getErrorMessage(err)),
    });

  const askSlots = (roundId: number) =>
    requestSlots.mutate(roundId, {
      onSuccess: (res) =>
        toast.success(
          'New slots requested',
          res.mailed ? 'Company notified · candidate stays in Scheduling' : 'No company email on file — follow up by phone',
        ),
      onError: (err) => toast.error('Could not request slots', getErrorMessage(err)),
    });

  const join = (url: string) => {
    window.open(url, '_blank', 'noopener');
    toast.success(`Opening ${linkHost(url) ?? 'meeting'}`, `${bareLink(url)} · new tab`);
  };

  const filtersOn = (company ? 1 : 0) + (mode ? 1 : 0);
  const k = data?.kpis;

  return (
    <Q3Shell
      title="Interviews"
      subtitle={
        <Crumbs root="Interviews">
          {bounds ? `${weekTitle} · ${fmtWeekday(bounds.start)} – ${fmtWeekday(bounds.last)}` : weekTitle}
        </Crumbs>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={Video}
            tone="blue"
            value={k?.today.value ?? 0}
            badge={k?.today.nextAt ? `next at ${fmtTime(k.today.nextAt)}` : null}
            badgeTone="blue"
            title="Today"
            help={k?.today.who.length ? k.today.who.join(' · ') : 'No interviews today'}
            loading={isLoading}
          />
          <KpiCard
            icon={CalendarDays}
            tone="violet"
            value={k?.week.value ?? 0}
            badge={k?.week.range}
            title={isThisWeek ? 'This week' : weekTitle}
            help={`Across ${k?.week.companies ?? 0} compan${k?.week.companies === 1 ? 'y' : 'ies'}`}
            loading={isLoading}
          />
          <KpiCard
            icon={Clock}
            tone="amber"
            value={k?.awaiting.value ?? 0}
            badge={k?.awaiting.overdue ? `${k.awaiting.overdue} overdue` : null}
            title="Awaiting result"
            help="Conducted · with company"
            to="/q3/decisions"
            loading={isLoading}
          />
          <KpiCard
            icon={RefreshCw}
            tone="red"
            value={k?.needsReschedule.value ?? 0}
            badge={k?.needsReschedule.noShow ? `${k.needsReschedule.noShow} no-show` : null}
            title="Needs reschedule"
            help="Back to Slot Scheduling"
            to="/q3/scheduling"
            loading={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
          <Q3Card className="min-w-0 overflow-hidden">
            <CardHeader
              title="Interview schedule"
              subtitle={`${rows.length} interview${rows.length === 1 ? '' : 's'} ${isThisWeek ? 'this week' : 'in this week'} · grouped by day`}
            >
              <div className="relative" ref={weekMenu.ref}>
                <Q3Button
                  size="sm"
                  icon={Calendar}
                  className="text-[12.5px]"
                  aria-haspopup="listbox"
                  aria-expanded={weekMenu.open}
                  onClick={() => weekMenu.setOpen((o) => !o)}
                >
                  {bounds ? `${fmtDay(bounds.start)} – ${fmtDay(bounds.last)}` : 'This week'}
                  <ChevronDown className={cn('transition', isFetching && !isLoading && 'animate-pulse')} aria-hidden />
                </Q3Button>
                {weekMenu.open && (
                  <ul
                    role="listbox"
                    aria-label="Week"
                    className="absolute right-0 top-full z-30 mt-1 w-60 rounded-xl border border-q3-line bg-q3-surface p-1 shadow-q3-pop"
                  >
                    {weekOptions.map((o) => (
                      <li key={o.label}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={week === o.value}
                          onClick={() => {
                            setWeek(o.value);
                            weekMenu.setOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[13px] hover:bg-q3-field',
                            week === o.value && 'bg-q3-blue-soft',
                          )}
                        >
                          <span className="font-semibold text-q3-ink">{o.label}</span>
                          <span className="text-xs text-q3-muted">{o.range}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="relative" ref={filterMenu.ref}>
                <Q3Button
                  size="sm"
                  icon={Filter}
                  className="text-[12.5px]"
                  aria-haspopup="dialog"
                  aria-expanded={filterMenu.open}
                  onClick={() => filterMenu.setOpen((o) => !o)}
                >
                  Filters
                  {filtersOn > 0 && (
                    <span className="rounded-full bg-q3-blue px-1.5 py-px text-[10.5px] font-semibold text-white">{filtersOn}</span>
                  )}
                </Q3Button>
                {filterMenu.open && (
                  <div
                    role="dialog"
                    aria-label="Filters"
                    className="absolute right-0 top-full z-30 mt-1 w-64 space-y-3 rounded-xl border border-q3-line bg-q3-surface p-3.5 shadow-q3-pop"
                  >
                    <FilterSelect
                      id="q3-int-company"
                      label="Company"
                      value={company}
                      onChange={setCompany}
                      options={(data?.companies ?? []).map((c) => ({ value: c, label: c }))}
                      all="All companies"
                    />
                    <FilterSelect
                      id="q3-int-mode"
                      label="Mode"
                      value={mode}
                      onChange={(v) => setMode(v as InterviewMode | '')}
                      options={MODES.map((m) => ({ value: m, label: m }))}
                      all="All modes"
                    />
                    <div className="flex justify-end">
                      <Q3Button
                        size="sm"
                        variant="ghost"
                        disabled={!filtersOn}
                        onClick={() => {
                          setCompany('');
                          setMode('');
                        }}
                      >
                        Clear filters
                      </Q3Button>
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>

            <div className="flex gap-2 overflow-x-auto px-5 pb-4" role="group" aria-label="Show">
              {TABS.map((t) => (
                <TabChip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
                  {t.label}
                </TabChip>
              ))}
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[714px]">
                <div className="grid grid-cols-[80px_182px_122px_56px_132px_minmax(104px,1fr)] items-center border-y border-q3-line bg-q3-head px-5 py-2.5 text-[11px] font-semibold uppercase leading-[13px] tracking-[0.6px] text-q3-muted">
                  <span>Time</span>
                  <span>Candidate</span>
                  <span>Company · Role</span>
                  <span>Round</span>
                  <span>Status</span>
                  <span className="sr-only">Action</span>
                </div>

                {isLoading ? (
                  <SkeletonRows rows={5} />
                ) : isError ? (
                  <CardMessage
                    title="Couldn't load interviews"
                    body="Check your connection and try again."
                    action={{ label: 'Retry', onClick: () => void refetch() }}
                  />
                ) : groups.length === 0 ? (
                  <CardMessage
                    icon={CalendarDays}
                    title={data?.rows.length ? 'No interviews match' : 'No interviews this week'}
                    body={data?.rows.length ? 'Try another tab or clear the filters.' : 'Confirmed slots show up here, grouped by day.'}
                  />
                ) : (
                  groups.map((g) => {
                    const today = !!g.day && isSameDay(g.day, new Date(now));
                    return (
                      <section key={g.key} aria-label={g.day ? fmtWeekday(g.day) : 'Unscheduled'}>
                        <div
                          className={cn(
                            'flex items-center gap-2 border-b border-q3-line px-5 py-2',
                            today ? 'bg-q3-blue-tint' : 'bg-q3-head',
                          )}
                        >
                          {today && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-q3-blue" aria-hidden />}
                          <span
                            className={cn(
                              'flex-1 text-[11px] font-semibold uppercase leading-[13px] tracking-[0.6px]',
                              today ? 'text-q3-blue' : 'text-q3-muted',
                            )}
                          >
                            {g.day ? fmtWeekday(g.day) : 'Time not set'}
                            {today && ' · Today'}
                          </span>
                          <span className="text-[11.5px] leading-[14px] text-q3-muted">
                            {g.rows.length} interview{g.rows.length === 1 ? '' : 's'}
                          </span>
                        </div>
                        {g.rows.map((row) => (
                          <ScheduleRow
                            key={row.round.roundId}
                            row={row}
                            now={now}
                            onOpen={(to) => navigate(to)}
                            onRemind={() => sendRemind(row)}
                            reminding={remind.isPending && remind.variables === row.round.roundId}
                            onNewSlots={() => askSlots(row.round.roundId)}
                            requesting={requestSlots.isPending && requestSlots.variables === row.round.roundId}
                            onJoin={join}
                          />
                        ))}
                      </section>
                    );
                  })
                )}
              </div>
            </div>
          </Q3Card>

          {isLoading ? (
            <Q3Card>
              <SkeletonRows rows={5} />
            </Q3Card>
          ) : data?.upNext ? (
            <UpNextCard key={data.upNext.round.roundId} item={data.upNext} now={now} onJoin={join} />
          ) : (
            <Q3Card>
              <CardMessage
                icon={Video}
                title={isError ? "Couldn't load up next" : 'No interviews coming up'}
                body={isError ? undefined : 'The next confirmed interview appears here with its day-of checklist.'}
                action={isError ? { label: 'Retry', onClick: () => void refetch() } : undefined}
              />
            </Q3Card>
          )}
        </div>
      </div>
    </Q3Shell>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  all,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  all: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id}>
        <SectionLabel>{label}</SectionLabel>
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[33px] w-full rounded-lg border border-q3-line bg-q3-head px-2.5 text-[12.5px] text-q3-ink-soft outline-none focus:border-q3-blue focus:ring-2 focus:ring-q3-blue/15"
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function statusPill(pill: InterviewPill, at: string | null, now: number): { label: string; tone: Tone } {
  switch (pill) {
    case 'Confirmed':
      return { label: 'Confirmed', tone: 'green' };
    case 'StartingSoon': {
      const m = at ? minutesUntil(at, now) : 0;
      return { label: m > 0 ? `Starts in ${m} min` : 'Starting now', tone: 'blue' };
    }
    case 'InProgress':
      return { label: 'In progress', tone: 'blue' };
    case 'AwaitingResult':
      return { label: 'Awaiting result', tone: 'amber' };
    case 'Decided':
      return { label: 'Decided', tone: 'gray' };
    case 'NoShow':
      return { label: 'No-show', tone: 'red' };
    case 'RescheduleAsked':
      return { label: 'Reschedule asked', tone: 'violet' };
  }
}

/** Where clicking the row itself goes (the button has its own action). */
function rowHref(row: InterviewRow) {
  switch (row.round.pill) {
    case 'AwaitingResult':
    case 'Decided':
      return `/q3/decisions/${row.mapId}`;
    case 'NoShow':
    case 'RescheduleAsked':
      return row.isLatest ? `/q3/scheduling/${row.mapId}` : null;
    default:
      // A confirmed interview opens its schedule — slot, invite recipients, contact log — as
      // the prototype's row links do ("call karte waqt saari basic info saamne ho").
      return row.isLatest ? `/q3/scheduling/${row.mapId}` : `/q3/decisions/${row.mapId}`;
  }
}

function ScheduleRow({
  row,
  now,
  onOpen,
  onRemind,
  reminding,
  onNewSlots,
  requesting,
  onJoin,
}: {
  row: InterviewRow;
  now: number;
  onOpen: (to: string) => void;
  onRemind: () => void;
  reminding: boolean;
  onNewSlots: () => void;
  requesting: boolean;
  onJoin: (url: string) => void;
}) {
  const r = row.round;
  const at = r.scheduledAt;
  const pill = statusPill(r.pill, at, now);
  const href = rowHref(row);
  const live = r.pill === 'StartingSoon' || r.pill === 'InProgress';
  const decisions = `/q3/decisions/${row.mapId}`;
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  let action: React.ReactNode = null;
  if (r.pill === 'Confirmed') {
    action =
      !r.reminderSentAt && at && new Date(at).getTime() > now ? (
        <Q3Button size="sm" variant="soft" icon={Bell} onClick={stop(onRemind)} loading={reminding}>
          Remind
        </Q3Button>
      ) : (
        <Q3Button size="sm" onClick={stop(() => onOpen(decisions))}>
          View
        </Q3Button>
      );
  } else if (live) {
    action = r.meetingLink && !IN_PERSON.has(r.mode ?? '') ? (
      <Q3Button size="sm" variant="primary" icon={Video} onClick={stop(() => onJoin(r.meetingLink!))}>
        Join
      </Q3Button>
    ) : (
      <Q3Button size="sm" onClick={stop(() => onOpen(decisions))}>
        View
      </Q3Button>
    );
  } else if (r.pill === 'AwaitingResult') {
    action = (
      <Q3Button size="sm" variant="soft" icon={ArrowRight} onClick={stop(() => onOpen(decisions))}>
        Open
      </Q3Button>
    );
  } else if (r.pill === 'Decided') {
    action = (
      <Q3Button size="sm" onClick={stop(() => onOpen(decisions))}>
        View
      </Q3Button>
    );
  } else if (r.pill === 'NoShow' && row.isLatest) {
    action = (
      <Q3Button size="sm" icon={RefreshCw} onClick={stop(() => onOpen(`/q3/scheduling/${row.mapId}`))}>
        Reschedule
      </Q3Button>
    );
  } else if (r.pill === 'RescheduleAsked') {
    action = (
      <Q3Button size="sm" icon={RefreshCw} onClick={stop(onNewSlots)} loading={requesting}>
        New slots
      </Q3Button>
    );
  }

  return (
    <div
      role={href ? 'link' : undefined}
      tabIndex={href ? 0 : undefined}
      aria-label={href ? `${row.name}, ${row.company} — open` : undefined}
      onClick={href ? () => onOpen(href) : undefined}
      onKeyDown={
        href
          ? (e) => {
              if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onOpen(href);
              }
            }
          : undefined
      }
      className={cn(
        'grid min-h-[63px] grid-cols-[80px_182px_122px_56px_132px_minmax(104px,1fr)] items-center border-b border-q3-line px-5 py-[13px] last:border-b-0',
        live && 'bg-q3-blue-wash',
        href && 'cursor-pointer hover:bg-q3-field focus-visible:bg-q3-field focus-visible:outline-none',
      )}
    >
      <div className="min-w-0">
        <p className="text-[13px] font-medium leading-4 text-q3-ink">{at ? fmtTime(at) : '—'}</p>
        <p className="mt-0.5 truncate text-[11.5px] leading-[14px] text-q3-muted">{r.mode ?? '—'}</p>
      </div>
      <div className="flex min-w-0 items-center gap-2.5">
        <Avatar name={row.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-[17px] text-q3-ink">{row.name}</p>
          <p className="mt-px truncate text-xs leading-[15px] text-q3-muted">{row.designation}</p>
        </div>
      </div>
      <div className="min-w-0 pr-2">
        <p className="truncate text-[13px] font-medium leading-4 text-q3-ink">{row.company}</p>
        <p className="mt-0.5 truncate text-xs leading-[15px] text-q3-muted">{row.jobTitle}</p>
      </div>
      <div>
        <RoundTag>{r.label}</RoundTag>
      </div>
      <div className="min-w-0">
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

type UpNext = NonNullable<InterviewsWeek['upNext']>;

/** Keyed by round, so its mutations and pending states belong to one interview. */
function UpNextCard({ item, now, onJoin }: { item: UpNext; now: number; onJoin: (url: string) => void }) {
  const toast = useQ3Toast();
  const navigate = useNavigate();
  const r = item.round;
  const at = r.scheduledAt;
  const logContact = useLogContact(item.mapId);
  const remind = useRemind();
  const checklist = useChecklist();
  const reschedule = useReschedule();
  const conducted = useMarkConducted();
  const inPerson = IN_PERSON.has(r.mode ?? '');
  const started = !!at && new Date(at).getTime() <= now;
  const m = at ? minutesUntil(at, now) : 0;

  const call = () =>
    logContact.mutate(
      { channel: 'Call', note: `Called ${firstName(item.name)}`, roundId: r.roundId },
      {
        onSuccess: () => {
          toast.success('Calling candidate…', 'The call is logged automatically');
          if (item.phone) window.location.href = `tel:${item.phone.replace(/\s+/g, '')}`;
        },
        onError: (err) => toast.error('Could not log the call', getErrorMessage(err)),
      },
    );

  const mail = () => {
    const subject = `Interview details — ${item.company} ${item.jobTitle} (${roundTitle(r)})`;
    const body = [
      `Hi ${firstName(item.name)},`,
      '',
      `A reminder of your ${roundTitle(r)} interview with ${item.company} for ${item.jobTitle}.`,
      at ? `When: ${relativeDay(at)}, ${slotRange(at, r.durationMins)}` : '',
      r.mode ? `Mode: ${r.mode}` : '',
      r.meetingLink && !inPerson ? `Link: ${r.meetingLink}` : '',
    ]
      .filter((l, i) => l || i < 2)
      .join('\n');
    window.location.href = `mailto:${item.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success('Email draft opened', 'Template: interview details');
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied', bareLink(url));
    } catch {
      toast.error('Could not copy the link', 'Your browser blocked clipboard access');
    }
  };

  const sendRemind = () =>
    remind.mutate(r.roundId, {
      onSuccess: (res) =>
        toast.success(`Reminder sent to ${res.name || item.name}`, `Mail · ${roundTitle(r)}${at ? ` at ${fmtTime(at)}` : ''}`),
      onError: (err) => toast.error('Could not send the reminder', getErrorMessage(err)),
    });

  const toggle = (item_: 'candidateConfirmed' | 'candidateJoined', done: boolean) =>
    checklist.mutate(
      { roundId: r.roundId, item: item_, done },
      { onError: (err) => toast.error('Could not update the checklist', getErrorMessage(err)) },
    );

  const onReschedule = async () => {
    try {
      const res = await reschedule.mutateAsync(r.roundId);
      toast.success(
        'Interview released',
        res.status === 'NoShow' ? 'Marked as no-show · back to Slot Scheduling' : 'Back to Slot Scheduling',
      );
      navigate(`/q3/scheduling/${res.mapId ?? item.mapId}`);
    } catch (err) {
      toast.error('Could not reschedule', getErrorMessage(err));
    }
  };

  const onConducted = () =>
    conducted.mutate(r.roundId, {
      onSuccess: (res) => {
        toast.success('Marked conducted', `Waiting for ${item.company}’s result`);
        navigate(`/q3/decisions/${res.mapId ?? item.mapId}`);
      },
      onError: (err) => toast.error('Could not mark conducted', getErrorMessage(err)),
    });

  const joinAt = at ? new Date(new Date(at).getTime() - 5 * 60_000) : null;
  const pendingChecklist =
    checklist.isPending && checklist.variables ? checklist.variables.item : null;

  return (
    <Q3Card className="flex flex-col">
      <div className="flex items-center gap-3 border-b border-q3-line px-5 py-[18px]">
        <IconTile icon={Video} tone="blue" size={40} className="rounded-[10px]" />
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-[18px] text-q3-ink">Up next · {roundTitle(r)}</h2>
          <p className="mt-px truncate text-xs leading-[15px] text-q3-muted">
            {at ? `${relativeDay(at, new Date(now))}, ${slotRange(at, r.durationMins)}` : 'Time not set'}
            {r.mode && ` · ${r.mode}`}
          </p>
        </div>
        {at && <Pill tone="blue">{m > 0 ? inLabel(at) : 'In progress'}</Pill>}
      </div>

      <div className="space-y-4 px-5 pb-[18px] pt-4">
        <div className="space-y-2">
          <SectionLabel>Candidate</SectionLabel>
          <div className="flex items-center gap-2.5 rounded-[10px] border border-q3-line px-[11px] py-[9px]">
            <Avatar name={item.name} size={30} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13.5px] font-semibold leading-4 text-q3-ink">{item.name}</p>
              <p className="mt-px truncate text-xs leading-[15px] text-q3-muted">
                {item.company} — {item.jobTitle}
              </p>
            </div>
            <IconButton label={`Call ${item.name}`} onClick={call} disabled={logContact.isPending}>
              <Phone className="h-3.5 w-3.5" />
            </IconButton>
            <IconButton label={`Email ${item.name}`} onClick={mail} disabled={!item.email}>
              <Mail className="h-3.5 w-3.5" />
            </IconButton>
          </div>
        </div>

        <div className="space-y-2">
          <SectionLabel>{inPerson ? 'Venue' : 'Meeting link'}</SectionLabel>
          <div className="flex items-center gap-2.5 rounded-[10px] border border-q3-line bg-q3-head px-[11px] py-[9px]">
            {inPerson ? (
              <>
                <MapPin className="h-[15px] w-[15px] shrink-0 text-q3-ink-soft" aria-hidden />
                <span className="text-[12.5px] font-medium leading-[15px] text-q3-ink">
                  {item.officeAddress || `${r.mode} · office address is in the invite`}
                </span>
              </>
            ) : r.meetingLink ? (
              <>
                <Video className="h-[15px] w-[15px] shrink-0 text-q3-ink-soft" aria-hidden />
                <button
                  type="button"
                  onClick={() => onJoin(r.meetingLink!)}
                  className="min-w-0 flex-1 truncate text-left text-[12.5px] font-medium leading-[15px] text-q3-ink hover:text-q3-blue"
                >
                  {bareLink(r.meetingLink)}
                </button>
                <button
                  type="button"
                  onClick={() => void copy(r.meetingLink!)}
                  className="rounded px-1 text-[12.5px] font-semibold leading-[15px] text-q3-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40"
                >
                  Copy
                </button>
              </>
            ) : (
              <span className="text-[12.5px] leading-[15px] text-q3-muted">No meeting link on this round</span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <SectionLabel>Interviewers</SectionLabel>
          {r.interviewers.length === 0 ? (
            <p className="text-[12.5px] text-q3-muted">No interviewers added</p>
          ) : (
            <ul className="space-y-2">
              {r.interviewers.map((p) => (
                <li key={`${p.name}-${p.email ?? ''}`} className="flex items-center gap-2.5">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-q3-chip text-[10px] font-semibold text-q3-ink-mid"
                    aria-hidden
                  >
                    {initialsOf(p.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-semibold leading-[15px] text-q3-ink">
                      {p.title ? `${p.name} · ${p.title}` : p.name}
                    </p>
                    {p.email && <p className="truncate text-[11.5px] leading-[14px] text-q3-muted">{p.email}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-2">
          <SectionLabel>Day-of checklist</SectionLabel>
          <ul className="space-y-2">
            <CheckRow done={!!r.invitesSentAt} label="Invites sent to candidate & panel" right={r.invitesSentAt ? whenLabel(r.invitesSentAt) : 'Not sent'} />
            <CheckRow
              done={!!r.reminderSentAt}
              label="Reminder mail to candidate"
              right={r.reminderSentAt ? whenLabel(r.reminderSentAt) : remind.isPending ? 'Sending…' : 'Send now'}
              onClick={r.reminderSentAt ? undefined : sendRemind}
              busy={remind.isPending}
              actionLabel="Send reminder mail to candidate"
            />
            <CheckRow
              done={!!r.candidateConfirmedAt}
              label="Candidate confirmed on call"
              right={r.candidateConfirmedAt ? whenLabel(r.candidateConfirmedAt) : 'Pending'}
              onClick={() => toggle('candidateConfirmed', !r.candidateConfirmedAt)}
              busy={pendingChecklist === 'candidateConfirmed'}
              toggle
            />
            <CheckRow
              done={!!r.candidateJoinedAt}
              label="Check candidate joined"
              right={r.candidateJoinedAt ? whenLabel(r.candidateJoinedAt) : joinAt ? `At ${fmtTime(joinAt)}` : 'Pending'}
              rightTone={r.candidateJoinedAt ? undefined : 'amber'}
              onClick={() => toggle('candidateJoined', !r.candidateJoinedAt)}
              busy={pendingChecklist === 'candidateJoined'}
              toggle
              emphasize
            />
          </ul>
        </div>
      </div>

      <div className="mt-auto flex gap-2 border-t border-q3-line px-5 py-[15px]">
        <Q3Button onClick={() => void onReschedule()} loading={reschedule.isPending} disabled={conducted.isPending}>
          Reschedule
        </Q3Button>
        <span className="flex flex-1" title={started ? undefined : 'Available once the interview starts'}>
          <Q3Button
            variant="primary"
            icon={Check}
            className="w-full disabled:bg-q3-chip disabled:text-q3-ink-soft"
            disabled={!started || reschedule.isPending}
            loading={conducted.isPending}
            onClick={onConducted}
          >
            Mark conducted
          </Q3Button>
        </span>
      </div>
    </Q3Card>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-q3-blue-soft text-q3-blue transition hover:bg-q3-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40 disabled:opacity-50"
    >
      {children}
    </button>
  );
}

/** One checklist line. Interactive lines are buttons; "toggle" lines can be un-ticked. */
function CheckRow({
  done,
  label,
  right,
  rightTone,
  onClick,
  busy,
  toggle,
  emphasize,
  actionLabel,
}: {
  done: boolean;
  label: string;
  right: string;
  rightTone?: 'amber';
  onClick?: () => void;
  busy?: boolean;
  toggle?: boolean;
  emphasize?: boolean;
  actionLabel?: string;
}) {
  const inner = (
    <>
      <span
        className={cn(
          'inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full',
          done ? 'bg-q3-green text-white' : 'border-[1.5px] border-q3-line-strong bg-q3-surface',
          busy && 'animate-pulse',
        )}
        aria-hidden
      >
        {done && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[12.5px] leading-[15px]',
          !done && emphasize ? 'font-semibold text-q3-ink' : 'font-medium text-q3-ink-soft',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'shrink-0 text-[11.5px] leading-[14px]',
          rightTone === 'amber' ? 'text-q3-amber' : !done && onClick ? 'font-semibold text-q3-blue' : 'text-q3-muted',
        )}
      >
        {right}
      </span>
    </>
  );
  if (!onClick) return <li className="flex items-center gap-2.5">{inner}</li>;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        aria-pressed={toggle ? done : undefined}
        aria-label={actionLabel}
        className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2.5 rounded-md px-1 text-left transition hover:bg-q3-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40 disabled:cursor-wait"
      >
        {inner}
      </button>
    </li>
  );
}
