import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { Check, X } from 'lucide-react';
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

const scheduleSchema = z.object({
  jobSubscriberMapId: z.coerce.number().min(1, 'Select a candidate'),
  interviewModeId: z.coerce.number().min(1, 'Select a mode'),
  interviewTime: z.string().min(1, 'Pick a date and time'),
  location: z.string().optional(),
});
type ScheduleValues = z.infer<typeof scheduleSchema>;

/** QC — interview schedule (Interviews.aspx / Interview-status.aspx). */
export default function InterviewsPage() {
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
  } = useForm<ScheduleValues>({ resolver: zodResolver(scheduleSchema) });

  const onSchedule = (values: ScheduleValues) =>
    schedule.mutate(values, {
      onSuccess: () => {
        notify('Interview scheduled.', 'success');
        setOpen(false);
        reset();
      },
      onError: (e) =>
        notify(isAxiosError(e) ? e.response?.data?.message ?? 'Could not schedule this interview' : 'Could not schedule this interview', 'error'),
    });

  const act = (interviewStatusId: number, status: 'Completed' | 'Cancelled') =>
    updateStatus.mutate(
      { interviewStatusId, status },
      { onSuccess: () => notify(`Interview marked ${status.toLowerCase()}.`, status === 'Completed' ? 'success' : 'info') },
    );

  const columns: Column<InterviewRow>[] = [
    { key: 'candidate', header: 'Candidate' },
    { key: 'designation', header: 'Designation' },
    { key: 'company', header: 'Company' },
    { key: 'mode', header: 'Mode', render: (r) => <Badge tone={modeTone[r.mode]}>{r.mode}</Badge> },
    { key: 'scheduledAt', header: 'Scheduled' },
    {
      key: 'status',
      header: 'Status',
      render: (r) => <Badge tone={r.status === 'Completed' ? 'green' : r.status === 'Cancelled' ? 'red' : 'blue'}>{r.status}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (r) =>
        r.status === 'Scheduled' ? (
          <div className="flex gap-2">
            <button
              onClick={() => act(r.interviewStatusId, 'Completed')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <Check className="h-3.5 w-3.5" /> Complete
            </button>
            <button
              onClick={() => act(r.interviewStatusId, 'Cancelled')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <X className="h-3.5 w-3.5" /> Cancel
            </button>
          </div>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: 'Recruitment', to: '/recruitment/candidates' }, { label: 'Interviews' }]} />
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">Interviews</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          Schedule Interview
        </Button>
      </div>
      <Table columns={columns} data={data ?? []} rowKey={(r) => r.interviewId} isLoading={isLoading} emptyMessage="No interviews scheduled." />

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule Interview">
        <form onSubmit={handleSubmit(onSchedule)} className="space-y-4" noValidate>
          <Select
            label="Candidate"
            placeholder="Select a mapped application…"
            options={(eligible ?? []).map((e) => ({
              label: `${e.candidate} — ${e.designation} (${e.company})`,
              value: e.jobSubscriberMapId,
            }))}
            error={errors.jobSubscriberMapId?.message}
            {...register('jobSubscriberMapId')}
          />
          <Select
            label="Mode"
            placeholder="Select…"
            options={(modes ?? []).map((m) => ({ label: m.label, value: m.id }))}
            error={errors.interviewModeId?.message}
            {...register('interviewModeId')}
          />
          <Input label="Date & Time" type="datetime-local" error={errors.interviewTime?.message} {...register('interviewTime')} />
          <Input label="Location (optional)" {...register('location')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={schedule.isPending}>
              Schedule
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
