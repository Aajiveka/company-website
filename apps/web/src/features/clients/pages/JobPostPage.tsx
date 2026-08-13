import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Breadcrumbs, Button, Card, ErrorSummary, FormSkeleton, Input, LocationSelect, Select, useToast } from '@/components/ui';
import RichTextEditor from '@/components/RichTextEditor';
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges';
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
    control,
    formState: { errors, isDirty },
  } = useForm<Values>({ resolver: zodResolver(schema(tCommon)) });

  useUnsavedChanges(isDirty);

  const job = isEdit ? jobs?.items.find((j) => String(j.jobId) === id) : undefined;

  useEffect(() => {
    if (job && masters) {
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
      {!masters ? (
        <FormSkeleton fields={8} />
      ) : (
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <ErrorSummary errors={errors} heading={tCommon('validation.errorSummary', 'Please fix the following errors:')} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('jobPost.designation')}
              placeholder={t('common:labels.select')}
              options={opts(masters?.designations)}
              error={errors.designationId?.message}
              {...register('designationId')}
            />
            <Controller
              control={control}
              name="cityId"
              render={({ field }) => (
                <LocationSelect
                  label={t('jobPost.districtCity')}
                  placeholder={tCommon('labels.selectLocation')}
                  states={masters?.states}
                  cities={masters?.cities}
                  value={field.value}
                  // 0, not null — the schema's min(1) is what reports "select a location".
                  onChange={(cityId) => field.onChange(cityId ?? 0)}
                  error={errors.cityId?.message}
                  required
                />
              )}
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
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <RichTextEditor
                  value={field.value ?? ''}
                  onChange={field.onChange}
                  placeholder={t('jobPost.descriptionPlaceholder', 'Describe the role, responsibilities, requirements...')}
                  minHeight="160px"
                />
              )}
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
      )}
    </div>
  );
}
