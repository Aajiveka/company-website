import { useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { useSetupRound } from '../q3.api';
import type { InterviewMode, Q3Round } from '../q3.types';
import { ModeSegmented } from './ModeSegmented';
import { Q3Button, SectionLabel, fieldClass } from './primitives';
import { Q3Modal } from './Q3Modal';
import { useQ3Toast } from './q3-toast-context';

const MAX_INTERVIEWERS = 6;
const MAX_SLOTS = 8;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface RoundSetupModalProps {
  open: boolean;
  onClose: () => void;
  mapId: number;
  /** The round to edit. Omit (or null) to capture the shortlist and create Round 1. */
  round?: Q3Round | null;
  candidateName: string;
  company: string;
  /** Called after a successful save, before the modal closes. */
  onSaved?: () => void;
}

interface Person {
  name: string;
  title: string;
  email: string;
}

const blank = (): Person => ({ name: '', title: '', email: '' });
const slotsLabel = (n: number) => `${n} slot${n === 1 ? '' : 's'}`;

/** ISO instant → the `datetime-local` value for the browser's own clock. */
function toLocalInput(iso: string) {
  const x = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
}

/**
 * Capture what the company sent with its shortlist — interviewers, HR contact, mode and
 * interview slots — or correct a pending round. No Figma frame exists for it, so it is built
 * from the Return modal's vocabulary (section labels, Q3 fields, pill chips).
 *
 * The server keeps a slot the candidate already picked and replaces the unselected ones, so
 * editing pre-fills only the open future slots; the picked one is mentioned, not editable.
 */
export function RoundSetupModal(props: RoundSetupModalProps) {
  return props.open ? <RoundSetupDialog {...props} /> : null;
}

function RoundSetupDialog({ onClose, onSaved, mapId, round, candidateName, company }: RoundSetupModalProps) {
  const toast = useQ3Toast();
  const setup = useSetupRound(mapId);
  const editing = !!round;

  const [roundName, setRoundName] = useState(round?.roundName ?? '');
  const [interviewers, setInterviewers] = useState<Person[]>(() =>
    round?.interviewers.length
      ? round.interviewers.map((i) => ({ name: i.name, title: i.title ?? '', email: i.email ?? '' }))
      : [blank()],
  );
  const [hr, setHr] = useState<Person>(() => ({
    name: round?.hr?.name ?? '',
    title: round?.hr?.title ?? '',
    email: round?.hr?.email ?? '',
  }));
  const [mode, setMode] = useState<InterviewMode>(round?.mode ?? 'Virtual');
  const [duration, setDuration] = useState(String(round?.durationMins ?? 45));
  const [slots, setSlots] = useState<string[]>(() => {
    const open = (round?.slots ?? [])
      .filter((s) => !s.isSelected && new Date(s.at).getTime() > Date.now())
      .map((s) => toLocalInput(s.at));
    return open.length ? open : [''];
  });
  const [tried, setTried] = useState(false);

  const keptSlot = round?.slots.find((s) => s.isSelected);
  const nowLocal = toLocalInput(new Date().toISOString());

  // ── Validation ──
  const errors: Record<string, string> = {};
  interviewers.forEach((p, i) => {
    if (!p.name.trim()) errors[`iv${i}name`] = 'Name is required';
    if (p.email.trim() && !EMAIL.test(p.email.trim())) errors[`iv${i}email`] = 'Enter a valid email';
  });
  if (hr.email.trim() && !EMAIL.test(hr.email.trim())) errors.hrEmail = 'Enter a valid email';
  const mins = Number(duration);
  if (!Number.isInteger(mins) || mins < 15 || mins > 480) errors.duration = 'Between 15 and 480 minutes';
  const filled = slots.filter(Boolean);
  if (!filled.length) errors.slots = 'Add at least one interview slot';
  slots.forEach((s, i) => {
    if (!s) return;
    if (new Date(s).getTime() <= Date.now()) errors[`slot${i}`] = 'Must be in the future';
    else if (slots.indexOf(s) !== i) errors[`slot${i}`] = 'Duplicate slot';
  });
  const valid = Object.keys(errors).length === 0;
  const err = (key: string) => (tried ? errors[key] : undefined);

  const patchInterviewer = (i: number, patch: Partial<Person>) =>
    setInterviewers((cur) => cur.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!valid) return;
    const isoSlots = filled.map((s) => new Date(s).toISOString());
    try {
      await setup.mutateAsync({
        ...(editing ? { roundId: round.roundId } : {}),
        roundName: roundName.trim() || undefined,
        interviewers: interviewers.map((p) => ({
          name: p.name.trim(),
          title: p.title.trim() || undefined,
          email: p.email.trim() || undefined,
        })),
        hrName: hr.name.trim() || undefined,
        hrTitle: hr.title.trim() || undefined,
        hrEmail: hr.email.trim() || undefined,
        mode,
        durationMins: mins,
        slots: isoSlots,
      });
      if (editing) toast.success('Round updated', slotsLabel(isoSlots.length));
      else toast.success('Shortlist saved', `${slotsLabel(isoSlots.length)} from ${company}`);
      onSaved?.();
      onClose();
    } catch (error) {
      toast.error(editing ? 'Could not update the round' : 'Could not save the shortlist', getErrorMessage(error));
    }
  }

  return (
    <Q3Modal
      open
      onClose={onClose}
      width={620}
      title={editing ? `Edit ${round.label === 'Final' ? 'final round' : `Round ${round.roundNumber}`}` : 'Capture shortlist'}
      subtitle={`${candidateName} · ${company}`}
      footer={
        <>
          <Q3Button onClick={onClose} disabled={setup.isPending}>
            Cancel
          </Q3Button>
          <Q3Button type="submit" form="q3-round-setup" variant="primary" icon={Save} loading={setup.isPending}>
            {editing ? 'Save changes' : 'Save shortlist'}
          </Q3Button>
        </>
      }
    >
      <form id="q3-round-setup" onSubmit={submit} noValidate className="space-y-5">
        <Field label="Round name" htmlFor="rs-round-name" hint="Optional">
          <input
            id="rs-round-name"
            className={fieldClass}
            maxLength={100}
            value={roundName}
            onChange={(e) => setRoundName(e.target.value)}
            placeholder="e.g. Technical"
          />
        </Field>

        <fieldset>
          <legend className="flex w-full items-center">
            <SectionLabel>Interviewers ({interviewers.length})</SectionLabel>
          </legend>
          <ul className="mt-2 space-y-2">
            {interviewers.map((p, i) => (
              <li key={i} className="flex items-start gap-2">
                <PersonInputs
                  idPrefix={`rs-iv${i}`}
                  value={p}
                  onChange={(patch) => patchInterviewer(i, patch)}
                  nameRequired
                  nameError={err(`iv${i}name`)}
                  emailError={err(`iv${i}email`)}
                  ordinal={i + 1}
                />
                <button
                  type="button"
                  onClick={() => setInterviewers((cur) => cur.filter((_, j) => j !== i))}
                  disabled={interviewers.length === 1}
                  aria-label={`Remove interviewer ${i + 1}`}
                  className="mt-[7px] shrink-0 rounded-md p-1 text-q3-muted transition hover:bg-q3-red-soft hover:text-q3-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40 disabled:invisible"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
          {interviewers.length < MAX_INTERVIEWERS && (
            <Q3Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setInterviewers((c) => [...c, blank()])}>
              Add interviewer
            </Q3Button>
          )}
        </fieldset>

        <fieldset>
          <legend>
            <SectionLabel>HR contact</SectionLabel>
          </legend>
          <div className="mt-2 pr-8">
            <PersonInputs idPrefix="rs-hr" value={hr} onChange={(patch) => setHr((h) => ({ ...h, ...patch }))} emailError={err('hrEmail')} />
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_140px]">
          <div>
            <SectionLabel>Interview mode</SectionLabel>
            <div className="mt-2">
              <ModeSegmented value={mode} onChange={setMode} />
            </div>
          </div>
          <Field label="Duration (min)" htmlFor="rs-duration" error={err('duration')}>
            <input
              id="rs-duration"
              type="number"
              inputMode="numeric"
              min={15}
              max={480}
              step={15}
              className={fieldClass}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              aria-invalid={!!err('duration')}
            />
          </Field>
        </div>

        <fieldset>
          <legend>
            <SectionLabel>Interview slots ({filled.length})</SectionLabel>
          </legend>
          {keptSlot && (
            <p className="mt-1.5 text-xs text-q3-muted">
              The slot the candidate already picked stays as it is — these are the other options.
            </p>
          )}
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {slots.map((s, i) => (
              <li key={i}>
                <div className="flex items-center gap-1.5">
                  <label htmlFor={`rs-slot${i}`} className="sr-only">
                    Slot {i + 1}
                  </label>
                  <input
                    id={`rs-slot${i}`}
                    type="datetime-local"
                    min={nowLocal}
                    className={cn(fieldClass, 'py-2')}
                    value={s}
                    onChange={(e) => setSlots((cur) => cur.map((x, j) => (j === i ? e.target.value : x)))}
                    aria-invalid={!!err(`slot${i}`)}
                  />
                  <button
                    type="button"
                    onClick={() => setSlots((cur) => (cur.length === 1 ? [''] : cur.filter((_, j) => j !== i)))}
                    aria-label={`Remove slot ${i + 1}`}
                    className="shrink-0 rounded-md p-1 text-q3-muted transition hover:bg-q3-red-soft hover:text-q3-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {err(`slot${i}`) && <p className="mt-1 text-xs text-q3-red">{err(`slot${i}`)}</p>}
              </li>
            ))}
          </ul>
          {slots.length < MAX_SLOTS && (
            <Q3Button size="sm" variant="ghost" icon={Plus} className="mt-2" onClick={() => setSlots((c) => [...c, ''])}>
              Add slot
            </Q3Button>
          )}
          {err('slots') && (
            <p role="alert" className="mt-1.5 text-xs text-q3-red">
              {err('slots')}
            </p>
          )}
        </fieldset>

        {tried && !valid && (
          <p role="alert" className="text-xs text-q3-red">
            Fix the highlighted fields to save.
          </p>
        )}
      </form>
    </Q3Modal>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="flex items-baseline gap-1.5">
        <SectionLabel>{label}</SectionLabel>
        {hint && <span className="text-[11px] text-q3-muted-light">{hint}</span>}
      </label>
      <div className="mt-2">{children}</div>
      {error && <p className="mt-1 text-xs text-q3-red">{error}</p>}
    </div>
  );
}

/** Name / title / email in one row (stacked on phones). */
function PersonInputs({
  idPrefix,
  value,
  onChange,
  nameRequired,
  nameError,
  emailError,
  ordinal,
}: {
  idPrefix: string;
  value: Person;
  onChange: (patch: Partial<Person>) => void;
  nameRequired?: boolean;
  nameError?: string;
  emailError?: string;
  ordinal?: number;
}) {
  const who = ordinal ? ` ${ordinal}` : '';
  return (
    <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
      <div>
        <label htmlFor={`${idPrefix}-name`} className="sr-only">
          {ordinal ? `Interviewer${who} name` : 'HR name'}
        </label>
        <input
          id={`${idPrefix}-name`}
          className={fieldClass}
          maxLength={100}
          placeholder={nameRequired ? 'Name *' : 'Name'}
          required={nameRequired}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          aria-invalid={!!nameError}
        />
        {nameError && <p className="mt-1 text-xs text-q3-red">{nameError}</p>}
      </div>
      <div>
        <label htmlFor={`${idPrefix}-title`} className="sr-only">
          {ordinal ? `Interviewer${who} title` : 'HR title'}
        </label>
        <input
          id={`${idPrefix}-title`}
          className={fieldClass}
          maxLength={100}
          placeholder="Title"
          value={value.title}
          onChange={(e) => onChange({ title: e.target.value })}
        />
      </div>
      <div>
        <label htmlFor={`${idPrefix}-email`} className="sr-only">
          {ordinal ? `Interviewer${who} email` : 'HR email'}
        </label>
        <input
          id={`${idPrefix}-email`}
          type="email"
          className={fieldClass}
          maxLength={200}
          placeholder="Email"
          value={value.email}
          onChange={(e) => onChange({ email: e.target.value })}
          aria-invalid={!!emailError}
        />
        {emailError && <p className="mt-1 text-xs text-q3-red">{emailError}</p>}
      </div>
    </div>
  );
}
