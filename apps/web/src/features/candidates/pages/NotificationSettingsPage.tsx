import { useEffect, useState } from 'react';
import { Bell, Mail } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface NotificationPrefs {
  emailOnShortlisted: boolean;
  emailOnInterview: boolean;
  emailOnSelected: boolean;
  emailOnRejected: boolean;
  emailJobAlerts: boolean;
  emailWeeklyDigest: boolean;
}

function useNotificationPrefs() {
  return useQuery({
    queryKey: ['candidate', 'notification-prefs'],
    queryFn: () => api.get<NotificationPrefs>('/candidates/me/notification-prefs').then((r) => r.data),
  });
}

function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) =>
      api.put('/candidates/me/notification-prefs', prefs).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidate', 'notification-prefs'] }),
  });
}

interface ToggleProps {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

function Toggle({ label, description, checked, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-gray-100 p-4 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800">
      <div>
        <p className="text-sm font-medium text-navy">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-600',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </button>
    </label>
  );
}

/** Email notification preferences for candidates. */
export default function NotificationSettingsPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const { data, isLoading } = useNotificationPrefs();
  const update = useUpdateNotificationPrefs();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);

  useEffect(() => {
    if (data && !prefs) setPrefs(data);
  }, [data, prefs]);

  const set = (key: keyof NotificationPrefs, value: boolean) => {
    setPrefs((p) => p ? { ...p, [key]: value } : p);
  };

  const onSave = () => {
    if (!prefs) return;
    update.mutate(prefs, {
      onSuccess: () => notify(t('notifPrefs.saved'), 'success'),
      onError: () => notify(t('notifPrefs.saveFailed'), 'error'),
    });
  };

  const hasChanges = prefs && data && JSON.stringify(prefs) !== JSON.stringify(data);

  return (
    <div className="mx-auto max-w-2xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('notifPrefs.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('notifPrefs.heading')}</h1>

      {isLoading || !prefs ? (
        <Card><p className="text-sm text-gray-500">{t('common:actions.loading')}</p></Card>
      ) : (
        <div className="space-y-6">
          {/* Status updates */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
              <Bell className="h-4 w-4 text-primary" />
              {t('notifPrefs.statusUpdates')}
            </h2>
            <div className="space-y-2">
              <Toggle
                label={t('notifPrefs.shortlisted')}
                description={t('notifPrefs.shortlistedDesc')}
                checked={prefs.emailOnShortlisted}
                onChange={(v) => set('emailOnShortlisted', v)}
              />
              <Toggle
                label={t('notifPrefs.interview')}
                description={t('notifPrefs.interviewDesc')}
                checked={prefs.emailOnInterview}
                onChange={(v) => set('emailOnInterview', v)}
              />
              <Toggle
                label={t('notifPrefs.selected')}
                description={t('notifPrefs.selectedDesc')}
                checked={prefs.emailOnSelected}
                onChange={(v) => set('emailOnSelected', v)}
              />
              <Toggle
                label={t('notifPrefs.rejected')}
                description={t('notifPrefs.rejectedDesc')}
                checked={prefs.emailOnRejected}
                onChange={(v) => set('emailOnRejected', v)}
              />
            </div>
          </div>

          {/* Job notifications */}
          <div>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
              <Mail className="h-4 w-4 text-primary" />
              {t('notifPrefs.jobNotifications')}
            </h2>
            <div className="space-y-2">
              <Toggle
                label={t('notifPrefs.jobAlerts')}
                description={t('notifPrefs.jobAlertsDesc')}
                checked={prefs.emailJobAlerts}
                onChange={(v) => set('emailJobAlerts', v)}
              />
              <Toggle
                label={t('notifPrefs.weeklyDigest')}
                description={t('notifPrefs.weeklyDigestDesc')}
                checked={prefs.emailWeeklyDigest}
                onChange={(v) => set('emailWeeklyDigest', v)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onSave} disabled={!hasChanges || update.isPending} isLoading={update.isPending}>
              {t('common:actions.save')}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
