import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  CalendarDays,
  Check,
  Clock,
  Link2,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import {
  useConfirmSlot,
  useGenerateMeetingLink,
  useLogContact,
  useQ3Scheduling,
  useRequestSlots,
  useSlotAvailability,
} from '../q3.api';
import {
  TONE_PILL,
  avatarTone,
  dot,
  expLabel,
  firstName,
  fmtDay,
  fmtDayTime,
  fmtLongDay,
  fmtTime,
  initialsOf,
  isSameDay,
  linkHost,
  relativeDayTime,
  type Tone,
} from '../q3.format';
import type { ContactChannel, Q3Round, Q3Slot, Recipients, Scheduling } from '../q3.types';
import { Crumbs, Q3Shell } from '../components/Q3Shell';
import { QueueIndex, QueueSwitcher } from '../components/QueueSwitcher';
import { RoundSetupModal } from '../components/RoundSetupModal';
import { useQ3Toast } from '../components/q3-toast-context';
import { roundTitle } from '../components/round-labels';
import { slotDay, slotRange } from '../components/schedule-format';
import {
  CardHeader,
  CardMessage,
  Pill,
  Q3Button,
  Q3Card,
  Q3Checkbox,
  SectionLabel,
  SkeletonRows,
} from '../components/primitives';

const IN_PERSON = new Set(['Face-to-Face', 'Walk-in']);
const roundName = roundTitle;

/**
 * Slot Scheduling (Figma "04 · Slot Scheduling"). One candidate at a time: the company's
 * slots, the coordinator's contact attempts, and the confirmation mail that goes out the
 * moment a slot is confirmed. Without a candidate it opens the first one in the queue.
 */
export default function Q3SchedulingPage() {
  const { mapId = '' } = useParams();
  if (!mapId) {
    return (
      <QueueIndex
        name="scheduling"
        title="Schedule Interview"
        subtitle="Scheduling"
        emptyTitle="Nothing to schedule"
        emptyBody="Shortlisted candidates waiting for an interview slot appear here."
      />
    );
  }
  return <SchedulingScreen mapId={Number(mapId)} />;
}

function SchedulingScreen({ mapId }: { mapId: number }) {
  const { data, isLoading, isError, refetch } = useQ3Scheduling(mapId);

  const subtitle = (
    // Block-level flex, like Crumbs, so the detail half ellipsizes on a phone instead of being clipped.
    <span className="flex min-w-0 items-center gap-2">
      <Crumbs root="Scheduling" rootTo="/q3/scheduling">
        {data ? dot(data.candidate.name, data.company, data.round && roundName(data.round)) : null}
      </Crumbs>
      <QueueSwitcher name="scheduling" mapId={mapId} />
    </span>
  );

  return (
    <Q3Shell title="Schedule Interview" subtitle={subtitle}>
      {isLoading ? (
        <div className="space-y-5">
          <Q3Card>
            <SkeletonRows rows={1} />
          </Q3Card>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
            <Q3Card>
              <SkeletonRows rows={4} />
            </Q3Card>
            <Q3Card>
              <SkeletonRows rows={4} />
            </Q3Card>
          </div>
        </div>
      ) : isError || !data ? (
        <Q3Card>
          <CardMessage
            title="Couldn't load this candidate"
            body="Check your connection and try again."
            action={{ label: 'Retry', onClick: () => void refetch() }}
          />
        </Q3Card>
      ) : (
        <SchedulingDetail key={mapId} data={data} />
      )}
    </Q3Shell>
  );
}

/** Keyed by mapId, so the picked slot, link and recipient ticks reset per candidate. */
function SchedulingDetail({ data }: { data: Scheduling }) {
  const toast = useQ3Toast();
  const navigate = useNavigate();
  const { candidate, round } = data;
  const logContact = useLogContact(data.mapId);
  const [setupOpen, setSetupOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);

  const scheduled = round?.status === 'Scheduled';
  const pickedSlot = round?.slots.find((s) => s.slotId === picked && !s.isUnavailable);
  const selected: Q3Slot | undefined =
    pickedSlot ?? round?.slots.find((s) => s.isSelected && (scheduled || !s.isUnavailable));

  const steps = data.steps;
  const doneFlags = [steps.companyShared, steps.contacted, steps.confirmed, steps.invitesSent];
  const firstOpen = doneFlags.findIndex((d) => !d);
  const current = firstOpen === -1 ? 5 : firstOpen + 1;

  const call = () => {
    logContact.mutate(
      { channel: 'Call', note: `Called ${firstName(candidate.name)}`, roundId: round?.roundId },
      {
        onSuccess: () => {
          toast.success('Calling candidate…', 'The call is logged automatically');
          if (candidate.phone) window.location.href = `tel:${candidate.phone.replace(/\s+/g, '')}`;
        },
        onError: (err) => toast.error('Could not log the call', getErrorMessage(err)),
      },
    );
  };

  const email = () => {
    const open = round?.slots.filter((s) => !s.isUnavailable) ?? [];
    const lines = open.map((s) => `• ${slotDay(s.at)}, ${slotRange(s.at, round?.durationMins ?? 45)}`);
    const subject = `Interview slots — ${data.company} ${data.jobTitle}`;
    const body = [
      `Hi ${firstName(candidate.name)},`,
      '',
      `${data.company} has shared these slots for your ${data.jobTitle} interview${round ? ` (${roundName(round)})` : ''}:`,
      '',
      ...(lines.length ? lines : ['(slots to follow)']),
      '',
      'Please reply with the one that works for you.',
    ].join('\n');
    window.location.href = `mailto:${candidate.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success('Email draft opened', 'Template: interview details');
  };

  return (
    <div className="space-y-5">
      {/* Candidate header + stepper */}
      <Q3Card className="space-y-[18px] px-5 py-[18px]">
        <div className="flex flex-wrap items-center gap-3.5">
          <span
            className={cn('inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[17px] font-semibold', TONE_PILL[avatarTone(candidate.name)])}
            aria-hidden
          >
            {initialsOf(candidate.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[17px] font-semibold leading-[21px] text-q3-ink">{candidate.name}</p>
              {data.shortlisted && <Pill tone="green">Shortlisted</Pill>}
            </div>
            <p className="mt-1 text-[12.5px] leading-[15px] text-q3-muted">
              {dot(candidate.designation, expLabel(candidate.totalExp), candidate.currentEmployer, candidate.location)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3.5">
            <InfoChip icon={CalendarDays}>{`${data.company} — ${data.jobTitle}`}</InfoChip>
            {round?.mode && <InfoChip icon={Video}>{round.mode}</InfoChip>}
            {round && <InfoChip icon={Clock}>{`${round.durationMins} min`}</InfoChip>}
            <Q3Button size="sm" icon={Phone} onClick={call} loading={logContact.isPending}>
              Call
            </Q3Button>
            <Q3Button size="sm" icon={Mail} onClick={email} disabled={!candidate.email}>
              Email
            </Q3Button>
          </div>
        </div>
        <ScheduleStepper current={current} />
      </Q3Card>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_392px]">
        <div className="min-w-0 space-y-5">
          {round ? (
            <SlotsCard data={data} round={round} selected={selected} onPick={setPicked} onEdit={() => setSetupOpen(true)} />
          ) : (
            <Q3Card>
              <CardMessage
                icon={CalendarDays}
                title="No interview round yet"
                body={`Set up the round from Company Review once ${data.company} shortlists.`}
                action={{ label: 'Open Company Review', onClick: () => navigate(`/q3/company-review?mapId=${data.mapId}`) }}
              />
            </Q3Card>
          )}
          <ContactLogCard data={data} />
        </div>
        {round && <ConfirmCard data={data} round={round} selected={selected} />}
      </div>

      {round && (
        <RoundSetupModal
          open={setupOpen}
          onClose={() => setSetupOpen(false)}
          mapId={data.mapId}
          round={round}
          candidateName={candidate.name}
          company={data.company}
        />
      )}
    </div>
  );
}

function InfoChip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-q3-line bg-q3-field px-2.5 py-1.5 text-xs font-medium leading-[15px] text-q3-ink-soft">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  );
}

const STEPS = ['Company shared slots', 'Contact candidate', 'Slot confirmed', 'Invites sent'];

/**
 * The four-step line from the frame: 24px circles, 12.5px labels and a 2px connector that
 * turns green behind a finished step. Local because the shared Stepper is the 22px variant.
 */
function ScheduleStepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-2" aria-label="Scheduling progress">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className={cn('flex items-center gap-2.5', i < STEPS.length - 1 && 'sm:flex-1')}>
            <span className="flex shrink-0 items-center gap-2" aria-current={active ? 'step' : undefined}>
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold leading-[13px]',
                  done && 'bg-q3-green text-white',
                  active && 'bg-q3-blue text-white',
                  !done && !active && 'border-[1.5px] border-q3-line-strong bg-q3-surface text-q3-muted',
                )}
                aria-hidden
              >
                {done ? <Check className="h-[13px] w-[13px]" strokeWidth={3} /> : n}
              </span>
              <span
                className={cn(
                  'whitespace-nowrap text-[12.5px] leading-[15px]',
                  active ? 'font-semibold text-q3-ink' : done ? 'font-medium text-q3-ink-soft' : 'font-medium text-q3-muted',
                )}
              >
                {label}
                {done && <span className="sr-only"> (done)</span>}
              </span>
            </span>
            {i < STEPS.length - 1 && (
              <span className={cn('hidden h-0.5 min-w-6 flex-1 rounded-[1px] sm:block', done ? 'bg-q3-green' : 'bg-q3-skeleton')} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function GrayPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-q3-chip px-2.5 py-1 text-xs font-medium leading-[15px] text-q3-ink-mid">
      {children}
    </span>
  );
}

function SlotsCard({
  data,
  round,
  selected,
  onPick,
  onEdit,
}: {
  data: Scheduling;
  round: Q3Round;
  selected: Q3Slot | undefined;
  onPick: (slotId: number) => void;
  onEdit: () => void;
}) {
  const toast = useQ3Toast();
  const availability = useSlotAvailability();
  const requestSlots = useRequestSlots();
  const scheduled = round.status === 'Scheduled';
  const n = round.slots.length;

  const toggle = (slot: Q3Slot) =>
    availability.mutate(
      { roundId: round.roundId, slotId: slot.slotId, unavailable: !slot.isUnavailable },
      { onError: (err) => toast.error('Could not update the slot', getErrorMessage(err)) },
    );

  const request = () =>
    requestSlots.mutate(round.roundId, {
      onSuccess: (res) =>
        toast.success(
          'New slots requested',
          res.mailed ? 'Company notified · candidate stays in Scheduling' : 'No company email on file — follow up by phone',
        ),
      onError: (err) => toast.error('Could not request slots', getErrorMessage(err)),
    });

  return (
    <Q3Card className="space-y-3.5 px-5 py-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-[19px] text-q3-ink">Company slots</h2>
          <p className="mt-[3px] text-[12.5px] leading-[15px] text-q3-muted">Ask the candidate to pick one available slot</p>
        </div>
        {!scheduled && n > 0 && (
          <Q3Button size="sm" variant="ghost" icon={Pencil} onClick={onEdit}>
            Edit slots
          </Q3Button>
        )}
        {n > 0 && (
          <GrayPill>
            {dot(`${n} slot${n === 1 ? '' : 's'}`, round.slotsSharedAt && `shared ${fmtDay(round.slotsSharedAt)}`)}
          </GrayPill>
        )}
      </div>

      {n === 0 ? (
        <div className="flex flex-col items-center rounded-[10px] border border-q3-line bg-q3-head px-6 py-8 text-center">
          <p className="text-sm font-semibold text-q3-ink">Waiting for {data.company}’s slots</p>
          <p className="mt-1 max-w-sm text-[12.5px] text-q3-muted">Add the slots as soon as the company shares them.</p>
          <Q3Button variant="primary" size="sm" className="mt-4" icon={CalendarDays} onClick={onEdit}>
            Add company slots
          </Q3Button>
        </div>
      ) : (
        <div role="radiogroup" aria-label="Company slots" className="grid gap-3 sm:grid-cols-2">
          {round.slots.map((slot) => (
            <SlotCard
              key={slot.slotId}
              slot={slot}
              round={round}
              checked={selected?.slotId === slot.slotId}
              readOnly={scheduled}
              onPick={() => onPick(slot.slotId)}
              onToggle={() => toggle(slot)}
              busy={availability.isPending && availability.variables?.slotId === slot.slotId}
            />
          ))}
        </div>
      )}

      {!scheduled && (
        <div className="flex flex-wrap items-center gap-3 rounded-[10px] border border-dashed border-q3-line-strong px-3.5 py-3">
          <RefreshCw className="h-4 w-4 shrink-0 text-q3-ink-soft" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold leading-4 text-q3-ink-soft">No slot works for the candidate?</p>
            <p className="mt-px text-xs leading-[15px] text-q3-muted">
              Ask {data.company} for fresh slots — the candidate stays in Scheduling.
            </p>
          </div>
          <Q3Button size="sm" onClick={request} loading={requestSlots.isPending}>
            Request new slots
          </Q3Button>
        </div>
      )}
    </Q3Card>
  );
}

function SlotCard({
  slot,
  round,
  checked,
  readOnly,
  onPick,
  onToggle,
  busy,
}: {
  slot: Q3Slot;
  round: Q3Round;
  checked: boolean;
  readOnly: boolean;
  onPick: () => void;
  onToggle: () => void;
  busy: boolean;
}) {
  const off = slot.isUnavailable && !(readOnly && checked);
  const disabled = readOnly || slot.isUnavailable;
  return (
    <div
      className={cn(
        'group relative rounded-[10px] transition',
        checked ? 'border-[1.5px] border-q3-blue bg-q3-blue-tint' : 'border border-q3-line bg-q3-surface',
        !disabled && !checked && 'hover:border-q3-line-strong',
      )}
    >
      <label className={cn('flex min-h-[63px] items-center gap-3 p-3.5', disabled ? 'cursor-default' : 'cursor-pointer', checked && 'p-[13.5px]')}>
        <input
          type="radio"
          name={`slot-${round.roundId}`}
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={onPick}
        />
        <span
          className={cn(
            'h-[18px] w-[18px] shrink-0 rounded-full bg-q3-surface peer-focus-visible:ring-2 peer-focus-visible:ring-q3-blue/40',
            checked ? 'border-[5px] border-q3-blue' : 'border-[1.5px] border-q3-line-strong',
            off && 'bg-q3-head',
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1">
          <span className={cn('block text-[13.5px] font-semibold leading-4', off ? 'text-q3-muted-light' : 'text-q3-ink')}>
            {slotDay(slot.at)}
          </span>
          <span className={cn('mt-0.5 block text-[12.5px] leading-[15px]', off ? 'text-q3-muted-light' : 'text-q3-muted')}>
            {slotRange(slot.at, round.durationMins)}
          </span>
        </span>
        {readOnly && checked ? (
          <Pill tone="green" dot={false}>
            Confirmed
          </Pill>
        ) : checked ? (
          <Pill tone="green" dot={false}>
            Candidate selected
          </Pill>
        ) : slot.isUnavailable ? (
          <GrayPill>Candidate unavailable</GrayPill>
        ) : null}
      </label>
      {!readOnly && (
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className="absolute right-2.5 top-1 rounded px-1 text-[11px] font-semibold leading-[13px] text-q3-muted opacity-0 transition hover:text-q3-blue focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40 group-hover:opacity-100 disabled:opacity-60"
        >
          {busy ? 'Saving…' : slot.isUnavailable ? 'Mark available' : 'Mark unavailable'}
        </button>
      )}
    </div>
  );
}

const CHANNEL: Record<ContactChannel, { icon: LucideIcon; tone: Tone }> = {
  Call: { icon: Phone, tone: 'amber' },
  Mail: { icon: Mail, tone: 'blue' },
  WhatsApp: { icon: MessageCircle, tone: 'green' },
};

function ContactLogCard({ data }: { data: Scheduling }) {
  const toast = useQ3Toast();
  const log = useLogContact(data.mapId);
  const [channel, setChannel] = useState<ContactChannel>('Call');
  const [note, setNote] = useState('');
  const n = data.contactLog.length;
  const today = new Date();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = note.trim();
    if (!text || log.isPending) return;
    log.mutate(
      { channel, note: text, roundId: data.round?.roundId },
      {
        onSuccess: () => {
          setNote('');
          toast.success('Contact attempt logged', 'Added to the candidate’s contact log');
        },
        onError: (err) => toast.error('Could not log the attempt', getErrorMessage(err)),
      },
    );
  };

  return (
    <Q3Card className="space-y-3.5 px-5 py-[18px]">
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold leading-[19px] text-q3-ink">Contact log</h2>
          <p className="mt-[3px] text-[12.5px] leading-[15px] text-q3-muted">Every call, mail and message with the candidate</p>
        </div>
        <GrayPill>{`${n} attempt${n === 1 ? '' : 's'}`}</GrayPill>
      </div>

      {n === 0 ? (
        <p className="rounded-[10px] bg-q3-head px-4 py-5 text-center text-[12.5px] text-q3-muted">No contact yet</p>
      ) : (
        <ul className="space-y-3.5">
          {data.contactLog.map((entry) => {
            const meta = entry.channel ? CHANNEL[entry.channel] : { icon: MessageSquare, tone: 'gray' as Tone };
            const Icon = meta.icon;
            return (
              <li key={entry.id} className="flex items-center gap-3">
                <span className={cn('inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full', TONE_PILL[meta.tone])}>
                  <Icon className="h-3.5 w-3.5" aria-label={entry.channel ?? 'Note'} />
                </span>
                <p className="min-w-0 flex-1 text-[13px] font-medium leading-4 text-q3-ink-soft">{entry.note}</p>
                <time dateTime={entry.at} className="shrink-0 text-xs leading-[15px] text-q3-muted-light">
                  {isSameDay(new Date(entry.at), today) ? fmtTime(entry.at) : fmtDayTime(entry.at)}
                </time>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <div role="radiogroup" aria-label="Channel" className="flex shrink-0 gap-[3px] rounded-lg bg-q3-chip p-[3px]">
          {(['Call', 'Mail', 'WhatsApp'] as const).map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={channel === c}
              onClick={() => setChannel(c)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs leading-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
                channel === c ? 'bg-q3-surface font-semibold text-q3-blue' : 'font-medium text-q3-muted hover:text-q3-ink-soft',
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <label htmlFor="q3-contact-note" className="sr-only">
          Contact note
        </label>
        <input
          id="q3-contact-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add contact note…"
          maxLength={500}
          className="h-[35px] min-w-0 flex-1 rounded-lg border border-q3-line bg-q3-head px-3 text-[12.5px] text-q3-ink-soft outline-none transition placeholder:text-q3-muted-light focus:border-q3-blue focus:bg-q3-surface focus:ring-2 focus:ring-q3-blue/15"
        />
        <Q3Button type="submit" size="sm" variant="soft" disabled={!note.trim()} loading={log.isPending}>
          Log
        </Q3Button>
      </form>
    </Q3Card>
  );
}

type RecipientKey = keyof Recipients;

function ConfirmCard({ data, round, selected }: { data: Scheduling; round: Q3Round; selected: Q3Slot | undefined }) {
  const toast = useQ3Toast();
  const confirm = useConfirmSlot();
  const generate = useGenerateMeetingLink();
  const scheduled = round.status === 'Scheduled';
  const inPerson = round.mode != null && IN_PERSON.has(round.mode);
  const virtual = round.mode === 'Virtual';
  const { recipients } = data;

  const [link, setLink] = useState(round.meetingLink ?? '');
  const [unticked, setUnticked] = useState<Partial<Record<RecipientKey, boolean>>>({});
  const [errors, setErrors] = useState<{ slot?: string; link?: string; recipients?: string }>({});

  const available: Recipients = {
    candidate: true,
    interviewers: recipients.interviewers.length > 0,
    hr: !!recipients.hr,
    q3: true,
  };
  const ticked = (k: RecipientKey) => available[k] && !unticked[k];
  const rows: Array<{ key: RecipientKey; label: string; who: string }> = [
    { key: 'candidate', label: 'Candidate', who: recipients.candidate },
    { key: 'interviewers', label: 'Interviewer(s)', who: recipients.interviewers.join(', ') || 'No interviewers added' },
    { key: 'hr', label: 'HR', who: recipients.hr ?? 'No HR contact' },
    { key: 'q3', label: 'Q3 (cc)', who: recipients.q3 },
  ];

  const trimmed = link.trim();
  const at = selected?.at ?? null;
  const modeLine = inPerson ? dot(round.mode, data.officeAddress) : dot(round.mode, linkHost(trimmed)) || '—';

  const onGenerate = () =>
    generate.mutate(undefined, {
      onSuccess: (res) => {
        setLink(res.link);
        setErrors((e) => ({ ...e, link: undefined }));
        toast.success('New meeting link generated', 'Added to the confirmation email');
      },
      onError: (err) => toast.error('Could not generate a link', getErrorMessage(err)),
    });

  const onConfirm = async () => {
    const next: typeof errors = {};
    if (!selected) next.slot = 'Pick the slot the candidate chose.';
    if (!inPerson) {
      if (virtual && !trimmed) next.link = 'Add the meeting link for a virtual interview.';
      else if (trimmed && !/^https?:\/\//i.test(trimmed)) next.link = 'The link must start with http:// or https://';
    }
    const picked: Recipients = {
      candidate: ticked('candidate'),
      interviewers: ticked('interviewers'),
      hr: ticked('hr'),
      q3: ticked('q3'),
    };
    if (!Object.values(picked).some(Boolean)) next.recipients = 'Tick at least one recipient.';
    setErrors(next);
    if (Object.keys(next).length || !selected) return;
    try {
      const res = await confirm.mutateAsync({
        roundId: round.roundId,
        slotId: selected.slotId,
        meetingLink: inPerson || !trimmed ? undefined : trimmed,
        recipients: picked,
      });
      toast.success('Invites sent', `${res.sent} recipient${res.sent === 1 ? '' : 's'} · ${relativeDayTime(res.scheduledAt)}`);
    } catch (err) {
      toast.error('Could not confirm the slot', getErrorMessage(err));
    }
  };

  return (
    <Q3Card className="flex flex-col">
      <CardHeader
        bordered
        title={<span className="text-[15px] leading-[18px]">Automatic email on confirmation</span>}
        subtitle={<span className="text-xs">Sent the moment you confirm the slot</span>}
      />
      <div className="space-y-4 px-5 py-4">
        <fieldset className="space-y-2" disabled={scheduled}>
          <legend className="mb-2">
            <SectionLabel>Recipients</SectionLabel>
          </legend>
          {rows.map((r) => (
            <Q3Checkbox
              key={r.key}
              className="flex"
              checked={ticked(r.key)}
              disabled={scheduled || !available[r.key]}
              onChange={(v) => {
                setUnticked((u) => ({ ...u, [r.key]: !v }));
                setErrors((e) => ({ ...e, recipients: undefined }));
              }}
              label={
                <span className="ml-0.5 flex min-w-0 items-baseline gap-2.5">
                  <span className={cn('text-[13px] font-semibold leading-4', available[r.key] ? 'text-q3-ink' : 'text-q3-muted-light')}>{r.label}</span>
                  <span className="truncate text-[12.5px] leading-[15px] text-q3-muted">{r.who}</span>
                </span>
              }
            />
          ))}
          {errors.recipients && <p className="text-[11.5px] text-q3-red">{errors.recipients}</p>}
        </fieldset>

        {inPerson ? (
          <div className="space-y-2">
            <SectionLabel>Office address</SectionLabel>
            <p className="flex items-start gap-2 rounded-lg border border-q3-line bg-q3-head px-3 py-[9px] text-[12.5px] font-medium leading-[15px] text-q3-ink-soft">
              <MapPin className="mt-px h-3.5 w-3.5 shrink-0 text-q3-muted" aria-hidden />
              {data.officeAddress || 'No office address on file'}
            </p>
            <p className="text-[11.5px] leading-[14px] text-q3-muted-light">Added to the confirmation email instead of a meeting link.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label htmlFor="q3-meeting-link">
              <SectionLabel>Google Meet / Teams link</SectionLabel>
            </label>
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-[35px] min-w-0 flex-1 items-center gap-2 rounded-lg border bg-q3-surface px-3 transition focus-within:border-q3-blue focus-within:ring-2 focus-within:ring-q3-blue/15',
                  errors.link ? 'border-q3-red' : 'border-q3-line',
                )}
              >
                <Link2 className="h-3.5 w-3.5 shrink-0 text-q3-ink-soft" aria-hidden />
                <input
                  id="q3-meeting-link"
                  type="url"
                  inputMode="url"
                  value={link}
                  disabled={scheduled}
                  aria-invalid={!!errors.link}
                  aria-describedby={errors.link ? 'q3-meeting-link-error' : undefined}
                  onChange={(e) => {
                    setLink(e.target.value);
                    setErrors((er) => ({ ...er, link: undefined }));
                  }}
                  placeholder="https://meet.google.com/…"
                  className="min-w-0 flex-1 bg-transparent text-[12.5px] font-medium text-q3-ink-soft outline-none placeholder:font-normal placeholder:text-q3-muted-light disabled:text-q3-muted"
                />
              </div>
              <Q3Button size="sm" variant="soft" onClick={onGenerate} loading={generate.isPending} disabled={scheduled}>
                Generate
              </Q3Button>
            </div>
            {errors.link ? (
              <p id="q3-meeting-link-error" className="text-[11.5px] leading-[14px] text-q3-red">
                {errors.link}
              </p>
            ) : (
              <p className="text-[11.5px] leading-[14px] text-q3-muted-light">For Face-to-Face / Walk-in, the office address is added instead.</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          <SectionLabel>Preview</SectionLabel>
          <div className="space-y-2.5 rounded-[10px] border border-q3-line bg-q3-field p-3.5">
            <p className="text-[13px] font-semibold leading-[18px] text-q3-ink">
              Interview confirmed: {data.company} — {data.jobTitle} ({roundName(round)})
            </p>
            <PreviewRow label="When">
              {at ? `${fmtLongDay(at)} · ${fmtTime(at)}` : <span className="text-q3-muted-light">Pick a slot</span>}
            </PreviewRow>
            <PreviewRow label="Mode">{modeLine}</PreviewRow>
            <PreviewRow label="With">{recipients.interviewers.join(', ') || '—'}</PreviewRow>
            <PreviewRow label="HR">{recipients.hr ?? '—'}</PreviewRow>
          </div>
          {errors.slot && <p className="text-[11.5px] text-q3-red">{errors.slot}</p>}
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2.5 border-t border-q3-line px-5 py-3.5">
        {scheduled ? (
          <>
            <Q3Button variant="primary" icon={Check} disabled className="flex-1">
              Invites sent
            </Q3Button>
            <Link
              to="/q3/interviews"
              className="inline-flex min-h-9 items-center justify-center rounded-lg border border-q3-line bg-q3-surface px-4 text-[13px] font-semibold text-q3-ink-soft transition hover:bg-q3-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40"
            >
              View in Interviews
            </Link>
          </>
        ) : (
          <Q3Button variant="primary" icon={Send} className="w-full" onClick={() => void onConfirm()} loading={confirm.isPending}>
            Confirm &amp; send invites
          </Q3Button>
        )}
      </div>
    </Q3Card>
  );
}

function PreviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-xs leading-[15px]">
      <span className="w-11 shrink-0 font-medium text-q3-muted">{label}</span>
      <span className="min-w-0 flex-1 break-words text-q3-ink-soft">{children}</span>
    </div>
  );
}
