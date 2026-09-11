import { useState } from 'react';
import { isAxiosError } from 'axios';
import { BellOff, Clock, Trash2, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { FOLLOW_UP_TIMES } from '../q1.types';
import type { StatusPayload } from '../q1.api';
import { Q1Button, Q1Modal } from './Q1Modal';

type Outcome = 'FollowUp' | 'NoResponse' | 'NotInterested';

const OUTCOMES: { value: Outcome; icon: LucideIcon }[] = [
  { value: 'FollowUp', icon: Clock },
  { value: 'NoResponse', icon: BellOff },
  { value: 'NotInterested', icon: Trash2 },
];

const NOT_INTERESTED_REASONS = [
  'Not looking for a job',
  'Accepted another offer',
  'Salary expectations not met',
  'Location not suitable',
  'Not reachable',
  'Other',
];

/**
 * Update Candidate Status — the three screening outcomes.
 *
 * Each option expands to its own fields when selected, matching the three container variants
 * in the Figma. Validation mirrors what each branch actually needs: a follow-up without a
 * date would never surface on the Follow-ups screen, and a closure without a reason loses the
 * only explanation anyone will ever have.
 */
export function UpdateStatusModal({
  open,
  onClose,
  candidateName,
  candidateId,
  currentAttempts,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  candidateId: number;
  currentAttempts: number;
  onSubmit: (payload: StatusPayload) => Promise<unknown>;
  isPending: boolean;
}) {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const [outcome, setOutcome] = useState<Outcome>('FollowUp');
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState<string>(FOLLOW_UP_TIMES[0]);
  const [attempts, setAttempts] = useState(String(currentAttempts || 1));
  const [nextAttempt, setNextAttempt] = useState('');
  const [reason, setReason] = useState(NOT_INTERESTED_REASONS[0]);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const submit = async () => {
    setError('');
    const payload: StatusPayload = { status: outcome };

    if (outcome === 'FollowUp') {
      if (!followUpDate) return setError(t('q1.status.errors.followUpDate'));
      if (followUpDate < today) return setError(t('q1.status.errors.followUpPast'));
      payload.followUpDate = followUpDate;
      payload.followUpTime = followUpTime;
    } else if (outcome === 'NoResponse') {
      const n = Number(attempts);
      if (!Number.isInteger(n) || n < 0 || n > 99) return setError(t('q1.status.errors.attempts'));
      payload.contactAttempts = n;
      if (nextAttempt) {
        if (nextAttempt < today) return setError(t('q1.status.errors.nextAttemptPast'));
        payload.nextAttemptAt = nextAttempt;
      }
    } else {
      if (!reason.trim()) return setError(t('q1.status.errors.reason'));
      payload.notInterestedReason = reason.trim();
    }

    try {
      await onSubmit(payload);
      notify(t(`q1.status.saved.${outcome}`), outcome === 'NotInterested' ? 'info' : 'success');
      onClose();
    } catch (e) {
      notify(
        isAxiosError(e) ? (e.response?.data?.message ?? t('errors.somethingWrong')) : t('errors.somethingWrong'),
        'error',
      );
    }
  };

  const fieldCls =
    'mt-2 block w-full rounded-lg border border-q1-line bg-q1-surface px-3 py-2.5 text-sm text-q1-ink outline-none transition focus:border-q1-blue focus:ring-2 focus:ring-q1-blue/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100';

  return (
    <Q1Modal
      open={open}
      onClose={onClose}
      title={t('q1.status.title')}
      subtitle={t('q1.status.subtitle')}
      avatarName={candidateName}
      avatarId={candidateId}
      footer={
        <>
          <Q1Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Q1Button>
          <Q1Button onClick={() => void submit()} disabled={isPending}>
            {isPending ? t('actions.loading') : t('q1.status.save')}
          </Q1Button>
        </>
      }
    >
      <div role="radiogroup" aria-label={t('q1.status.subtitle')} className="space-y-3">
        {OUTCOMES.map(({ value, icon: Icon }) => {
          const selected = outcome === value;
          return (
            <div key={value}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setOutcome(value);
                  setError('');
                }}
                className={cn(
                  'flex w-full items-start gap-3 rounded-xl border p-4 text-left transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40',
                  selected
                    ? 'border-q1-amber bg-q1-amber-soft dark:bg-q1-amber/15'
                    : 'border-q1-line hover:bg-q1-canvas dark:border-gray-600 dark:hover:bg-gray-700/50',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                    selected ? 'bg-white text-q1-amber' : 'bg-q1-chip text-q1-slate dark:bg-gray-700',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-sm font-bold text-q1-ink dark:text-white">
                    {t(`q1.status.option.${value}.title`)}
                  </span>
                  <span className="mt-1 block text-xs text-q1-ink-soft dark:text-gray-300">
                    {t(`q1.status.option.${value}.help`)}
                  </span>
                </span>
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition',
                    selected ? 'border-q1-blue bg-q1-blue' : 'border-q1-line dark:border-gray-500',
                  )}
                  aria-hidden
                >
                  {selected && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 text-white" fill="none">
                      <path d="M2.5 6.5 5 9l4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>

              {/* The selected option's own fields, in the grey panel the design shows. */}
              {selected && value === 'FollowUp' && (
                <div className="mt-2 grid gap-3 rounded-xl bg-q1-canvas p-4 sm:grid-cols-2 dark:bg-gray-700/40">
                  <label className="block">
                    <span className="text-xs font-semibold text-q1-ink-soft dark:text-gray-300">
                      {t('q1.status.followUpDate')}
                    </span>
                    <input
                      type="date"
                      min={today}
                      value={followUpDate}
                      onChange={(e) => setFollowUpDate(e.target.value)}
                      className={fieldCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-q1-ink-soft dark:text-gray-300">
                      {t('q1.status.preferredTime')}
                    </span>
                    <select
                      value={followUpTime}
                      onChange={(e) => setFollowUpTime(e.target.value)}
                      className={fieldCls}
                    >
                      {FOLLOW_UP_TIMES.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {selected && value === 'NoResponse' && (
                <div className="mt-2 grid gap-3 rounded-xl bg-q1-canvas p-4 sm:grid-cols-2 dark:bg-gray-700/40">
                  <label className="block">
                    <span className="text-xs font-semibold text-q1-ink-soft dark:text-gray-300">
                      {t('q1.status.contactAttempts')}
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={attempts}
                      onChange={(e) => setAttempts(e.target.value)}
                      className={fieldCls}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-q1-ink-soft dark:text-gray-300">
                      {t('q1.status.nextAttempt')}
                    </span>
                    <input
                      type="date"
                      min={today}
                      value={nextAttempt}
                      onChange={(e) => setNextAttempt(e.target.value)}
                      className={fieldCls}
                    />
                  </label>
                </div>
              )}

              {selected && value === 'NotInterested' && (
                <div className="mt-2 rounded-xl bg-q1-canvas p-4 dark:bg-gray-700/40">
                  <label className="block">
                    <span className="text-xs font-semibold text-q1-ink-soft dark:text-gray-300">
                      {t('q1.status.reason')}
                    </span>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className={fieldCls}
                    >
                      {NOT_INTERESTED_REASONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-q1-red-soft px-3 py-2.5 text-sm font-medium text-q1-red">
          {error}
        </p>
      )}
    </Q1Modal>
  );
}
