import { CalendarClock, Check, Link2 } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useInterviewRounds, useSelectSlot } from '@/features/recruitment/recruitment.api';
import type { InterviewRoundRow } from '@/features/recruitment/recruitment.types';

/**
 * The candidate's half of interview scheduling: pick one of the offered times.
 *
 * `POST /interview-rounds/:roundId/select-slot` is `@Roles(Subscriber, Q3, Admin)` and had no
 * caller anywhere, so the times a coordinator offered could never be answered. The spec named
 * `candidate-slot-selection.spec.ts` asserted a read-only list and never selected anything.
 */
export function InterviewSlotPicker({ mapId }: { mapId: number }) {
  const { data: rounds = [] } = useInterviewRounds(mapId);

  // Only rounds still waiting on the candidate are actionable; the rest are just history.
  const awaiting = rounds.filter((r) => r.slots.length > 0 && !r.slots.some((s) => s.isSelected));
  const scheduled = rounds.filter((r) => r.slots.some((s) => s.isSelected) || r.meetingLink);

  if (!awaiting.length && !scheduled.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {awaiting.map((r) => (
        <SlotChoices key={r.roundId} round={r} />
      ))}
      {scheduled.map((r) => (
        <ScheduledRound key={r.roundId} round={r} />
      ))}
    </div>
  );
}

/** One round's offered times, as choices. Own component: the hook is keyed by round id. */
function SlotChoices({ round }: { round: InterviewRoundRow }) {
  const { notify } = useToast();
  const select = useSelectSlot(round.roundId);

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/40 dark:bg-amber-900/10">
      <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
        Choose a time for {round.roundName || `Round ${round.roundNumber}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {round.slots.map((s) => (
          <button
            key={s.slotId}
            type="button"
            disabled={select.isPending}
            onClick={() =>
              select.mutate(s.slotId, {
                onSuccess: () => notify('Interview time confirmed.', 'success'),
                onError: () => notify('Could not confirm that time. Please try again.', 'error'),
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-60 dark:border-amber-800 dark:bg-gray-800 dark:text-amber-200"
          >
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            {new Date(s.slotDateTime).toLocaleString('en-IN')}
          </button>
        ))}
      </div>
    </div>
  );
}

/** A round the candidate has already answered — the confirmed time and any joining link. */
function ScheduledRound({ round }: { round: InterviewRoundRow }) {
  const chosen = round.slots.find((s) => s.isSelected);

  return (
    <div className="rounded-lg border border-gray-200 p-3 text-sm dark:border-gray-700">
      <p className="font-medium text-navy">
        {round.roundName || `Round ${round.roundNumber}`}
      </p>
      {chosen && (
        <p className="mt-1 flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400">
          <Check className="h-3.5 w-3.5" aria-hidden />
          {new Date(chosen.slotDateTime).toLocaleString('en-IN')}
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
          Join link
        </a>
      )}
    </div>
  );
}
