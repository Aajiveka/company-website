import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bell, Trash2 } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, Input, ListSkeleton, Select, useToast } from '@/components/ui';
import { useCreateJobAlert, useJobAlerts } from '../candidate.api';

const schema = z.object({
  keyword: z.string().min(2, 'Enter a keyword'),
  location: z.string().min(2, 'Enter a location'),
  frequency: z.enum(['Daily', 'Weekly']),
});
type Values = z.infer<typeof schema>;

/** Candidate — job alerts (candidate-dashboard-job-alerts.aspx). */
export default function JobAlertsPage() {
  const { data: alerts, isLoading } = useJobAlerts();
  const create = useCreateJobAlert();
  const { notify } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { frequency: 'Daily' } });

  const onSubmit = (values: Values) =>
    create.mutate(values, {
      onSuccess: () => {
        notify('Job alert created.', 'success');
        reset({ keyword: '', location: '', frequency: 'Daily' });
      },
    });

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/candidate/profile' }, { label: 'Job Alerts' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Job Alerts</h1>

      <Card className="mb-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2 sm:items-end lg:grid-cols-4" noValidate>
          <Input label="Keyword" required placeholder="e.g. React Developer" error={errors.keyword?.message} {...register('keyword')} />
          <Input label="Location" required placeholder="e.g. Pune" error={errors.location?.message} {...register('location')} />
          <Select
            label="Frequency"
            options={[
              { label: 'Daily', value: 'Daily' },
              { label: 'Weekly', value: 'Weekly' },
            ]}
            {...register('frequency')}
          />
          <Button type="submit" isLoading={create.isPending}>
            Create Alert
          </Button>
        </form>
      </Card>

      <div className="space-y-3">
        {isLoading ? (
          <ListSkeleton count={3} />
        ) : (
          (alerts ?? []).map((a) => (
            <Card key={a.alertId} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-navy">{a.keyword}</p>
                  <p className="text-sm text-gray-500">{a.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="blue">{a.frequency}</Badge>
                <button
                  onClick={() => notify('Alert removed.', 'info')}
                  className="text-gray-400 hover:text-danger"
                  aria-label="Delete alert"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
