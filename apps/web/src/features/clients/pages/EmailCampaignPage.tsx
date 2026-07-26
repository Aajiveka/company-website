import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Eye, Mail, Plus, Send } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, CardSkeleton, Input, Modal, Select, Table, useToast, type Column } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { api } from '@/lib/axios';

interface Campaign {
  id: number;
  name: string;
  subject: string;
  body: string;
  status: 'Draft' | 'Scheduled' | 'Sent' | 'Failed';
  recipientFilter: string;
  recipientCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  openRate: number | null;
}

const STATUS_TONES: Record<Campaign['status'], BadgeTone> = {
  Draft: 'gray',
  Scheduled: 'blue',
  Sent: 'green',
  Failed: 'red',
};

const RECIPIENT_FILTERS = ['all_applicants', 'shortlisted', 'interview_stage', 'selected'] as const;
type RecipientFilter = (typeof RECIPIENT_FILTERS)[number];

const campaignSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(2, t('campaigns.nameRequired')),
    subject: z.string().min(2, t('campaigns.subjectRequired')),
    body: z.string().min(10, t('campaigns.bodyRequired')),
    recipientFilter: z.enum(RECIPIENT_FILTERS, {
      errorMap: () => ({ message: t('campaigns.recipientRequired') }),
    }),
    scheduledAt: z.string().optional(),
  });

type CampaignValues = z.infer<ReturnType<typeof campaignSchema>>;

function PreviewModal({
  open,
  onClose,
  values,
  onSendNow,
  onSchedule,
  isSending,
}: {
  open: boolean;
  onClose: () => void;
  values: CampaignValues;
  onSendNow: () => void;
  onSchedule: () => void;
  isSending: boolean;
}) {
  const { t } = useTranslation('dashboard');

  const recipientLabels: Record<RecipientFilter, string> = {
    all_applicants: t('campaigns.allApplicants'),
    shortlisted: t('campaigns.shortlisted'),
    interview_stage: t('campaigns.interviewStage'),
    selected: t('campaigns.selected'),
  };

  return (
    <Modal open={open} onClose={onClose} title={t('campaigns.previewTitle')} className="max-w-lg">
      <div className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{t('campaigns.campaignName')}</p>
          <p className="text-sm font-semibold text-navy">{values.name}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{t('campaigns.recipients')}</p>
          <Badge tone="blue">{recipientLabels[values.recipientFilter]}</Badge>
        </div>
        <div className="rounded-lg border border-gray-200 dark:border-gray-600">
          <div className="border-b border-gray-200 px-4 py-2 dark:border-gray-600">
            <p className="text-xs text-gray-500">{t('campaigns.subjectLabel')}</p>
            <p className="text-sm font-medium text-navy">{values.subject}</p>
          </div>
          <div className="px-4 py-3">
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
              {values.body}
            </p>
          </div>
        </div>
        {values.scheduledAt && (
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">{t('campaigns.scheduledFor')}</p>
            <p className="text-sm text-navy">
              {new Date(values.scheduledAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
          <Button variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          {values.scheduledAt ? (
            <Button onClick={onSchedule} isLoading={isSending}>
              <Send className="mr-1.5 h-4 w-4" />
              {t('campaigns.scheduleButton')}
            </Button>
          ) : (
            <Button onClick={onSendNow} isLoading={isSending}>
              <Send className="mr-1.5 h-4 w-4" />
              {t('campaigns.sendNowButton')}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function CampaignList() {
  const { t } = useTranslation('dashboard');

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['client', 'campaigns'],
    queryFn: () => api.get<Campaign[]>('/clients/me/campaigns').then((r) => r.data),
  });

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const columns: Column<Campaign>[] = [
    {
      key: 'name',
      header: t('campaigns.columnName'),
      render: (r) => <span className="font-medium text-navy">{r.name}</span>,
    },
    {
      key: 'status',
      header: t('campaigns.columnStatus'),
      render: (r) => <Badge tone={STATUS_TONES[r.status]}>{r.status}</Badge>,
    },
    {
      key: 'recipientCount',
      header: t('campaigns.columnRecipients'),
      render: (r) => <span className="text-sm text-gray-600 dark:text-gray-300">{r.recipientCount}</span>,
    },
    {
      key: 'sentAt',
      header: t('campaigns.columnSentDate'),
      render: (r) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {r.status === 'Scheduled' ? formatDate(r.scheduledAt) : formatDate(r.sentAt)}
        </span>
      ),
    },
    {
      key: 'openRate',
      header: t('campaigns.columnOpenRate'),
      render: (r) => (
        <span className="text-sm text-gray-600 dark:text-gray-300">
          {r.openRate !== null ? `${r.openRate}%` : '-'}
        </span>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <Table
      columns={columns}
      data={campaigns ?? []}
      rowKey={(r) => r.id}
      isLoading={isLoading}
      emptyMessage={t('campaigns.noCampaigns')}
    />
  );
}

function CreateCampaignForm({ onCreated }: { onCreated: () => void }) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [previewValues, setPreviewValues] = useState<CampaignValues | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CampaignValues>({
    resolver: zodResolver(campaignSchema(t)),
    defaultValues: { recipientFilter: 'all_applicants', scheduledAt: '' },
  });

  const createCampaign = useMutation({
    mutationFn: (payload: CampaignValues & { sendNow: boolean }) =>
      api.post('/clients/me/campaigns', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'campaigns'] });
      notify(t('campaigns.created'), 'success');
      reset();
      setPreviewValues(null);
      onCreated();
    },
    onError: () => notify(t('campaigns.createFailed'), 'error'),
  });

  const onPreview = (values: CampaignValues) => {
    setPreviewValues(values);
  };

  const onSendNow = () => {
    if (!previewValues) return;
    createCampaign.mutate({ ...previewValues, sendNow: true });
  };

  const onSchedule = () => {
    if (!previewValues) return;
    createCampaign.mutate({ ...previewValues, sendNow: false });
  };

  const recipientOptions = [
    { label: t('campaigns.allApplicants'), value: 'all_applicants' },
    { label: t('campaigns.shortlisted'), value: 'shortlisted' },
    { label: t('campaigns.interviewStage'), value: 'interview_stage' },
    { label: t('campaigns.selected'), value: 'selected' },
  ];

  return (
    <>
      <Card>
        <form onSubmit={handleSubmit(onPreview)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('campaigns.campaignName')}
              placeholder={t('campaigns.namePlaceholder')}
              error={errors.name?.message}
              {...register('name')}
            />
            <Input
              label={t('campaigns.subjectLabel')}
              placeholder={t('campaigns.subjectPlaceholder')}
              error={errors.subject?.message}
              {...register('subject')}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy">
              {t('campaigns.bodyLabel')}
            </label>
            <textarea
              rows={8}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder={t('campaigns.bodyPlaceholder')}
              {...register('body')}
            />
            {errors.body?.message && (
              <p className="mt-1 text-xs text-danger">{errors.body.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('campaigns.recipientFilter')}
              options={recipientOptions}
              {...register('recipientFilter')}
            />
            <Input
              label={t('campaigns.scheduleDateTime')}
              type="datetime-local"
              {...register('scheduledAt')}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="submit" variant="outline">
              <Eye className="mr-1.5 h-4 w-4" />
              {t('campaigns.previewButton')}
            </Button>
          </div>
        </form>
      </Card>

      {previewValues && (
        <PreviewModal
          open
          onClose={() => setPreviewValues(null)}
          values={previewValues}
          onSendNow={onSendNow}
          onSchedule={onSchedule}
          isSending={createCampaign.isPending}
        />
      )}
    </>
  );
}

export default function EmailCampaignPage() {
  const { t } = useTranslation('dashboard');
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');

  const tabs = [
    { key: 'list' as const, label: t('campaigns.tabCampaigns'), icon: Mail },
    { key: 'create' as const, label: t('campaigns.tabCreate'), icon: Plus },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/company/profile' },
          { label: t('campaigns.heading') },
        ]}
      />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">
        {t('campaigns.heading')}
      </h1>

      <div className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-700 dark:bg-gray-800">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === key
                ? 'bg-white text-primary shadow-sm dark:bg-gray-700'
                : 'text-gray-500 hover:text-navy dark:text-gray-400'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'list' ? (
        <CampaignList />
      ) : (
        <CreateCampaignForm onCreated={() => setActiveTab('list')} />
      )}
    </div>
  );
}
