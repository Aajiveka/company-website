import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Breadcrumbs, Button, Card, Input, Select, useToast } from '@/components/ui';
import { usePostJob } from '../client.api';

const schema = z.object({
  designation: z.string().min(2, 'Enter a designation'),
  city: z.string().min(2, 'Enter a location'),
  workMode: z.string().min(1, 'Select a work mode'),
  employmentType: z.string().min(1, 'Select employment type'),
  minExp: z.coerce.number().min(0),
  minCtc: z.coerce.number().min(0),
  maxCtc: z.coerce.number().min(0),
  jobDescr: z.string().min(10, 'Add a job description'),
});
type Values = z.infer<typeof schema>;

/** Client — post a new job (job-post.aspx / dashboard-post-job.aspx). */
export default function JobPostPage() {
  const { notify } = useToast();
  const navigate = useNavigate();
  const post = usePostJob();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = (values: Values) =>
    post.mutate(values, {
      onSuccess: () => {
        notify('Job posted successfully.', 'success');
        navigate('/company/jobs');
      },
    });

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: 'Manage Jobs', to: '/company/jobs' }, { label: 'Post a Job' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Post a Job</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Designation" error={errors.designation?.message} {...register('designation')} />
            <Input label="Location" error={errors.city?.message} {...register('city')} />
            <Select
              label="Work Mode"
              placeholder="Select…"
              options={[
                { label: 'On-site', value: 'On-site' },
                { label: 'Hybrid', value: 'Hybrid' },
                { label: 'Remote', value: 'Remote' },
              ]}
              error={errors.workMode?.message}
              {...register('workMode')}
            />
            <Select
              label="Employment Type"
              placeholder="Select…"
              options={[
                { label: 'Full-time', value: 'Full-time' },
                { label: 'Part-time', value: 'Part-time' },
                { label: 'Contract', value: 'Contract' },
              ]}
              error={errors.employmentType?.message}
              {...register('employmentType')}
            />
            <Input label="Minimum Experience (yrs)" type="number" error={errors.minExp?.message} {...register('minExp')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Min CTC (₹)" type="number" error={errors.minCtc?.message} {...register('minCtc')} />
              <Input label="Max CTC (₹)" type="number" error={errors.maxCtc?.message} {...register('maxCtc')} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy" htmlFor="jd">
              Job Description
            </label>
            <textarea
              id="jd"
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              {...register('jobDescr')}
            />
            {errors.jobDescr && <p className="mt-1 text-xs text-danger">{errors.jobDescr.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={post.isPending}>
              Publish Job
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
