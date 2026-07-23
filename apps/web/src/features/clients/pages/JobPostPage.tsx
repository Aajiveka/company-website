import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { Breadcrumbs, Button, Card, Input, Select, Textarea, useToast } from '@/components/ui';
import { useCompanyJobs, useCompanyMasters, usePostJob, useUpdateJob } from '../client.api';

const schema = z
  .object({
    designationId: z.coerce.number().min(1, 'Select a designation'),
    cityId: z.coerce.number().min(1, 'Select a location'),
    workModeId: z.coerce.number().min(1, 'Select a work mode'),
    employmentTypeId: z.coerce.number().min(1, 'Select employment type'),
    minExp: z.coerce.number().min(0, 'Must be 0 or more'),
    minCtc: z.coerce.number().min(0, 'Must be 0 or more'),
    maxCtc: z.coerce.number().min(0, 'Must be 0 or more'),
    description: z.string().trim().min(10, 'Add a job description (at least 10 characters)'),
  })
  .refine((v) => v.maxCtc >= v.minCtc, {
    message: 'Max CTC must be greater than or equal to Min CTC',
    path: ['maxCtc'],
  });
type Values = z.infer<typeof schema>;

/** Client — post a new job, or edit an existing one (job-post.aspx). */
export default function JobPostPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { notify } = useToast();
  const navigate = useNavigate();
  const { data: masters } = useCompanyMasters();
  const { data: jobs } = useCompanyJobs();
  const post = usePostJob();
  const update = useUpdateJob(id ?? '');
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const job = isEdit ? jobs?.find((j) => String(j.jobId) === id) : undefined;

  // Derive stateId from existing cityId for edit mode
  const [selectedStateId, setSelectedStateId] = useState<number | ''>('');
  const filteredCities = useMemo(
    () => (selectedStateId ? (masters?.cities ?? []).filter((c) => c.stateId === selectedStateId) : []),
    [masters?.cities, selectedStateId],
  );

  useEffect(() => {
    if (job && masters) {
      const city = masters.cities.find((c) => c.id === job.cityId);
      if (city) setSelectedStateId(city.stateId);
      reset({
        designationId: job.designationId,
        cityId: job.cityId,
        workModeId: job.workModeId,
        employmentTypeId: job.employmentTypeId,
        minExp: job.minExp,
        minCtc: job.minCtc,
        maxCtc: job.maxCtc,
        description: job.description,
      });
    }
  }, [job, masters, reset]);

  const onSubmit = (values: Values) => {
    const mutation = isEdit ? update : post;
    mutation.mutate(values, {
      onSuccess: () => {
        notify(isEdit ? 'Job updated successfully.' : 'Job posted successfully.', 'success');
        navigate('/company/jobs');
      },
    });
  };

  const opts = (list?: { id: number; label: string }[]) =>
    (list ?? []).map((o) => ({ label: o.label, value: o.id }));

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: 'Manage Jobs', to: '/company/jobs' }, { label: isEdit ? 'Edit Job' : 'Post a Job' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{isEdit ? 'Edit Job' : 'Post a Job'}</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Designation"
              required
              placeholder="Select…"
              options={opts(masters?.designations)}
              error={errors.designationId?.message}
              {...register('designationId')}
            />
            <Select
              label="State"
              placeholder="Select…"
              options={opts(masters?.states)}
              value={selectedStateId}
              onChange={(e) => {
                setSelectedStateId(Number(e.target.value) || '');
                setValue('cityId', 0);
              }}
            />
            <Select
              label="District / City"
              required
              placeholder={selectedStateId ? 'Select…' : 'Select state first'}
              options={opts(filteredCities)}
              error={errors.cityId?.message}
              disabled={!selectedStateId}
              {...register('cityId')}
            />
            <Select
              label="Work Mode"
              required
              placeholder="Select…"
              options={opts(masters?.workModes)}
              error={errors.workModeId?.message}
              {...register('workModeId')}
            />
            <Select
              label="Employment Type"
              required
              placeholder="Select…"
              options={opts(masters?.employmentTypes)}
              error={errors.employmentTypeId?.message}
              {...register('employmentTypeId')}
            />
            <Input label="Minimum Experience (yrs)" required type="number" error={errors.minExp?.message} {...register('minExp')} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label="Min CTC (₹)" required type="number" error={errors.minCtc?.message} {...register('minCtc')} />
              <Input label="Max CTC (₹)" required type="number" error={errors.maxCtc?.message} {...register('maxCtc')} />
            </div>
          </div>
          <Textarea
            label="Job Description"
            required
            rows={5}
            error={errors.description?.message}
            {...register('description')}
          />
          <div className="flex justify-end">
            <Button type="submit" isLoading={post.isPending || update.isPending}>
              {isEdit ? 'Save Changes' : 'Publish Job'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
