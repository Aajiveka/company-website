import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Badge, Breadcrumbs, Button, Input, Modal, Select, Table, useToast, type Column } from '@/components/ui';
import {
  useEligibleForInterview,
  useInterviewModes,
  useInterviews,
  useScheduleInterview,
  useUpdateInterviewStatus,
} from '../recruitment.api';
import type { InterviewRow } from '../recruitment.types';

const modeTone = { 'In-person': 'purple', Telephonic: 'blue', Video: 'green' } as const;

const scheduleSchema = (t: TFunction) => z.object({
  jobSubscriberMapId: z.coerce.number().min(1, t('validation.selectCandidate')),
  interviewModeId: z.coerce.number().min(1, t('validation.selectMode')),
  interviewTime: z.string().min(1, t('validation.pickDateTime')),
  location: z.string().optional(),
});
type ScheduleValues = z.infer<ReturnType<typeof scheduleSchema>>;

/** QC — interview schedule (Interviews.aspx / Interview-status.aspx). */
export default function InterviewsPage() {
  const { t: tCommon } = useTranslation('common');
  const { data, isLoading } = useInterviews();
  const { data: eligible } = useEligibleForInterview();
  const { data: modes } = useInterviewModes();
  const schedule = useScheduleInterview();
  const updateStatus = useUpdateInterviewStatus();
  const { notify } = useToast();
  const [open, setOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleValues>({ resolver: zodResolver(scheduleSchema(tCommon)) });

  const onSchedule = (values: ScheduleValues) =>
    schedule.mutate(values, {
      onSuccess: () => {
        notify(tCommon('recruitment.interviewScheduled'), 'success');
        setOpen(false);
        reset();
      },
      onError: (e) =>
        notify(isAxiosError(e) ? e.response?.data?.message ?? tCommon('recruitment.couldNotSchedule') : tCommon('recruitment.couldNotSchedule'), 'error'),
    });

  const act = (interviewStatusId: number, status: 'Completed' | 'Cancelled') =>
    updateStatus.mutate(
      { interviewStatusId, status },
      { onSuccess: () => notify(status === 'Completed' ? tCommon('recruitment.interviewMarkedCompleted') : tCommon('recruitment.interviewMarkedCancelled'), status === 'Completed' ? 'success' : 'info') },
    );

  const columns: Column<InterviewRow>[] = [
    { key: 'candidate', header: tCommon('labels.candidate') },
    { key: 'designation', header: tCommon('labels.designation') },
    { key: 'company', header: tCommon('labels.company') },
    { key: 'mode', header: tCommon('recruitment.mode'), render: (r) => <Badge tone={modeTone[r.mode]}>{r.mode}</Badge> },
    { key: 'scheduledAt', header: tCommon('labels.posted') },
    {
      key: 'status',
      header: tCommon('labels.status'),
      render: (r) => <Badge tone={r.status === 'Completed' ? 'green' : r.status === 'Cancelled' ? 'red' : 'blue'}>{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: tCommon('labels.actions'),
      render: (r) =>
        r.status === 'Scheduled' ? (
          <div className="flex gap-2">
            <button
              onClick={() => act(r.interviewStatusId, 'Completed')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100"
            >
              <Check className="h-3.5 w-3.5" /> {tCommon('actions.complete')}
            </button>
            <button
              onClick={() => act(r.interviewStatusId, 'Cancelled')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" /> {tCommon('actions.cancel')}
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: tCommon('recruitment'), to: '/recruitment/candidates' }, { label: tCommon('recruitment.interviews') }]} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">{tCommon('recruitment.interviews')}</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          {tCommon('recruitment.scheduleInterview')}
        </Button>
      </div>
      <Table columns={columns} data={data ?? []} rowKey={(r) => r.interviewId} isLoading={isLoading} emptyMessage={tCommon('recruitment.noInterviews')} />

      <Modal open={open} onClose={() => setOpen(false)} title={tCommon('recruitment.scheduleInterview')}>
        <form onSubmit={handleSubmit(onSchedule)} className="space-y-4" noValidate>
          <Select
            label={tCommon('recruitment.candidateLabel')}
            placeholder={tCommon('recruitment.selectMappedApp')}
            options={(eligible ?? []).map((e) => ({
              label: `${e.candidate} — ${e.designation} (${e.company})`,
              value: e.jobSubscriberMapId,
            }))}
            error={errors.jobSubscriberMapId?.message}
            {...register('jobSubscriberMapId')}
          />
          <Select
            label={tCommon('recruitment.mode')}
            placeholder={tCommon('labels.select')}
            options={(modes ?? []).map((m) => ({ label: m.label, value: m.id }))}
            error={errors.interviewModeId?.message}
            {...register('interviewModeId')}
          />
          <Input label={tCommon('recruitment.dateTime')} type="datetime-local" error={errors.interviewTime?.message} {...register('interviewTime')} />
          <Input label={tCommon('recruitment.locationOptional')} {...register('location')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button type="submit" size="sm" isLoading={schedule.isPending}>
              {tCommon('actions.schedule')}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
