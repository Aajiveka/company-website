import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarClock, Link2 } from 'lucide-react';
import { Badge, Button, Input, Select, statusTone, useToast } from '@/components/ui';
import {
  useCreateInterviewRound,
  useInterviewModes,
  useInterviewRounds,
  useSubmitRoundResult,
} from '../recruitment.api';
import type { InterviewRoundRow } from '../recruitment.types';

/**
 * Multi-round interview management for one application.
 *
 * The API for rounds shipped with no UI at all, so `GET /interview-rounds/:mapId` always
 * answered with an empty list and `meetingLink` was never populated by anything. This is the
 * missing half. It lives on Q3's screen rather than Q1's because that is what the endpoints
 * allow: create and record-result are `@Roles(Q3, Client, Admin)` and QC1 is not on the list.
 */
export function InterviewRoundsPanel({ mapId }: { mapId: number }) {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const { data: rounds = [], isLoading } = useInterviewRounds(mapId);
  const { data: modes = [] } = useInterviewModes();
  const create = useCreateInterviewRound();

  const [roundName, setRoundName] = useState('');
  const [interviewerName, setInterviewerName] = useState('');
  const [modeId, setModeId] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  // Offered times. The candidate picks one of these — that is what select-slot acts on.
  const [slots, setSlots] = useState<string[]>(['']);

  /** Rounds are numbered per application, so the next one follows the highest so far. */
  const nextRoundNumber = rounds.reduce((max, r) => Math.max(max, r.roundNumber), 0) + 1;

  const reset = () => {
    setRoundName('');
    setInterviewerName('');
    setModeId('');
    setMeetingLink('');
    setSlots(['']);
  };

  const onCreate = () => {
    if (!roundName.trim() || !modeId) return;
    create.mutate(
      {
        jobSubscriberMapId: mapId,
        roundNumber: nextRoundNumber,
        roundName: roundName.trim(),
        interviewerName: interviewerName.trim() || undefined,
        // The API takes a mode name or a numeric id; the id avoids a case-sensitive
        // name lookup that silently stores null when it misses.
        interviewMode: modeId,
        meetingLink: meetingLink.trim() || undefined,
        slots: slots.map((s) => s.trim()).filter(Boolean).map((s) => new Date(s).toISOString()),
      },
      {
        onSuccess: () => {
          notify(t('recruitment.rounds.created'), 'success');
          reset();
        },
        onError: () => notify(t('errors.somethingWrong'), 'error'),
      },
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-navy">{t('recruitment.rounds.existing')}</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">{t('actions.loading')}</p>
        ) : rounds.length === 0 ? (
          <p className="rounded-lg bg-gray-50 px-3 py-4 text-sm text-gray-500 dark:bg-gray-800">
            {t('recruitment.rounds.none')}
          </p>
        ) : (
          <ul className="space-y-3">
            {rounds.map((r) => (
              <RoundCard key={r.roundId} round={r} />
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-gray-200 pt-4 dark:border-gray-700">
        <h3 className="mb-3 text-sm font-semibold text-navy">
          {t('recruitment.rounds.addNumbered', { number: nextRoundNumber })}
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            placeholder={t('recruitment.rounds.name')}
            value={roundName}
            onChange={(e) => setRoundName(e.target.value)}
          />
          <Input
            placeholder={t('recruitment.rounds.interviewer')}
            value={interviewerName}
            onChange={(e) => setInterviewerName(e.target.value)}
          />
          <Select
            options={modes.map((m) => ({ label: m.label, value: String(m.id) }))}
            placeholder={t('recruitment.mode')}
            value={modeId}
            onChange={(e) => setModeId(e.target.value)}
          />
          <Input
            placeholder={t('recruitment.rounds.meetingLink')}
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
          />
        </div>

        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-500">{t('recruitment.rounds.slotsHint')}</p>
          {slots.map((s, i) => (
            <div key={i} className="flex gap-2">
              <Input
                type="datetime-local"
                value={s}
                onChange={(e) =>
                  setSlots((prev) => prev.map((v, vi) => (vi === i ? e.target.value : v)))
                }
              />
              {slots.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSlots((prev) => prev.filter((_, vi) => vi !== i))}
                >
                  {t('recruitment.rounds.removeSlot')}
                </Button>
              )}
            </div>
          ))}
          {slots.length < 5 && (
            <Button variant="outline" size="sm" onClick={() => setSlots((prev) => [...prev, ''])}>
              {t('recruitment.rounds.addSlot')}
            </Button>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            size="sm"
            disabled={!roundName.trim() || !modeId || create.isPending}
            onClick={onCreate}
          >
            {create.isPending ? t('actions.loading') : t('recruitment.rounds.create')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * One round, plus the way to record how it went.
 *
 * Its own component because `useSubmitRoundResult` is keyed by round id — a hook cannot be
 * called per item inside a loop in the parent.
 */
function RoundCard({ round }: { round: InterviewRoundRow }) {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const submit = useSubmitRoundResult(round.roundId);
  const [feedback, setFeedback] = useState('');
  const [open, setOpen] = useState(false);

  const decided = round.result && round.result !== 'Pending';

  const record = (result: 'Passed' | 'Failed' | 'Hold') =>
    submit.mutate(
      { result, feedback: feedback.trim() || undefined },
      {
        onSuccess: () => {
          notify(t('recruitment.rounds.resultSaved'), 'success');
          setOpen(false);
          setFeedback('');
        },
        onError: () => notify(t('errors.somethingWrong'), 'error'),
      },
    );

  return (
    <li className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy">
            R{round.roundNumber}: {round.roundName || t('recruitment.rounds.untitled')}
          </p>
          {round.interviewerName && (
            <p className="text-xs text-gray-500">{round.interviewerName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={statusTone(round.status)}>{round.status}</Badge>
          {decided && <Badge tone={statusTone(round.result)}>{round.result}</Badge>}
        </div>
      </div>

      {round.scheduledAt && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          {new Date(round.scheduledAt).toLocaleString('en-IN')}
        </p>
      )}

      {round.meetingLink && (
        <a
          href={round.meetingLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-primary underline-offset-2 hover:underline"
        >
          <Link2 className="h-3.5 w-3.5" aria-hidden />
          {t('recruitment.rounds.joinLink')}
        </a>
      )}

      {round.slots.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-gray-500">{t('recruitment.rounds.offeredSlots')}</p>
          <ul className="mt-1 flex flex-wrap gap-1.5">
            {round.slots.map((s) => (
              <li
                key={s.slotId}
                className={
                  s.isSelected
                    ? 'rounded-md bg-green-50 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:bg-green-900/20 dark:text-green-400'
                    : 'rounded-md bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                }
              >
                {new Date(s.slotDateTime).toLocaleString('en-IN')}
                {s.isSelected ? ` · ${t('recruitment.rounds.chosen')}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      {round.companyFeedback && (
        <p className="mt-2 rounded-md bg-gray-50 px-2.5 py-1.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          {round.companyFeedback}
        </p>
      )}

      {!decided && (
        <div className="mt-3">
          {open ? (
            <div className="space-y-2">
              <Input
                placeholder={t('recruitment.rounds.feedback')}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" disabled={submit.isPending} onClick={() => record('Passed')}>
                  {t('recruitment.rounds.passed')}
                </Button>
                <Button variant="danger" size="sm" disabled={submit.isPending} onClick={() => record('Failed')}>
                  {t('recruitment.rounds.failed')}
                </Button>
                <Button variant="outline" size="sm" disabled={submit.isPending} onClick={() => record('Hold')}>
                  {t('recruitment.rounds.hold')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                  {t('actions.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              {t('recruitment.rounds.recordResult')}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
