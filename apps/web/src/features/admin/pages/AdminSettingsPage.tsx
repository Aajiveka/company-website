import { useEffect, useState } from 'react';
import { Globe, Mail, Server, Settings, Shield, SlidersHorizontal } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Alert, Badge, Breadcrumbs, Button, Card, Input, Skeleton, useToast } from '@/components/ui';

interface SiteSettings {
  siteName: string;
  tagline: string;
  supportEmail: string;
  tollFreeNumber: string;
  enableJobAlerts: boolean;
  enableAssessments: boolean;
  enableReferrals: boolean;
  enableMessaging: boolean;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  enableEmailNotifications: boolean;
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
  tagline: '',
  supportEmail: '',
  tollFreeNumber: '',
  enableJobAlerts: false,
  enableAssessments: false,
  enableReferrals: false,
  enableMessaging: false,
  maintenanceMode: false,
  registrationOpen: true,
  enableEmailNotifications: true,
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
  description,
  checked,
  onChange,
  variant,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  variant?: 'danger';
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <div className="flex-1">
        <span className={cn('text-sm font-medium', variant === 'danger' ? 'text-red-700 dark:text-red-400' : 'text-gray-700 dark:text-gray-300')}>
          {label}
        </span>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <div className="relative inline-flex shrink-0 items-center">
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
            variant === 'danger'
              ? 'peer-checked:bg-red-600 dark:peer-checked:bg-red-500'
              : 'peer-checked:bg-blue-600 dark:peer-checked:bg-blue-500',
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

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold text-navy dark:text-gray-100">
      {icon}
      {title}
    </h2>
  );
}

function SystemInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2.5 last:border-0 dark:border-gray-700">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <Badge tone="gray">{value}</Badge>
    </div>
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
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-8 w-48" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('adminSettings.heading') }]} />

      <div className="flex items-center gap-2">
        <Settings className="h-6 w-6 text-navy dark:text-white" />
        <h1 className="font-heading text-2xl font-bold text-navy dark:text-gray-100">
          {t('adminSettings.heading')}
        </h1>
      </div>

      {/* Maintenance mode warning */}
      {form.maintenanceMode && (
        <Alert variant="warning">
          {t('adminSettings.maintenanceModeWarning')}
        </Alert>
      )}

      {/* Site settings */}
      <Card className="space-y-4 p-5">
        <SectionHeader icon={<Globe className="h-5 w-5 text-primary" />} title={t('adminSettings.siteSettings')} />
        <Input
          label={t('adminSettings.siteName')}
          value={form.siteName}
          onChange={(e) => set('siteName', e.target.value)}
        />
        <Input
          label={t('adminSettings.tagline')}
          value={form.tagline}
          onChange={(e) => set('tagline', e.target.value)}
          placeholder={t('adminSettings.taglinePlaceholder')}
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

      {/* Feature toggles */}
      <Card className="space-y-3 p-5">
        <SectionHeader icon={<SlidersHorizontal className="h-5 w-5 text-primary" />} title={t('adminSettings.featureToggles')} />

        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-800 dark:bg-red-900/10">
          <Toggle
            id="maintenanceMode"
            label={t('adminSettings.maintenanceMode')}
            description={t('adminSettings.maintenanceModeDesc')}
            checked={form.maintenanceMode}
            onChange={(v) => set('maintenanceMode', v)}
            variant="danger"
          />
        </div>

        <Toggle
          id="registrationOpen"
          label={t('adminSettings.registrationOpen')}
          description={t('adminSettings.registrationOpenDesc')}
          checked={form.registrationOpen}
          onChange={(v) => set('registrationOpen', v)}
        />
        <Toggle
          id="enableEmailNotifications"
          label={t('adminSettings.enableEmailNotifications')}
          description={t('adminSettings.enableEmailNotificationsDesc')}
          checked={form.enableEmailNotifications}
          onChange={(v) => set('enableEmailNotifications', v)}
        />

        <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-400">{t('adminSettings.platformFeatures')}</p>
        </div>

        <Toggle
          id="enableJobAlerts"
          label={t('adminSettings.enableJobAlerts')}
          description={t('adminSettings.enableJobAlertsDesc')}
          checked={form.enableJobAlerts}
          onChange={(v) => set('enableJobAlerts', v)}
        />
        <Toggle
          id="enableAssessments"
          label={t('adminSettings.enableAssessments')}
          description={t('adminSettings.enableAssessmentsDesc')}
          checked={form.enableAssessments}
          onChange={(v) => set('enableAssessments', v)}
        />
        <Toggle
          id="enableReferrals"
          label={t('adminSettings.enableReferrals')}
          description={t('adminSettings.enableReferralsDesc')}
          checked={form.enableReferrals}
          onChange={(v) => set('enableReferrals', v)}
        />
        <Toggle
          id="enableMessaging"
          label={t('adminSettings.enableMessaging')}
          description={t('adminSettings.enableMessagingDesc')}
          checked={form.enableMessaging}
          onChange={(v) => set('enableMessaging', v)}
        />
      </Card>

      {/* Email / SMTP */}
      <Card className="space-y-4 p-5">
        <SectionHeader icon={<Mail className="h-5 w-5 text-primary" />} title={t('adminSettings.email')} />
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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
        </div>
      </Card>

      {/* Limits */}
      <Card className="space-y-4 p-5">
        <SectionHeader icon={<Shield className="h-5 w-5 text-primary" />} title={t('adminSettings.limits')} />
        <div className="grid gap-4 sm:grid-cols-3">
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
        </div>
      </Card>

      {/* System info */}
      <Card className="space-y-2 p-5">
        <SectionHeader icon={<Server className="h-5 w-5 text-primary" />} title={t('adminSettings.systemInfo')} />
        <SystemInfoRow label={t('adminSettings.environment')} value={import.meta.env.MODE} />
        <SystemInfoRow label={t('adminSettings.apiUrl')} value={import.meta.env.VITE_API_URL ?? '/api'} />
        <SystemInfoRow label={t('adminSettings.appVersion')} value={import.meta.env.VITE_APP_VERSION ?? '1.0.0'} />
        <SystemInfoRow label={t('adminSettings.nodeEnv')} value={import.meta.env.DEV ? 'development' : 'production'} />
        <SystemInfoRow label={t('adminSettings.buildTime')} value={new Date().toLocaleDateString()} />
      </Card>

      {/* Save */}
      <div className="flex justify-end pb-6">
        <Button
          onClick={() => saveMutation.mutate(form)}
          isLoading={saveMutation.isPending}
        >
          {t('adminSettings.save')}
        </Button>
      </div>
    </div>
  );
}
