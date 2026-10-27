import { useState } from 'react';
import { Link2, MapPin, PauseCircle, ThumbsDown, ThumbsUp } from 'lucide-react';
import { EmployerBadge, PrimaryButton, SecondaryButton } from '@/employer/components/Cards/ui';
import { Modal } from '@/components/ui/Modal';
import { useRecordInterviewResult } from '@/employer/services/employer.api';
import type {
  EmployerInterviewRound,
  InterviewScheduleInput,
  NextInterviewStep,
} from '@/employer/services/employer.types';
import { dateTimeLabel } from '@/employer/utils/format';
import { scheduleDefaultsFrom } from '@/employer/utils/interviewSchedule';
import { getErrorMessage } from '@/lib/axios';
import { ScheduleInterviewForm } from './ScheduleInterviewForm';

type Decision = 'Select' | 'Reject' | 'Hold';

const FINAL_ROUND_NUMBER = 4;

const NEXT_STEPS: Array<{ id: NextInterviewStep; label: string; roundNumber: number }> = [
  { id: 'Round2', label: 'Move to Round 2', roundNumber: 2 },
  { id: 'Round3', label: 'Move to Round 3', roundNumber: 3 },
  { id: 'Final', label: 'Move to Final round', roundNumber: FINAL_ROUND_NUMBER },
  { id: 'Hire', label: 'Hire (final selection)', roundNumber: Number.POSITIVE_INFINITY },
];

function roundBadge(round: EmployerInterviewRound): {
  label: string;
  tone: 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
} {
  if (round.result === 'Passed') return { label: 'Selected', tone: 'success' };
  if (round.result === 'Failed') return { label: 'Rejected', tone: 'danger' };
  if (round.result === 'Hold') return { label: 'On hold', tone: 'warning' };
  if (round.status === 'Cancelled') return { label: 'Cancelled', tone: 'neutral' };
  if (round.status === 'Pending') return { label: 'Awaiting Q3 scheduling', tone: 'warning' };
  if (round.scheduledAt && new Date(round.scheduledAt) > new Date()) {
    return { label: 'Scheduled', tone: 'primary' };
  }
  return { label: 'Awaiting your feedback', tone: 'warning' };
}

function Contact({ label, name, email }: { label: string; name: string | null; email: string | null }) {
  if (!name && !email) return null;
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">
        {name || '—'}
        {email ? <span className="block text-[11px] text-slate-500">{email}</span> : null}
      </dd>
    </div>
  );
}

function RoundCard({
  round,
  actionable,
  onDecide,
}: {
  round: EmployerInterviewRound;
  actionable: boolean;
  onDecide: (decision: Decision) => void;
}) {
  const badge = roundBadge(round);
  const booked = round.slots.find((s) => s.isSelected);

  return (
    <li className="rounded-lg border border-slate-200 p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="text-xs font-semibold text-slate-800">{round.roundName}</p>
        <EmployerBadge tone={badge.tone}>{badge.label}</EmployerBadge>
      </div>

      <dl className="mt-2 grid gap-1.5 text-xs">
        <div>
          <dt className="text-slate-500">Mode</dt>
          <dd className="text-slate-800">{round.interviewMode ?? '—'}</dd>
        </div>
        {round.scheduledAt || booked ? (
          <div>
            <dt className="text-slate-500">Interview on</dt>
            <dd className="text-slate-800">{dateTimeLabel(round.scheduledAt ?? booked?.slotDateTime ?? '')}</dd>
          </div>
        ) : (
          <div>
            <dt className="text-slate-500">Slots sent to Q3</dt>
            <dd className="text-slate-800">
              {round.slots.length ? (
                <ul>
                  {round.slots.map((s) => (
                    <li key={s.slotId}>{dateTimeLabel(s.slotDateTime)}</li>
                  ))}
                </ul>
              ) : (
                '—'
              )}
            </dd>
          </div>
        )}
        <Contact label="HR" name={round.hrName} email={round.hrEmail} />
        <Contact label="Interviewer" name={round.interviewerName} email={round.interviewerEmail} />
        <Contact label="Guest" name={round.guestName} email={round.guestEmail} />
      </dl>

      {round.meetingLink ? (
        <a
          href={round.meetingLink}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] text-[#1A56DB] hover:underline"
        >
          <Link2 className="h-3 w-3" /> Join meeting
        </a>
      ) : null}
      {round.location ? (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] text-slate-600">
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {round.location}
        </p>
      ) : null}
      {round.companyFeedback ? (
        <p className="mt-1.5 rounded-md bg-slate-50 px-2 py-1 text-[11px] text-slate-600">
          Feedback: {round.companyFeedback}
        </p>
      ) : null}

      {round.status === 'Pending' && (
        <p className="mt-2 text-[11px] text-amber-700">
          Q3 is booking one of your slots with the candidate. Record the result once the interview is scheduled.
        </p>
      )}

      {actionable && (
        <div className="mt-2 flex flex-wrap gap-1.5 border-t border-slate-100 pt-2">
          <PrimaryButton onClick={() => onDecide('Select')}>
            <ThumbsUp className="h-3.5 w-3.5" /> Select
          </PrimaryButton>
          {round.result !== 'Hold' && (
            <SecondaryButton onClick={() => onDecide('Hold')}>
              <PauseCircle className="h-3.5 w-3.5" /> Hold
            </SecondaryButton>
          )}
          <SecondaryButton
            className="!border-rose-200 !text-rose-700 hover:!bg-rose-50"
            onClick={() => onDecide('Reject')}
          >
            <ThumbsDown className="h-3.5 w-3.5" /> Reject
          </SecondaryButton>
        </div>
      )}
    </li>
  );
}

function RoundResultModal({
  mapId,
  round,
  decision,
  candidateName,
  onClose,
  onDone,
}: {
  mapId: number;
  round: EmployerInterviewRound;
  decision: Decision;
  candidateName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const record = useRecordInterviewResult();
  const steps = NEXT_STEPS.filter((s) => s.roundNumber > round.roundNumber);
  const [next, setNext] = useState<NextInterviewStep>(steps[0]?.id ?? 'Hire');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState<string | null>(null);
  const nextIsRound = decision === 'Select' && next !== 'Hire';
  const nextLabel = NEXT_STEPS.find((s) => s.id === next)?.label.replace('Move to ', '') ?? '';

  const send = async (nextRound?: InterviewScheduleInput) => {
    setError(null);
    try {
      await record.mutateAsync({
        jobSubscriberMapId: mapId,
        roundId: round.roundId,
        decision,
        feedback: feedback.trim() || undefined,
        ...(decision === 'Select' ? { next } : {}),
        ...(nextRound ? { nextRound } : {}),
      });
      onDone();
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save the result'));
    }
  };

  const title =
    decision === 'Select'
      ? `Select after ${round.roundName}`
      : decision === 'Reject'
        ? `Reject after ${round.roundName}`
        : `Hold after ${round.roundName}`;

  return (
    <Modal open onClose={onClose} title={title} className="max-w-lg max-h-[90vh] overflow-y-auto">
      <div className="space-y-3 text-xs">
        <label className="block text-slate-600">
          Interview feedback (optional)
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="mt-0.5 w-full rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
          />
        </label>

        {decision === 'Select' && (
          <fieldset>
            <legend className="font-medium text-slate-800">Next step for {candidateName}</legend>
            <div className="mt-1 space-y-1 text-slate-700">
              {steps.map((s) => (
                <label key={s.id} className="flex items-center gap-1.5">
                  <input type="radio" name="next-step" checked={next === s.id} onChange={() => setNext(s.id)} />
                  {s.label}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {nextIsRound ? (
          <>
            <p className="font-medium text-slate-800">{nextLabel} details for Q3</p>
            <ScheduleInterviewForm
              key={next}
              initial={scheduleDefaultsFrom(round)}
              submitLabel={`Send ${nextLabel} to Q3`}
              busy={record.isPending}
              error={error}
              onSubmit={(input) => void send(input)}
              onCancel={onClose}
            />
          </>
        ) : (
          <>
            <p className="text-slate-600">
              {decision === 'Select'
                ? `${candidateName} will be marked Selected after ${round.roundName}.`
                : decision === 'Reject'
                  ? `${candidateName} will be marked Rejected after ${round.roundName}.`
                  : `${candidateName} stays on hold; you can still select or reject after ${round.roundName}.`}
            </p>
            {error && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-rose-700" role="alert">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <PrimaryButton
                disabled={record.isPending}
                className={decision === 'Reject' ? '!bg-rose-600 hover:!bg-rose-700' : undefined}
                onClick={() => void send()}
              >
                {record.isPending
                  ? 'Saving…'
                  : decision === 'Select'
                    ? 'Hire'
                    : decision === 'Reject'
                      ? 'Reject'
                      : 'Put on hold'}
              </PrimaryButton>
              <SecondaryButton disabled={record.isPending} onClick={onClose}>
                Cancel
              </SecondaryButton>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/** The employer's view of the interview loop: each round, and the decision after it. */
export function InterviewProcessPanel({
  mapId,
  rounds,
  candidateName,
  canDecide,
  onChanged,
}: {
  mapId: number;
  rounds: EmployerInterviewRound[];
  candidateName: string;
  /** False once the application is closed (rejected / hired) — rounds become read-only. */
  canDecide: boolean;
  onChanged: () => void;
}) {
  const [deciding, setDeciding] = useState<{ round: EmployerInterviewRound; decision: Decision } | null>(null);
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const latest = sorted[sorted.length - 1];
  const isActionable = (r: EmployerInterviewRound) =>
    canDecide &&
    r.roundId === latest?.roundId &&
    r.status === 'Scheduled' &&
    (r.result === 'Pending' || r.result === 'Hold');

  return (
    <>
      <ul className="space-y-2">
        {sorted.map((r) => (
          <RoundCard
            key={r.roundId}
            round={r}
            actionable={isActionable(r)}
            onDecide={(decision) => setDeciding({ round: r, decision })}
          />
        ))}
      </ul>
      {deciding && (
        <RoundResultModal
          mapId={mapId}
          round={deciding.round}
          decision={deciding.decision}
          candidateName={candidateName}
          onClose={() => setDeciding(null)}
          onDone={() => {
            setDeciding(null);
            onChanged();
          }}
        />
      )}
    </>
  );
}
