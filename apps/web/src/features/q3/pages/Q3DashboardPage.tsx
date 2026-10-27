import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileCheck2,
  Folder,
  ListFilter,
  Mail,
  Search,
  Undo2,
  Users,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { useDebounce } from '@/hooks/useDebounce';
import { Q3Shell } from '../components/Q3Shell';
import { useQ3Toast } from '../components/q3-toast-context';
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
  SkeletonRows,
  TabChip,
  TableHead,
} from '../components/primitives';
import { useLogContact, useNudge, useQ3Dashboard, useQ3Pipeline, useSendDecisionMail } from '../q3.api';
import { exportHiringReport, quarterKey, quarterMonths } from '../q3-report';
import { STAGE_TABS, TONE_TEXT, firstName, nextDueLines, stageHref, stagePill, type Tone } from '../q3.format';
import type { DashboardAction, PipelineRow, PipelineTab } from '../q3.types';

/** "Good morning" until noon, "Good afternoon" until 5 PM, then "Good evening" — the browser's clock. */
function greeting(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * 01 · Q3 Dashboard — the coordinator's landing screen: four stage KPIs, the cross-stage
 * Candidate Pipeline and the "Needs your action" queue the API derives from live state.
 */
export default function Q3DashboardPage() {
  return (
    <Q3Shell title={greeting()} subtitle="Recruitment coordination & interview workspace">
      <div className="flex flex-col gap-5">
        <Kpis />
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <CandidatePipeline />
          <NeedsYourAction />
        </div>
      </div>
    </Q3Shell>
  );
}

// ── KPIs ───────────────────────────────────────────────────────────────

function Kpis() {
  const { data, isPending, isError, error, refetch } = useQ3Dashboard();

  // An error here must not render as four zeros — that would read as "nothing to do".
  if (isError) {
    return (
      <Q3Card>
        <CardMessage
          icon={AlertCircle}
          title="Couldn't load the workspace numbers"
          body={getErrorMessage(error)}
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      </Q3Card>
    );
  }

  const k = data?.kpis;
  const counted = (n: number | undefined, label: string) => (n ? `${n} ${label}` : null);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        to="/q3/referred"
        icon={FileCheck2}
        tone="blue"
        value={k?.referred.value ?? 0}
        badge="from Q2"
        title="Referred CVs"
        help="From Q2 · ready to forward"
        loading={isPending}
      />
      <KpiCard
        to="/q3/company-review"
        icon={Clock}
        tone="amber"
        value={k?.companyReview.value ?? 0}
        badge={counted(k?.companyReview.expiring, 'expiring')}
        title="Company Review"
        help="Within 14-day window"
        loading={isPending}
      />
      <KpiCard
        to="/q3/interviews"
        icon={Video}
        tone="green"
        value={k?.interviewsWeek.value ?? 0}
        badge={counted(k?.interviewsWeek.today, 'today')}
        title="Interviews · Week"
        help="Across R1 · R2 · R3 · Final"
        loading={isPending}
      />
      <KpiCard
        to="/q3/documents"
        icon={Folder}
        tone="red"
        value={k?.docsPending.value ?? 0}
        badge={counted(k?.docsPending.reRequested, 're-requested')}
        title="Docs Pending"
        help="Upload, verify or approval"
        loading={isPending}
      />
    </div>
  );
}

// ── Candidate Pipeline ─────────────────────────────────────────────────

const PIPE_COLS = 'grid grid-cols-[minmax(232px,1fr)_150px_140px_62px_122px_20px] items-center';

/**
 * Every live application, soonest-due first. The search box is seeded from `?search=`, which
 * the topbar's Quick search writes — so a quick search lands here already filtered.
 */
function CandidatePipeline() {
  const [params] = useSearchParams();
  const urlSearch = params.get('search') ?? '';
  const [search, setSearch] = useState(urlSearch);
  // A second Quick search while already on the dashboard changes the URL, not the mount.
  const [seenUrlSearch, setSeenUrlSearch] = useState(urlSearch);
  if (urlSearch !== seenUrlSearch) {
    setSeenUrlSearch(urlSearch);
    setSearch(urlSearch);
  }
  const debounced = useDebounce(search.trim(), 300);
  const [stage, setStage] = useState<PipelineTab>('all');
  const [company, setCompany] = useState('');

  const { data, isPending, isError, error, refetch } = useQ3Pipeline({
    stage,
    search: debounced || undefined,
    company: company || undefined,
  });

  const total = data?.total ?? 0;
  const filtered = Boolean(debounced || company || stage !== 'all');

  return (
    <Q3Card className="min-w-0">
      <CardHeader
        title="Candidate Pipeline"
        subtitle={data ? `${total} candidate${total === 1 ? '' : 's'} · sorted by next due` : '\u00a0'}
      >
        <div className="flex w-full flex-wrap items-center gap-2.5 sm:w-auto">
          <label className="relative flex min-w-0 flex-1 items-center sm:w-[197px] sm:flex-none">
            <span className="sr-only">Search the pipeline</span>
            <Search className="pointer-events-none absolute left-3 h-[15px] w-[15px] text-q3-muted-light" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, company…"
              className="h-[33px] w-full rounded-[9px] border border-q3-line bg-q3-surface pl-[35px] pr-3 text-[12.5px] text-q3-ink outline-none transition placeholder:text-q3-muted-light focus:border-q3-blue focus:ring-2 focus:ring-q3-blue/15"
            />
          </label>
          <CompanyFilter companies={data?.companies ?? []} value={company} onChange={setCompany} />
          <ExportReport />
        </div>
      </CardHeader>

      <div className="flex gap-2 overflow-x-auto px-5 pb-4" role="group" aria-label="Filter by stage">
        {STAGE_TABS.map((t) => (
          <TabChip key={t.key} active={stage === t.key} onClick={() => setStage(t.key as PipelineTab)}>
            {t.label}
          </TabChip>
        ))}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[766px]">
          <TableHead className={PIPE_COLS}>
            <span>Candidate</span>
            <span>Company · Role</span>
            <span>Stage</span>
            <span>Round</span>
            <span>Next due</span>
            <span aria-hidden />
          </TableHead>

          {isPending ? (
            <SkeletonRows rows={6} />
          ) : isError ? (
            <CardMessage
              icon={AlertCircle}
              title="Couldn't load the pipeline"
              body={getErrorMessage(error)}
              action={{ label: 'Retry', onClick: () => void refetch() }}
            />
          ) : data.rows.length === 0 ? (
            <CardMessage
              icon={Users}
              title={filtered ? 'No candidates match' : 'No candidates in the pipeline yet'}
              body={filtered ? 'Try another stage, company or search.' : 'CVs referred by Q2 will appear here.'}
              action={
                filtered
                  ? {
                      label: 'Clear filters',
                      onClick: () => {
                        setStage('all');
                        setCompany('');
                        setSearch('');
                      },
                    }
                  : undefined
              }
            />
          ) : (
            <ul>
              {data.rows.map((row) => (
                <PipelineRowItem key={row.mapId} row={row} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </Q3Card>
  );
}

function PipelineRowItem({ row }: { row: PipelineRow }) {
  const pill = stagePill(row.stage, row.stageDetail);
  const due = nextDueLines(row.next);
  return (
    <li className="border-b border-q3-line last:border-b-0">
      <Link
        to={stageHref(row.stage, row.mapId)}
        className={cn(
          PIPE_COLS,
          'px-5 py-[13px] transition hover:bg-q3-field focus-visible:bg-q3-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-q3-blue/40',
        )}
      >
        <span className="flex min-w-0 items-center gap-2.5 pr-3">
          <Avatar name={row.name} />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-[17px] text-q3-ink">{row.name}</span>
            <span className="mt-px block truncate text-xs leading-[15px] text-q3-muted">{row.designation}</span>
          </span>
        </span>
        <span className="min-w-0 pr-3">
          <span className="block truncate text-[13px] font-medium leading-4 text-q3-ink">{row.company}</span>
          <span className="mt-px block truncate text-xs leading-[15px] text-q3-muted">{row.jobTitle}</span>
        </span>
        <span>
          <Pill tone={pill.tone}>{pill.label}</Pill>
        </span>
        <span>
          <RoundTag>{row.round ?? '—'}</RoundTag>
        </span>
        <span className="min-w-0">
          <span className={cn('block truncate text-[13px] font-medium leading-4', TONE_TEXT[due.tone])}>{due.primary}</span>
          {due.secondary && (
            <span className="mt-px block truncate text-[11.5px] leading-[14px] text-q3-muted">{due.secondary}</span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 text-q3-muted-light" aria-hidden />
      </Link>
    </li>
  );
}

/**
 * "Report exported · Q3_hiring_report_Jul–Sep.pdf" — the quarterly hiring report, for this
 * quarter or the last one.
 */
function ExportReport() {
  const toast = useQ3Toast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
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

  const run = async (quarter: string) => {
    setOpen(false);
    setBusy(true);
    try {
      const file = await exportHiringReport(quarter);
      toast.success('Report exported', `${file} · saved`);
    } catch (err) {
      toast.error("Couldn't export the report", getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { key: quarterKey(0), label: `This quarter (${quarterMonths(quarterKey(0))})` },
    { key: quarterKey(-1), label: `Last quarter (${quarterMonths(quarterKey(-1))})` },
  ];

  return (
    <div className="relative" ref={ref}>
      <Q3Button
        size="sm"
        variant="secondary"
        icon={Download}
        loading={busy}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        Export
      </Q3Button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-q3-line bg-q3-surface p-1.5 shadow-q3-pop">
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase leading-[13px] tracking-[0.6px] text-q3-muted">Hiring report (PDF)</p>
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              role="menuitem"
              onClick={() => void run(o.key)}
              className="flex w-full rounded-lg px-2.5 py-2 text-left text-[13px] text-q3-ink-soft hover:bg-q3-field"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** The "Filters" button: a small popover to narrow the pipeline to one company. */
function CompanyFilter({
  companies,
  value,
  onChange,
}: {
  companies: string[];
  value: string;
  onChange: (company: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // The selected company stays listed even if the current page of results no longer names it.
  const options = value && !companies.includes(value) ? [value, ...companies] : companies;
  const pick = (c: string) => {
    onChange(c);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <Q3Button
        size="sm"
        variant="secondary"
        icon={ListFilter}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn(value && 'border-q3-blue text-q3-blue')}
      >
        Filters{value ? ' · 1' : ''}
      </Q3Button>
      {open && (
        <div
          role="dialog"
          aria-label="Filter by company"
          className="absolute right-0 z-20 mt-2 w-60 rounded-xl border border-q3-line bg-q3-surface p-1.5 shadow-q3-pop"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase leading-[13px] tracking-[0.6px] text-q3-muted">Company</p>
          <div className="max-h-64 overflow-y-auto" role="radiogroup" aria-label="Company">
            {[{ key: '', label: 'All companies' }, ...options.map((c) => ({ key: c, label: c }))].map((o) => (
              <button
                key={o.key || '__all'}
                type="button"
                role="radio"
                aria-checked={value === o.key}
                onClick={() => pick(o.key)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[13px] transition hover:bg-q3-field focus-visible:bg-q3-field focus-visible:outline-none',
                  value === o.key ? 'font-semibold text-q3-blue' : 'text-q3-ink-soft',
                )}
              >
                <span
                  className={cn(
                    'h-3.5 w-3.5 shrink-0 rounded-full border',
                    value === o.key ? 'border-[4px] border-q3-blue' : 'border-q3-line-strong',
                  )}
                  aria-hidden
                />
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
          {value && (
            <div className="mt-1 border-t border-q3-line pt-1">
              <button
                type="button"
                onClick={() => pick('')}
                className="w-full rounded-lg px-2.5 py-2 text-left text-[12.5px] font-semibold text-q3-blue hover:bg-q3-field focus-visible:bg-q3-field focus-visible:outline-none"
              >
                Clear filter
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Needs your action ──────────────────────────────────────────────────

/** "Round 2" from "R2"; the Final round reads "final round". */
function roundWords(label: string) {
  const n = /^R(\d+)$/i.exec(label)?.[1];
  return n ? `Round ${n}` : label.toLowerCase() === 'final' ? 'final round' : label;
}

/** "R1" → "Round 2". */
function nextRoundWords(label: string) {
  const n = /^R(\d+)$/i.exec(label)?.[1];
  return n ? `Round ${Number(n) + 1}` : roundWords(label);
}

function NeedsYourAction() {
  const { data, isPending, isError, error, refetch } = useQ3Dashboard();
  const count = data?.actions.length ?? 0;

  return (
    <Q3Card className="min-w-0">
      <div className="flex items-center gap-2 border-b border-q3-line px-5 py-[18px]">
        <h2 className="text-base font-semibold leading-[19px] text-q3-ink">Needs your action</h2>
        {count > 0 && (
          <Pill tone="red" dot={false}>
            {count}
            <span className="sr-only"> waiting</span>
          </Pill>
        )}
      </div>

      {isPending ? (
        <SkeletonRows rows={4} />
      ) : isError ? (
        <CardMessage
          icon={AlertCircle}
          title="Couldn't load your actions"
          body={getErrorMessage(error)}
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      ) : count === 0 ? (
        <CardMessage icon={CheckCircle2} title="You're all caught up" body="Nothing needs your attention right now." />
      ) : (
        <ul>
          {data.actions.map((a, i) => (
            <ActionItem key={'mapId' in a ? `${a.kind}-${a.mapId}` : `${a.kind}-${i}`} action={a} />
          ))}
        </ul>
      )}
    </Q3Card>
  );
}

function ActionItem({ action }: { action: DashboardAction }) {
  switch (action.kind) {
    case 'contactForSlot':
      return <ContactAction action={action} />;
    case 'sendDecisionMail':
      return <DecisionMailAction action={action} />;
    case 'decisionOverdue':
      return <NudgeAction action={action} />;
    case 'verifyDocs':
      return <VerifyDocsAction action={action} />;
    case 'autoExpired':
      return <AutoExpiredAction action={action} />;
  }
}

/**
 * One action row. The title is a stretched link so the whole row opens the screen, while the
 * button sits above it as its own control — no button nested inside a link.
 */
function ActionRow({
  icon,
  tone,
  title,
  sub,
  to,
  button,
}: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  sub: string;
  to: string;
  button: React.ReactNode;
}) {
  return (
    <li className="relative flex gap-3 border-b border-q3-line px-5 py-3.5 transition last:border-b-0 hover:bg-q3-field">
      <IconTile icon={icon} tone={tone} size={34} />
      <div className="min-w-0 flex-1">
        <Link
          to={to}
          className="block text-[13.5px] font-semibold leading-4 text-q3-ink outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-inset focus-visible:after:ring-q3-blue/40"
        >
          {title}
        </Link>
        <p className="mt-[3px] text-xs leading-[17px] text-q3-muted">{sub}</p>
      </div>
      <div className="relative z-10 self-start">{button}</div>
    </li>
  );
}

function ContactAction({ action: a }: { action: Extract<DashboardAction, { kind: 'contactForSlot' }> }) {
  const toast = useQ3Toast();
  const log = useLogContact(a.mapId);
  const first = firstName(a.name);
  const call = () =>
    log.mutate(
      { channel: 'Call', note: `Called ${first}`, roundId: a.roundId },
      {
        onSuccess: () => {
          toast.success('Calling candidate…', 'The call is logged automatically');
          if (a.phone) window.location.href = `tel:${a.phone}`;
        },
        onError: (err) => toast.error("Couldn't log the call", getErrorMessage(err)),
      },
    );
  return (
    <ActionRow
      icon={Calendar}
      tone="violet"
      title={`Contact ${first} for a slot`}
      sub={`${a.company} shared ${a.slots} slot${a.slots === 1 ? '' : 's'} · ${a.attempts} attempt${a.attempts === 1 ? '' : 's'} so far`}
      to={`/q3/scheduling/${a.mapId}`}
      button={
        <Q3Button size="sm" variant="soft" onClick={call} loading={log.isPending} aria-label={`Call ${a.name}`}>
          Call
        </Q3Button>
      }
    />
  );
}

function DecisionMailAction({ action: a }: { action: Extract<DashboardAction, { kind: 'sendDecisionMail' }> }) {
  const toast = useQ3Toast();
  const send = useSendDecisionMail();
  const first = firstName(a.name);
  // Named for the round the candidate moves on to, as the designs write it: "Send Round 2
  // congrats mail" for someone who cleared R1.
  const round = a.decision === 'FinalRound' ? 'final round' : nextRoundWords(a.round);
  const onSend = () =>
    send.mutate(a.roundId, {
      onSuccess: () => toast.success(`${round[0].toUpperCase()}${round.slice(1)} congrats mail sent`, `To ${a.name} · ${a.company}`),
      onError: (err) => toast.error("Couldn't send the mail", getErrorMessage(err)),
    });
  return (
    <ActionRow
      icon={Mail}
      tone="green"
      title={`Send ${round} congrats mail`}
      sub={`${first} cleared ${a.round} at ${a.company}`}
      to={`/q3/decisions/${a.mapId}`}
      button={
        <Q3Button size="sm" variant="soft" onClick={onSend} loading={send.isPending} aria-label={`Send ${round} congrats mail to ${a.name}`}>
          Send
        </Q3Button>
      }
    />
  );
}

function NudgeAction({ action: a }: { action: Extract<DashboardAction, { kind: 'decisionOverdue' }> }) {
  const toast = useQ3Toast();
  const nudge = useNudge();
  const first = firstName(a.name);
  const onNudge = () =>
    nudge.mutate(a.mapId, {
      onSuccess: () => toast.success(`Nudge sent to ${a.company}`, `Reminder for ${first}’s ${roundWords(a.round)} result`),
      onError: (err) => toast.error("Couldn't send the nudge", getErrorMessage(err)),
    });
  return (
    <ActionRow
      icon={Clock}
      tone="amber"
      title="Company decision overdue"
      sub={`${first} · ${a.round} · ${a.company} · ${a.daysLate} day${a.daysLate === 1 ? '' : 's'} late`}
      to={`/q3/decisions/${a.mapId}`}
      button={
        <Q3Button size="sm" variant="soft" onClick={onNudge} loading={nudge.isPending} aria-label={`Nudge ${a.company} about ${a.name}`}>
          Nudge
        </Q3Button>
      }
    />
  );
}

function VerifyDocsAction({ action: a }: { action: Extract<DashboardAction, { kind: 'verifyDocs' }> }) {
  const navigate = useNavigate();
  const to = `/q3/documents/${a.mapId}`;
  return (
    <ActionRow
      icon={Folder}
      tone="blue"
      title={`Verify ${a.count} document${a.count === 1 ? '' : 's'}`}
      sub={`${firstName(a.name)} uploaded ${a.documents.join(' & ').toLowerCase()}`}
      to={to}
      button={
        <Q3Button size="sm" variant="soft" onClick={() => navigate(to)} aria-label={`Review ${a.name}'s documents`}>
          Review
        </Q3Button>
      }
    />
  );
}

function AutoExpiredAction({ action: a }: { action: Extract<DashboardAction, { kind: 'autoExpired' }> }) {
  const navigate = useNavigate();
  const to = '/q3/returned?tab=expired';
  return (
    <ActionRow
      icon={Undo2}
      tone="red"
      title={`${a.count} CV${a.count === 1 ? '' : 's'} auto-expired`}
      sub="Returned to Q2 with status update on Day 14"
      to={to}
      button={
        <Q3Button size="sm" variant="soft" onClick={() => navigate(to)} aria-label="View auto-expired CVs">
          View
        </Q3Button>
      }
    />
  );
}
