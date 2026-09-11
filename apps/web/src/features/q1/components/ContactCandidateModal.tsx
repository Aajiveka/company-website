import { useState } from 'react';
import { isAxiosError } from 'axios';
import { ArrowRight, MessageSquare, Phone, Mail, MessageCircle, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { CONTACT_CHANNELS, type ContactChannel } from '../q1.types';
import { Q1Button, Q1Modal } from './Q1Modal';

const CHANNEL_ICON: Record<ContactChannel, LucideIcon> = {
  Call: Phone,
  WhatsApp: MessageCircle,
  Email: Mail,
  Message: MessageSquare,
};

/**
 * Contact Candidate.
 *
 * The primary action reads "Update Status →" in the design: contacting someone does not by
 * itself move them anywhere, so this closes and hands straight over to the status modal
 * rather than deciding an outcome on the screener's behalf.
 */
export function ContactCandidateModal({
  open,
  onClose,
  onContinue,
  candidateName,
  candidateId,
  phone,
  missingItems,
  onSubmit,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  onContinue: () => void;
  candidateName: string;
  candidateId: number;
  phone: string;
  missingItems: string[];
  onSubmit: (payload: { channel: ContactChannel; reason: string; internalNote: string }) => Promise<unknown>;
  isPending: boolean;
}) {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const [channel, setChannel] = useState<ContactChannel>('Call');
  const [note, setNote] = useState('');

  const reason = t('q1.contact.defaultReason');

  const submit = async () => {
    try {
      await onSubmit({ channel, reason, internalNote: note.trim() });
      notify(t('q1.contact.logged'), 'success');
      setNote('');
      onClose();
      onContinue();
    } catch (e) {
      notify(
        isAxiosError(e) ? (e.response?.data?.message ?? t('errors.somethingWrong')) : t('errors.somethingWrong'),
        'error',
      );
    }
  };

  return (
    <Q1Modal
      open={open}
      onClose={onClose}
      title={t('q1.contact.title')}
      subtitle={`${candidateName}${phone ? ` · ${phone}` : ''}`}
      avatarName={candidateName}
      avatarId={candidateId}
      footer={
        <>
          <Q1Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Q1Button>
          <Q1Button onClick={() => void submit()} disabled={isPending}>
            {isPending ? t('actions.loading') : t('q1.contact.updateStatus')}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Q1Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-lg bg-q1-blue-soft p-3.5 text-sm font-semibold text-q1-ink dark:bg-q1-blue/15 dark:text-gray-100">
          {t('q1.contact.reasonLabel')} {reason}
        </div>

        <div>
          <p className="text-sm font-semibold text-q1-ink dark:text-gray-100">
            {t('q1.contact.whatsMissing')}
          </p>
          {missingItems.length ? (
            <ul className="mt-2 space-y-2">
              {missingItems.map((m) => (
                <li
                  key={m}
                  className="flex items-center gap-2.5 rounded-lg border border-q1-line px-3 py-2.5 text-sm text-q1-ink-soft dark:border-gray-600 dark:text-gray-300"
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-q1-amber" aria-hidden />
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 rounded-lg border border-q1-line px-3 py-2.5 text-sm text-q1-muted dark:border-gray-600">
              {t('q1.contact.nothingMissing')}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-semibold text-q1-ink dark:text-gray-100">
            {t('q1.contact.channel')}
          </legend>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CONTACT_CHANNELS.map((c) => {
              const Icon = CHANNEL_ICON[c];
              const selected = channel === c;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setChannel(c)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2.5 text-xs font-medium transition',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40',
                    selected
                      ? 'border-q1-blue bg-q1-blue-soft text-q1-blue'
                      : 'border-q1-line text-q1-ink-soft hover:bg-q1-chip dark:border-gray-600 dark:text-gray-300',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  {c}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm font-semibold text-q1-ink dark:text-gray-100">
            {t('q1.contact.internalNote')}
          </span>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            placeholder={t('q1.contact.notePlaceholder')}
            className="mt-2 block w-full rounded-lg border border-q1-line bg-q1-surface px-3 py-2.5 text-sm text-q1-ink outline-none transition focus:border-q1-blue focus:ring-2 focus:ring-q1-blue/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </label>
      </div>
    </Q1Modal>
  );
}
