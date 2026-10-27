import { useState, type FormEvent } from 'react';
import { Plus, X } from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/employer/components/Cards/ui';
import {
  INTERVIEW_MODE_OPTIONS,
  type InterviewMode,
  type InterviewScheduleInput,
} from '@/employer/services/employer.types';

const fieldClass =
  'mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLOT_COUNT = 3;

export type FirstRound = 'Round1' | 'Final';

function localNow() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

type Props = {
  initial?: Partial<InterviewScheduleInput>;
  /** Offer "Round 1" vs "Final round only" — for the first interview of the process. */
  chooseFirstRound?: boolean;
  submitLabel: string;
  busy: boolean;
  error?: string | null;
  onSubmit: (input: InterviewScheduleInput, firstRound: FirstRound) => void;
  onCancel: () => void;
};

export function ScheduleInterviewForm({
  initial,
  chooseFirstRound = false,
  submitLabel,
  busy,
  error,
  onSubmit,
  onCancel,
}: Props) {
  const [firstRound, setFirstRound] = useState<FirstRound>('Round1');
  const [hrName, setHrName] = useState(initial?.hrName ?? '');
  const [hrEmail, setHrEmail] = useState(initial?.hrEmail ?? '');
  const [interviewerName, setInterviewerName] = useState(initial?.interviewerName ?? '');
  const [interviewerEmail, setInterviewerEmail] = useState(initial?.interviewerEmail ?? '');
  const [showGuest, setShowGuest] = useState(Boolean(initial?.guestName || initial?.guestEmail));
  const [guestName, setGuestName] = useState(initial?.guestName ?? '');
  const [guestEmail, setGuestEmail] = useState(initial?.guestEmail ?? '');
  const [mode, setMode] = useState<InterviewMode>(initial?.mode ?? 'Video call');
  const [meetingLink, setMeetingLink] = useState(initial?.meetingLink ?? '');
  const [location, setLocation] = useState(initial?.location ?? '');
  const [slots, setSlots] = useState<string[]>(Array.from({ length: SLOT_COUNT }, () => ''));
  const [formError, setFormError] = useState<string | null>(null);

  const validate = (): string | null => {
    if (!hrName.trim()) return 'HR name is required';
    if (!EMAIL_RE.test(hrEmail.trim())) return 'Enter a valid HR email';
    if (!interviewerName.trim()) return 'Interviewer name is required';
    if (!EMAIL_RE.test(interviewerEmail.trim())) return 'Enter a valid interviewer email';
    if (showGuest) {
      if (!guestName.trim() && !guestEmail.trim()) return 'Add the guest’s details or remove the guest';
      if (!guestName.trim()) return 'Guest name is required';
      if (!EMAIL_RE.test(guestEmail.trim())) return 'Enter a valid guest email';
    }
    if (mode === 'Face to face' && !location.trim()) return 'Add the venue for a face-to-face interview';
    if (slots.some((s) => !s)) return `Pick all ${SLOT_COUNT} interview slots`;
    const times = slots.map((s) => new Date(s).getTime());
    if (times.some((t) => Number.isNaN(t) || t <= Date.now())) return 'All slots must be in the future';
    if (new Set(times).size !== times.length) return 'The 3 slots must be different times';
    return null;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const problem = validate();
    setFormError(problem);
    if (problem) return;
    onSubmit(
      {
        hrName: hrName.trim(),
        hrEmail: hrEmail.trim(),
        interviewerName: interviewerName.trim(),
        interviewerEmail: interviewerEmail.trim(),
        ...(showGuest ? { guestName: guestName.trim(), guestEmail: guestEmail.trim() } : {}),
        mode,
        ...(mode === 'Video call' && meetingLink.trim() ? { meetingLink: meetingLink.trim() } : {}),
        ...(mode === 'Face to face' ? { location: location.trim() } : {}),
        slots: slots.map((s) => new Date(s).toISOString()),
      },
      firstRound,
    );
  };

  const shownError = formError ?? error;
  const min = localNow();

  return (
    <form className="space-y-3 text-xs" onSubmit={submit} noValidate>
      {chooseFirstRound && (
        <fieldset>
          <legend className="font-medium text-slate-800">Round</legend>
          <div className="mt-1 flex flex-wrap gap-3 text-slate-700">
            {(
              [
                ['Round1', 'Round 1'],
                ['Final', 'Final round only'],
              ] as const
            ).map(([id, label]) => (
              <label key={id} className="inline-flex items-center gap-1.5">
                <input
                  type="radio"
                  name="first-round"
                  checked={firstRound === id}
                  onChange={() => setFirstRound(id)}
                />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 font-medium text-slate-800">HR details</legend>
        <label className="block text-slate-600">
          HR name <span className="text-rose-600">*</span>
          <input className={fieldClass} value={hrName} onChange={(e) => setHrName(e.target.value)} />
        </label>
        <label className="block text-slate-600">
          HR email <span className="text-rose-600">*</span>
          <input type="email" className={fieldClass} value={hrEmail} onChange={(e) => setHrEmail(e.target.value)} />
        </label>
      </fieldset>

      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 font-medium text-slate-800">Interviewer details</legend>
        <label className="block text-slate-600">
          Interviewer name <span className="text-rose-600">*</span>
          <input
            className={fieldClass}
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
          />
        </label>
        <label className="block text-slate-600">
          Interviewer email <span className="text-rose-600">*</span>
          <input
            type="email"
            className={fieldClass}
            value={interviewerEmail}
            onChange={(e) => setInterviewerEmail(e.target.value)}
          />
        </label>
      </fieldset>

      {showGuest ? (
        <fieldset className="grid gap-2 sm:grid-cols-2">
          <legend className="mb-1 flex w-full items-center justify-between font-medium text-slate-800">
            Guest details
            <button
              type="button"
              className="inline-flex items-center gap-0.5 text-[11px] font-normal text-slate-500 hover:text-rose-600"
              onClick={() => {
                setShowGuest(false);
                setGuestName('');
                setGuestEmail('');
              }}
            >
              <X className="h-3 w-3" /> Remove guest
            </button>
          </legend>
          <label className="block text-slate-600">
            Guest name <span className="text-rose-600">*</span>
            <input className={fieldClass} value={guestName} onChange={(e) => setGuestName(e.target.value)} />
          </label>
          <label className="block text-slate-600">
            Guest email <span className="text-rose-600">*</span>
            <input
              type="email"
              className={fieldClass}
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
            />
          </label>
        </fieldset>
      ) : (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[#1A56DB] hover:underline"
          onClick={() => setShowGuest(true)}
        >
          <Plus className="h-3.5 w-3.5" /> Add guest (optional)
        </button>
      )}

      <label className="block text-slate-600">
        Interview mode <span className="text-rose-600">*</span>
        <select className={fieldClass} value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)}>
          {INTERVIEW_MODE_OPTIONS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </label>

      {mode === 'Video call' && (
        <label className="block text-slate-600">
          Meeting link (optional — Q3 can share one)
          <input
            className={fieldClass}
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://meet.google.com/…"
          />
        </label>
      )}
      {mode === 'Face to face' && (
        <label className="block text-slate-600">
          Venue <span className="text-rose-600">*</span>
          <input
            className={fieldClass}
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Office address"
          />
        </label>
      )}

      <fieldset className="space-y-1.5">
        <legend className="font-medium text-slate-800">
          Available slots ({SLOT_COUNT}) <span className="text-rose-600">*</span>
        </legend>
        {slots.map((s, i) => (
          <label key={i} className="block text-slate-600">
            Slot {i + 1}
            <input
              type="datetime-local"
              className={fieldClass}
              min={min}
              value={s}
              onChange={(e) => setSlots((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
            />
          </label>
        ))}
      </fieldset>

      <p className="rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600">
        Q3 contacts the candidate, books one of these slots, and confirms it with HR, the interviewer
        {showGuest ? ', the guest' : ''} and the candidate.
      </p>

      {shownError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-700" role="alert">
          {shownError}
        </p>
      )}

      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? 'Sending…' : submitLabel}
        </PrimaryButton>
        <SecondaryButton type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
