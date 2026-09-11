import { isAxiosError } from 'axios';
import { ArrowRight, Check, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { CHECKLIST_ITEMS, type ChecklistKey, type Q1Profile } from '../q1.types';
import { Q1Button } from './Q1Modal';
import { Q1Card } from './primitives';

/**
 * The "Q1 Initial Screening" rail.
 *
 * Two cards: the checklist, and a state card whose contents depend on completeness — a green
 * "Profile Complete / Mark as Verified" at 100%, and "Profile Incomplete" with the missing
 * list and the two contact actions below it otherwise. That is exactly how the three profile
 * frames differ from one another.
 */
export function ScreeningRail({
  profile,
  onToggle,
  onToggleAll,
  onVerify,
  onContact,
  onRequestUpdate,
  isBusy,
}: {
  profile: Q1Profile;
  onToggle: (item: ChecklistKey, checked: boolean) => Promise<unknown>;
  onToggleAll: (checked: boolean) => Promise<unknown>;
  onVerify: () => Promise<unknown>;
  onContact: () => void;
  onRequestUpdate: () => Promise<unknown>;
  isBusy: boolean;
}) {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const { screening, profileCompleteness, missingItems } = profile;
  const complete = profileCompleteness >= 100;
  const allChecked = screening.checklistDone === screening.checklistTotal;

  const guard = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      notify(
        isAxiosError(e) ? (e.response?.data?.message ?? t('errors.somethingWrong')) : t('errors.somethingWrong'),
        'error',
      );
    }
  };

  const verify = () =>
    guard(async () => {
      await onVerify();
      notify(t('q1.rail.verified'), 'success');
    });

  const requestUpdate = () =>
    guard(async () => {
      await onRequestUpdate();
      notify(t('q1.rail.updateRequested'), 'success');
    });

  return (
    <div className="space-y-4">
      <Q1Card className="p-5">
        <h2 className="font-display text-sm font-bold text-q1-ink dark:text-white">
          {t('q1.rail.title')}
        </h2>
        <p className="mt-1 text-xs text-q1-ink-soft dark:text-gray-300">{t('q1.rail.subtitle')}</p>

        {/* Profile completeness — the candidate's data, not the screener's progress. */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-q1-ink-soft dark:text-gray-300">
              {t('q1.rail.completeness')}
            </span>
            <span className="font-bold text-q1-ink dark:text-white">{profileCompleteness}%</span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-q1-chip dark:bg-gray-700"
            role="progressbar"
            aria-valuenow={profileCompleteness}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={t('q1.rail.completeness')}
          >
            <div
              className={cn('h-full rounded-full transition-[width]', complete ? 'bg-q1-green' : 'bg-q1-blue')}
              style={{ width: `${profileCompleteness}%` }}
            />
          </div>
        </div>

        <hr className="my-4 border-q1-line dark:border-gray-700" />

        {/* Select all + the screener's own progress through the seven checks. */}
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2.5 text-xs font-medium text-q1-ink-soft dark:text-gray-300">
            <CheckBox
              checked={allChecked}
              disabled={isBusy}
              onChange={(next) => void guard(() => onToggleAll(next))}
              label={t('q1.rail.selectAll')}
            />
            {t('q1.rail.selectAll')}
          </label>
          <span className="text-xs font-bold text-q1-ink dark:text-white">
            {screening.checklistDone}/{screening.checklistTotal} · {screening.checklistPercent}%
          </span>
        </div>

        <ul className="mt-3 space-y-2.5">
          {CHECKLIST_ITEMS.map((item) => {
            const checked = screening.checklist[item];
            return (
              <li key={item}>
                <label className="flex items-start gap-2.5">
                  <CheckBox
                    checked={checked}
                    disabled={isBusy}
                    onChange={(next) => void guard(() => onToggle(item, next))}
                    label={t(`q1.checklist.${item}`)}
                  />
                  <span
                    className={cn(
                      'text-sm transition',
                      checked
                        ? 'text-q1-muted line-through'
                        : 'text-q1-ink-soft dark:text-gray-300',
                    )}
                  >
                    {t(`q1.checklist.${item}`)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </Q1Card>

      <Q1Card className="p-5">
        <div className="flex items-start gap-3">
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              complete ? 'bg-q1-green-soft text-q1-green' : 'bg-q1-amber-soft text-q1-amber',
            )}
          >
            {complete ? <ShieldCheck className="h-5 w-5" /> : <TriangleAlert className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="font-display text-sm font-bold text-q1-ink dark:text-white">
              {complete ? t('q1.rail.completeTitle') : t('q1.rail.incompleteTitle')}
            </p>
            <p className="mt-1 text-xs text-q1-ink-soft dark:text-gray-300">
              {complete ? t('q1.rail.completeBody') : t('q1.rail.incompleteBody')}
            </p>
          </div>
        </div>

        {!complete && missingItems.length > 0 && (
          <ul className="mt-4 space-y-2">
            {missingItems.map((m) => (
              <li key={m} className="flex items-center gap-2 text-xs text-q1-ink-soft dark:text-gray-300">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-q1-amber" aria-hidden />
                {m}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 space-y-2">
          {complete ? (
            <Q1Button variant="success" className="w-full" disabled={isBusy} onClick={() => void verify()}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
              {isBusy ? t('actions.loading') : t('q1.rail.markVerified')}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Q1Button>
          ) : (
            <>
              <Q1Button className="w-full" onClick={onContact} disabled={isBusy}>
                {t('q1.profile.contactCandidate')}
              </Q1Button>
              <Q1Button
                variant="ghost"
                className="w-full"
                disabled={isBusy}
                onClick={() => void requestUpdate()}
              >
                {isBusy ? t('actions.loading') : t('q1.rail.requestUpdate')}
              </Q1Button>
            </>
          )}
        </div>
      </Q1Card>
    </div>
  );
}

/** The rounded-6 green checkbox the design uses, driven by a real input for a11y. */
function CheckBox({
  checked,
  disabled,
  onChange,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <span className="relative inline-flex h-[18px] w-[18px] shrink-0">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
      />
      <span
        aria-hidden
        className={cn(
          'flex h-[18px] w-[18px] items-center justify-center rounded-md border-2 transition',
          'peer-focus-visible:ring-2 peer-focus-visible:ring-q1-blue/40',
          checked
            ? 'border-q1-green bg-q1-green text-white'
            : 'border-q1-line bg-q1-surface dark:border-gray-500 dark:bg-gray-700',
        )}
      >
        {checked && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
    </span>
  );
}
