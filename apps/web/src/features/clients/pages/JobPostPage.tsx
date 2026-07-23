import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Breadcrumbs, Button, Card, Input, Select, useToast } from '@/components/ui';
import { useCompanyJobs, useCompanyMasters, usePostJob, useUpdateJob } from '../client.api';

const schema = (t: TFunction) => z.object({
  designationId: z.coerce.number().min(1, t('validation.selectDesignation')),
  cityId: z.coerce.number().min(1, t('validation.selectLocation')),
  workModeId: z.coerce.number().min(1, t('validation.selectWorkMode')),
  employmentTypeId: z.coerce.number().min(1, t('validation.selectEmploymentType')),
  minExp: z.coerce.number().min(0),
  minCtc: z.coerce.number().min(0),
  maxCtc: z.coerce.number().min(0),
  description: z.string().min(10, t('validation.addDescription')),
});
type Values = z.infer<ReturnType<typeof schema>>;

/** Client — post a new job, or edit an existing one (job-post.aspx). */
export default function JobPostPage() {
  const { t } = useTranslation('public');
  const { t: tCommon } = useTranslation('common');
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
  } = useForm<Values>({ resolver: zodResolver(schema(tCommon)) });

  const job = isEdit ? jobs?.find((j) => String(j.jobId) === id) : undefined;

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
        notify(isEdit ? t('jobPost.updateSuccess') : t('jobPost.postSuccess'), 'success');
        navigate('/company/jobs');
      },
    });
  };

  const opts = (list?: { id: number; label: string }[]) =>
    (list ?? []).map((o) => ({ label: o.label, value: o.id }));

  return (
    <div className="mx-auto max-w-3xl">
      <Breadcrumbs items={[{ label: t('manageJobs.heading'), to: '/company/jobs' }, { label: isEdit ? t('jobPost.editTitle') : t('jobPost.postTitle') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{isEdit ? t('jobPost.editTitle') : t('jobPost.postTitle')}</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('jobPost.designation')}
              placeholder={t('common:labels.select')}
              options={opts(masters?.designations)}
              error={errors.designationId?.message}
              {...register('designationId')}
            />
            <Select
              label={t('jobPost.state')}
              placeholder={t('common:labels.select')}
              options={opts(masters?.states)}
              value={selectedStateId}
              onChange={(e) => {
                setSelectedStateId(Number(e.target.value) || '');
                setValue('cityId', 0);
              }}
            />
            <Select
              label={t('jobPost.districtCity')}
              placeholder={selectedStateId ? t('common:labels.select') : t('common:labels.selectStateFirst')}
              options={opts(filteredCities)}
              error={errors.cityId?.message}
              disabled={!selectedStateId}
              {...register('cityId')}
            />
            <Select
              label={t('jobPost.workMode')}
              placeholder={t('common:labels.select')}
              options={opts(masters?.workModes)}
              error={errors.workModeId?.message}
              {...register('workModeId')}
            />
            <Select
              label={t('jobPost.employmentType')}
              placeholder={t('common:labels.select')}
              options={opts(masters?.employmentTypes)}
              error={errors.employmentTypeId?.message}
              {...register('employmentTypeId')}
            />
            <Input label={t('jobPost.minExperience')} type="number" error={errors.minExp?.message} {...register('minExp')} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input label={t('jobPost.minCtc')} type="number" error={errors.minCtc?.message} {...register('minCtc')} />
              <Input label={t('jobPost.maxCtc')} type="number" error={errors.maxCtc?.message} {...register('maxCtc')} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy" htmlFor="jd">
              {t('jobPost.description')}
            </label>
            <textarea
              id="jd"
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              {...register('description')}
            />
            {errors.description && <p className="mt-1 text-xs text-danger">{errors.description.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={post.isPending || update.isPending}>
              {isEdit ? t('jobPost.saveButton') : t('jobPost.publishButton')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
