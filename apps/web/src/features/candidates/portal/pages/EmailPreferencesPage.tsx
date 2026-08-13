import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useNotificationPrefs, useUpdateNotificationPrefs, type NotificationPrefs } from '../../candidate.api';
import { ModuleHeader } from '../components/ModuleFrame';
import { Btn, Card, CardBody, CardHeader, ErrorState, SkeletonRows } from '../components/primitives';

type Frequency = NotificationPrefs['jobAlertFrequency'];

const FREQUENCIES: { key: Frequency; label: string; blurb: string }[] = [
  { key: 'Instant', label: 'Real-time', blurb: 'As soon as something happens' },
  { key: 'Daily', label: 'Daily', blurb: 'One digest each morning' },
  { key: 'Weekly', label: 'Weekly', blurb: 'A summary every Monday' },
];

/**
 * Email Preferences — Figma node 7:7981.
 *
 * The design lists eight individual toggles; the stored preference record has three
 * channels plus a digest frequency, so the toggles are grouped onto the channel each
 * one is actually delivered over. Nothing here renders a switch that saves nowhere.
 */
export default function EmailPreferencesPage() {
  const { data, isLoading, isError, refetch } = useNotificationPrefs();
  const save = useUpdateNotificationPrefs();
  const { notify } = useToast();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  if (isError) {
    return (
      <>
        <ModuleHeader title="Email Preferences" />
        <Card>
          <ErrorState message="We could not load your preferences." onRetry={refetch} />
        </Card>
      </>
    );
  }

  if (isLoading || !draft) {
    return (
      <>
        <ModuleHeader title="Email Preferences" />
        <Card>
          <CardBody>
            <SkeletonRows rows={3} />
          </CardBody>
        </Card>
      </>
    );
  }

  const dirty = !!data && JSON.stringify(draft) !== JSON.stringify(data);

  const onSave = () => {
    save.mutate(draft, {
      onSuccess: () => notify('Preferences saved.', 'success'),
      onError: () => notify('Could not save your preferences.', 'error'),
    });
  };

  return (
    <>
      <ModuleHeader title="Email Preferences" />

      <Card>
        <CardHeader title="Notification Frequency" />
        <CardBody>
          <p className="mb-3 text-[13px] text-slate-500">How often do you want digest emails?</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {FREQUENCIES.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setDraft({ ...draft, jobAlertFrequency: f.key })}
                aria-pressed={draft.jobAlertFrequency === f.key}
                className={cn(
                  'rounded-xl border p-3.5 text-left transition-colors',
                  draft.jobAlertFrequency === f.key
                    ? 'border-aj-blue bg-blue-50 dark:bg-blue-950'
                    : 'border-aj-line hover:border-aj-blue dark:border-gray-700',
                )}
              >
                <span className="block text-sm font-bold text-slate-800 dark:text-gray-100">{f.label}</span>
                <span className="block text-xs text-slate-500">{f.blurb}</span>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Channels" />
        <CardBody className="divide-y divide-aj-line-soft dark:divide-gray-700">
          <ToggleRow
            title="Email alerts"
            blurb="Job recommendations, application updates and interview reminders by email"
            checked={draft.emailAlerts}
            onChange={(v) => setDraft({ ...draft, emailAlerts: v })}
          />
          <ToggleRow
            title="Push notifications"
            blurb="Recruiter messages and status changes pushed to this device"
            checked={draft.pushAlerts}
            onChange={(v) => setDraft({ ...draft, pushAlerts: v })}
          />
          <ToggleRow
            title="SMS alerts"
            blurb="Time-critical updates such as interview reschedules"
            checked={draft.smsAlerts}
            onChange={(v) => setDraft({ ...draft, smsAlerts: v })}
          />
        </CardBody>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        <Btn variant="secondary" onClick={() => navigate('/candidate/profile')}>
          Cancel
        </Btn>
        <Btn onClick={onSave} disabled={!dirty || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save Preferences'}
        </Btn>
      </div>
    </>
  );
}

/** Accessible switch row, reused by the account privacy tab. */
export function ToggleRow({
  title,
  blurb,
  checked,
  onChange,
  disabled,
  note,
}: {
  title: string;
  blurb: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  note?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-slate-800 dark:text-gray-100">{title}</p>
        <p className="text-xs text-slate-500 dark:text-gray-400">{blurb}</p>
        {note && <p className="mt-1 text-xs text-amber-600">{note}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-aj-blue' : 'bg-slate-300 dark:bg-gray-600',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-white shadow transition-[left]',
            checked ? 'left-[22px]' : 'left-0.5',
          )}
        />
      </button>
    </div>
  );
}
