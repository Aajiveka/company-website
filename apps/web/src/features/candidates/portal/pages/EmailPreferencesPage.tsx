import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useNotificationPrefs, useUpdateNotificationPrefs, type NotificationPrefs } from '../../candidate.api';
import { ModuleHeader } from '../components/ModuleFrame';
import { Btn, Card, CardBody, CardHeader, ErrorState, SkeletonRows } from '../components/primitives';

type Frequency = NotificationPrefs['jobAlertFrequency'];
/** Only the boolean switches — the frequency and the id are handled separately. */
type ToggleKey = {
  [K in keyof NotificationPrefs]: NotificationPrefs[K] extends boolean ? K : never;
}[keyof NotificationPrefs];

const FREQUENCIES: { key: Frequency; label: string; blurb: string }[] = [
  { key: 'Instant', label: 'Real-time', blurb: 'As soon as something happens' },
  { key: 'Daily', label: 'Daily', blurb: 'One digest each morning' },
  { key: 'Weekly', label: 'Weekly', blurb: 'A summary every Monday' },
];

/** The design's three topic groups, in its order (Figma node 7:7981). */
const GROUPS: { title: string; items: { key: ToggleKey; title: string; blurb: string }[] }[] = [
  {
    title: 'Job Recommendations',
    items: [
      { key: 'newJobAlerts', title: 'New Job Alerts', blurb: 'Roles matching your saved preferences' },
      { key: 'weeklyJobDigest', title: 'Weekly Job Digest', blurb: 'Top opportunities every Monday' },
      { key: 'profileViewAlerts', title: 'Profile View Alerts', blurb: 'When a recruiter visits your profile' },
    ],
  },
  {
    title: 'Applications & Interviews',
    items: [
      {
        key: 'applicationStatusUpdates',
        title: 'Application Status Updates',
        blurb: 'When your application status changes',
      },
      { key: 'recruiterMessages', title: 'Recruiter Messages', blurb: 'When a recruiter reaches out to you' },
      { key: 'interviewReminders', title: 'Interview Reminders', blurb: '24h and 1h before your interviews' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { key: 'productUpdates', title: 'Product Updates', blurb: 'New features and improvements' },
      { key: 'marketingOffers', title: 'Marketing & Offers', blurb: 'Promotions and success stories' },
    ],
  },
];

const CHANNELS: { key: ToggleKey; title: string; blurb: string }[] = [
  { key: 'emailAlerts', title: 'Email', blurb: 'Send the topics above to your inbox' },
  { key: 'pushAlerts', title: 'Push notifications', blurb: 'Push them to this device' },
  { key: 'smsAlerts', title: 'SMS', blurb: 'Text the time-critical ones, such as interview reschedules' },
];

/**
 * Email Preferences — Figma node 7:7981.
 *
 * Two axes, which is why the screen has both sections: the topic switches say *what* we
 * contact the candidate about, the channel switches say *how*. Turning every channel off
 * silences everything regardless of the topics, so that case is called out rather than
 * leaving the topic list looking live when nothing can reach them.
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
  const allChannelsOff = !draft.emailAlerts && !draft.pushAlerts && !draft.smsAlerts;
  const set = (key: ToggleKey, value: boolean) => setDraft({ ...draft, [key]: value });

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

      {GROUPS.map((group) => (
        <Card key={group.title}>
          <CardHeader title={group.title} />
          <CardBody className="divide-y divide-aj-line-soft dark:divide-gray-700">
            {group.items.map((item) => (
              <ToggleRow
                key={item.key}
                title={item.title}
                blurb={item.blurb}
                checked={draft[item.key]}
                onChange={(v) => set(item.key, v)}
              />
            ))}
          </CardBody>
        </Card>
      ))}

      <Card>
        <CardHeader title="Delivery" />
        <CardBody className="divide-y divide-aj-line-soft dark:divide-gray-700">
          {CHANNELS.map((c) => (
            <ToggleRow
              key={c.key}
              title={c.title}
              blurb={c.blurb}
              checked={draft[c.key]}
              onChange={(v) => set(c.key, v)}
            />
          ))}
        </CardBody>
        {allChannelsOff && (
          <p className="border-t border-aj-line-soft px-5 py-3 text-xs text-amber-600 dark:border-gray-700">
            Every delivery channel is off, so none of the topics above will reach you.
          </p>
        )}
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
