import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Button, Card, Input, Skeleton, useToast } from '@/components/ui';

interface SiteSettings {
  siteName: string;
  supportEmail: string;
  tollFreeNumber: string;
  enableJobAlerts: boolean;
  enableAssessments: boolean;
  enableReferrals: boolean;
  enableMessaging: boolean;
  maintenanceMode: boolean;
  smtpHost: string;
  smtpPort: number;
  senderEmail: string;
  senderName: string;
  maxJobsPerEmployer: number;
  maxApplicationsPerCandidate: number;
  maxFileUploadSizeMb: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: '',
  supportEmail: '',
  tollFreeNumber: '',
  enableJobAlerts: false,
  enableAssessments: false,
  enableReferrals: false,
  enableMessaging: false,
  maintenanceMode: false,
  smtpHost: '',
  smtpPort: 587,
  senderEmail: '',
  senderName: '',
  maxJobsPerEmployer: 50,
  maxApplicationsPerCandidate: 100,
  maxFileUploadSizeMb: 5,
};

/* ---- Toggle switch ---- */
function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
      <div className="relative inline-flex items-center">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div
          className={cn(
            'h-6 w-11 rounded-full transition-colors',
            'bg-gray-200 dark:bg-gray-700',
            'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500',
            'peer-focus:ring-2 peer-focus:ring-blue-500/30',
          )}
        />
        <div
          className={cn(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
            'peer-checked:translate-x-5',
          )}
        />
      </div>
    </label>
  );
}

export default function AdminSettingsPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<SiteSettings>(DEFAULT_SETTINGS);

  const { data, isLoading } = useQuery<SiteSettings>({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const { data } = await api.get<SiteSettings>('/admin/settings');
      return data;
    },
  });

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (settings: SiteSettings) => {
      await api.patch('/admin/settings', settings);
    },
    onSuccess: () => {
      notify(t('adminSettings.saved'), 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: () => {
      notify(t('adminSettings.saveFailed'), 'error');
    },
  });

  const set = <K extends keyof SiteSettings>(key: K, value: SiteSettings[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {t('adminSettings.heading')}
      </h1>

      {/* General */}
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('adminSettings.general')}
        </h2>
        <Input
          label={t('adminSettings.siteName')}
          value={form.siteName}
          onChange={(e) => set('siteName', e.target.value)}
        />
        <Input
          label={t('adminSettings.supportEmail')}
          type="email"
          value={form.supportEmail}
          onChange={(e) => set('supportEmail', e.target.value)}
        />
        <Input
          label={t('adminSettings.tollFreeNumber')}
          value={form.tollFreeNumber}
          onChange={(e) => set('tollFreeNumber', e.target.value)}
        />
      </Card>

      {/* Features */}
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('adminSettings.features')}
        </h2>
        <Toggle
          id="enableJobAlerts"
          label={t('adminSettings.enableJobAlerts')}
          checked={form.enableJobAlerts}
          onChange={(v) => set('enableJobAlerts', v)}
        />
        <Toggle
          id="enableAssessments"
          label={t('adminSettings.enableAssessments')}
          checked={form.enableAssessments}
          onChange={(v) => set('enableAssessments', v)}
        />
        <Toggle
          id="enableReferrals"
          label={t('adminSettings.enableReferrals')}
          checked={form.enableReferrals}
          onChange={(v) => set('enableReferrals', v)}
        />
        <Toggle
          id="enableMessaging"
          label={t('adminSettings.enableMessaging')}
          checked={form.enableMessaging}
          onChange={(v) => set('enableMessaging', v)}
        />
        <Toggle
          id="maintenanceMode"
          label={t('adminSettings.maintenanceMode')}
          checked={form.maintenanceMode}
          onChange={(v) => set('maintenanceMode', v)}
        />
      </Card>

      {/* Email / SMTP */}
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('adminSettings.email')}
        </h2>
        <Input
          label={t('adminSettings.smtpHost')}
          value={form.smtpHost}
          onChange={(e) => set('smtpHost', e.target.value)}
        />
        <Input
          label={t('adminSettings.smtpPort')}
          type="number"
          value={String(form.smtpPort)}
          onChange={(e) => set('smtpPort', Number(e.target.value))}
        />
        <Input
          label={t('adminSettings.senderEmail')}
          type="email"
          value={form.senderEmail}
          onChange={(e) => set('senderEmail', e.target.value)}
        />
        <Input
          label={t('adminSettings.senderName')}
          value={form.senderName}
          onChange={(e) => set('senderName', e.target.value)}
        />
      </Card>

      {/* Limits */}
      <Card className="space-y-4 p-5">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {t('adminSettings.limits')}
        </h2>
        <Input
          label={t('adminSettings.maxJobsPerEmployer')}
          type="number"
          value={String(form.maxJobsPerEmployer)}
          onChange={(e) => set('maxJobsPerEmployer', Number(e.target.value))}
        />
        <Input
          label={t('adminSettings.maxApplicationsPerCandidate')}
          type="number"
          value={String(form.maxApplicationsPerCandidate)}
          onChange={(e) => set('maxApplicationsPerCandidate', Number(e.target.value))}
        />
        <Input
          label={t('adminSettings.maxFileUploadSizeMb')}
          type="number"
          value={String(form.maxFileUploadSizeMb)}
          onChange={(e) => set('maxFileUploadSizeMb', Number(e.target.value))}
        />
      </Card>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending
            ? t('adminSettings.saving')
            : t('adminSettings.save')}
        </Button>
      </div>
    </div>
  );
}
