import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, Select, useToast } from '@/components/ui';
import { api } from '@/lib/axios';

interface InterviewMode {
  id: number;
  label: string;
}

function useInterviewModes() {
  return useQuery({
    queryKey: ['client', 'interview-modes'],
    queryFn: () => api.get<InterviewMode[]>('/recruitment/interview-modes').then((r) => r.data),
    staleTime: Infinity,
  });
}

function useClientScheduleInterview() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { jobSubscriberMapId: number; interviewModeId: number; interviewTime: string; location?: string }) =>
      api.post('/recruitment/interviews', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'applicants'] });
    },
  });
}

const schema = z.object({
  interviewModeId: z.coerce.number().min(1, 'Select a mode'),
  interviewTime: z.string().min(1, 'Pick a date and time'),
  location: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  jobSubscriberMapId: number;
  candidateName: string;
}

/** Modal for employers to schedule an interview from the applicants page. */
export function ScheduleInterviewModal({ open, onClose, jobSubscriberMapId, candidateName }: Props) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const { data: modes } = useInterviewModes();
  const schedule = useClientScheduleInterview();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    schedule.mutate(
      { jobSubscriberMapId, ...values },
      {
        onSuccess: () => {
          notify(t('interview.scheduled'), 'success');
          reset();
          onClose();
        },
        onError: (e) =>
          notify(isAxiosError(e) ? e.response?.data?.message ?? t('interview.scheduleFailed') : t('interview.scheduleFailed'), 'error'),
      },
    );
  };

  return (
    <Modal open={open} onClose={onClose} title={t('interview.scheduleTitle', { name: candidateName })}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Select
          label={t('interview.mode')}
          placeholder={t('common:labels.select')}
          options={(modes ?? []).map((m) => ({ label: m.label, value: m.id }))}
          error={errors.interviewModeId?.message}
          {...register('interviewModeId')}
        />
        <Input
          label={t('interview.dateTime')}
          type="datetime-local"
          error={errors.interviewTime?.message}
          {...register('interviewTime')}
        />
        <Input label={t('interview.location')} placeholder={t('interview.locationPlaceholder')} {...register('location')} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" size="sm" isLoading={schedule.isPending}>
            {t('interview.scheduleButton')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
