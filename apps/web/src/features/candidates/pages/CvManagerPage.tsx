import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, CardSkeleton, Input, Select, useToast } from '@/components/ui';
import {
  useCvEditProfile,
  useCvMasters,
  useDeleteCertificate,
  useDeleteEducation,
  useDeleteEmployment,
  useUpdatePersonal,
  useUpdateProfessional,
  useUpsertCertificate,
  useUpsertEducation,
  useUpsertEmployment,
} from '../candidate.api';
import type {
  CvCertificateEntry,
  CvEducationEntry,
  CvEmploymentEntry,
  CvMasterOption,
  CvMasters,
  CvPersonal,
  CvProfessional,
} from '../candidate.types';

const opts = (list?: CvMasterOption[]) => (list ?? []).map((o) => ({ label: o.label, value: o.id }));

function useErrorNotify() {
  const { notify } = useToast();
  return (fallback: string) => (e: unknown) =>
    notify(isAxiosError(e) ? e.response?.data?.message ?? fallback : fallback, 'error');
}

/* ------------------------------- Personal -------------------------------- */

const personalSchema = z.object({
  fullName: z.string().min(2, 'Enter your name'),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  mobile: z.string().min(10, 'Enter a valid mobile number'),
  dob: z.string().optional(),
  gender: z.enum(['M', 'F']),
  address: z.string().optional(),
  cityId: z.coerce.number().optional(),
});
type PersonalValues = z.infer<typeof personalSchema>;

function PersonalSection({ data, masters }: { data: CvPersonal; masters?: CvMasters }) {
  const { t } = useTranslation('dashboard');
  const update = useUpdatePersonal();
  const { notify } = useToast();
  const onError = useErrorNotify();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: { ...data, email: data.email ?? '', cityId: data.cityId ?? undefined },
  });

  // Cascading state → city
  const initState = data.cityId ? masters?.cities.find((c) => c.id === data.cityId)?.stateId ?? '' : '';
  const [selectedStateId, setSelectedStateId] = useState<number | ''>(initState);
  const filteredCities = useMemo(
    () => (selectedStateId ? (masters?.cities ?? []).filter((c) => c.stateId === selectedStateId) : []),
    [masters?.cities, selectedStateId],
  );

  const onSubmit = (values: PersonalValues) =>
    update.mutate(
      {
        fullName: values.fullName,
        email: values.email || '',
        mobile: values.mobile,
        dob: values.dob || '',
        gender: values.gender,
        address: values.address || '',
        cityId: values.cityId ?? null,
      },
      { onSuccess: () => notify(t('cv.personalSaved'), 'success'), onError: onError(t('cv.personalError')) },
    );

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy">{t('cv.personalDetails')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={t('cv.fullName')} error={errors.fullName?.message} {...register('fullName')} />
          <Input label={t('cv.email')} type="email" error={errors.email?.message} {...register('email')} />
          <Input label={t('cv.mobile')} error={errors.mobile?.message} {...register('mobile')} />
          <Input label={t('cv.dob')} type="date" error={errors.dob?.message} {...register('dob')} />
          <Select
            label={t('cv.gender')}
            options={[{ label: t('cv.male'), value: 'M' }, { label: t('cv.female'), value: 'F' }]}
            error={errors.gender?.message}
            {...register('gender')}
          />
          <Select
            label={t('cv.state')}
            placeholder={t('common:labels.select')}
            options={opts(masters?.states)}
            value={selectedStateId}
            onChange={(e) => {
              setSelectedStateId(Number(e.target.value) || '');
              setValue('cityId', 0);
            }}
          />
          <Select
            label={t('cv.districtCity')}
            placeholder={selectedStateId ? t('common:labels.select') : t('common:labels.selectStateFirst')}
            options={opts(filteredCities)}
            disabled={!selectedStateId}
            {...register('cityId')}
          />
        </div>
        <Input label={t('cv.address')} error={errors.address?.message} {...register('address')} />
        <div className="flex justify-end">
          <Button type="submit" isLoading={update.isPending}>{t('common:actions.save')}</Button>
        </div>
      </form>
    </Card>
  );
}

/* ----------------------------- Professional ------------------------------ */

const professionalSchema = z.object({
  subFunctionId: z.coerce.number().optional(),
  skillId: z.coerce.number().optional(),
  industryTypeId: z.coerce.number().optional(),
  totalExp: z.coerce.number().min(0).optional(),
  currentCtc: z.coerce.number().min(0).optional(),
  currentCityId: z.coerce.number().optional(),
  noticePeriod: z.coerce.number().min(0).optional(),
  flgReadyToRelocate: z.boolean().optional(),
});
type ProfessionalValues = z.infer<typeof professionalSchema>;

function ProfessionalSection({
  data,
  masters,
}: {
  data: CvProfessional;
  masters?: CvMasters;
}) {
  const { t } = useTranslation('dashboard');
  const update = useUpdateProfessional();
  const { notify } = useToast();
  const onError = useErrorNotify();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfessionalValues>({
    resolver: zodResolver(professionalSchema),
    defaultValues: {
      subFunctionId: data.subFunctionId ?? undefined,
      skillId: data.skillId ?? undefined,
      industryTypeId: data.industryTypeId ?? undefined,
      totalExp: data.totalExp,
      currentCtc: data.currentCtc ?? undefined,
      currentCityId: data.currentCityId ?? undefined,
      noticePeriod: data.noticePeriod ?? undefined,
      flgReadyToRelocate: data.flgReadyToRelocate,
    },
  });
  const [preferredCityIds, setPreferredCityIds] = useState<number[]>(data.preferredCityIds);
  const [tagsText, setTagsText] = useState(data.tagNames.join(', '));

  // Cascading state → city for current city
  const initCurrentState = data.currentCityId ? masters?.cities.find((c) => c.id === data.currentCityId)?.stateId ?? '' : '';
  const [currentStateId, setCurrentStateId] = useState<number | ''>(initCurrentState);
  const filteredCurrentCities = useMemo(
    () => (currentStateId ? (masters?.cities ?? []).filter((c) => c.stateId === currentStateId) : []),
    [masters?.cities, currentStateId],
  );

  // State filter for preferred locations
  const [prefStateFilter, setPrefStateFilter] = useState<number | ''>('');
  const filteredPrefCities = useMemo(
    () => (prefStateFilter ? (masters?.cities ?? []).filter((c) => c.stateId === prefStateFilter) : (masters?.cities ?? [])),
    [masters?.cities, prefStateFilter],
  );

  const toggleCity = (id: number) =>
    setPreferredCityIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const onSubmit = (values: ProfessionalValues) =>
    update.mutate(
      {
        subFunctionId: values.subFunctionId ?? null,
        skillId: values.skillId ?? null,
        industryTypeId: values.industryTypeId ?? null,
        totalExp: values.totalExp ?? 0,
        currentCtc: values.currentCtc ?? null,
        currentCityId: values.currentCityId ?? null,
        noticePeriod: values.noticePeriod ?? null,
        flgReadyToRelocate: !!values.flgReadyToRelocate,
        preferredCityIds,
        tagNames: tagsText.split(',').map((s) => s.trim()).filter(Boolean),
      },
      { onSuccess: () => notify(t('cv.professionalSaved'), 'success'), onError: onError(t('cv.professionalError')) },
    );

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy">{t('cv.professionalDetails')}</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select label={t('cv.designation')} placeholder={t('common:labels.select')} options={opts(masters?.subFunctions)} {...register('subFunctionId')} />
          <Select label={t('cv.industry')} placeholder={t('common:labels.select')} options={opts(masters?.industries)} {...register('industryTypeId')} />
          <Select label={t('cv.primarySkill')} placeholder={t('common:labels.select')} options={opts(masters?.skills)} {...register('skillId')} />
          <Input label={t('cv.totalExperience')} type="number" error={errors.totalExp?.message} {...register('totalExp')} />
          <Input label={t('cv.currentCtc')} type="number" error={errors.currentCtc?.message} {...register('currentCtc')} />
          <Select
            label={t('cv.currentState')}
            placeholder={t('common:labels.select')}
            options={opts(masters?.states)}
            value={currentStateId}
            onChange={(e) => {
              setCurrentStateId(Number(e.target.value) || '');
              setValue('currentCityId', 0);
            }}
          />
          <Select
            label={t('cv.currentDistrictCity')}
            placeholder={currentStateId ? t('common:labels.select') : t('common:labels.selectStateFirst')}
            options={opts(filteredCurrentCities)}
            disabled={!currentStateId}
            {...register('currentCityId')}
          />
          <Input label={t('cv.noticePeriod')} type="number" error={errors.noticePeriod?.message} {...register('noticePeriod')} />
        </div>
        <label className="flex items-center gap-2 text-sm text-navy">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30" {...register('flgReadyToRelocate')} />
          {t('cv.readyToRelocate')}
        </label>
        <div>
          <p className="mb-1.5 text-sm font-medium text-navy">{t('cv.preferredLocations')}</p>
          <Select
            placeholder={t('cv.allStates')}
            options={opts(masters?.states)}
            value={prefStateFilter}
            onChange={(e) => setPrefStateFilter(Number(e.target.value) || '')}
          />
          <div className="mt-2 flex flex-wrap gap-3">
            {filteredPrefCities.map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={preferredCityIds.includes(c.id)}
                  onChange={() => toggleCity(c.id)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>
        <Input label={t('cv.skillsCsv')} value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
        <div className="flex justify-end">
          <Button type="submit" isLoading={update.isPending}>{t('common:actions.save')}</Button>
        </div>
      </form>
    </Card>
  );
}

/* ------------------------------- Education -------------------------------- */

function EducationSection({ rows, masters }: { rows: CvEducationEntry[]; masters?: CvMasters }) {
  const { t } = useTranslation('dashboard');
  const [list, setList] = useState<CvEducationEntry[]>(rows);
  const upsert = useUpsertEducation();
  const del = useDeleteEducation();
  const { notify } = useToast();
  const onError = useErrorNotify();

  const update = (i: number, patch: Partial<CvEducationEntry>) =>
    setList((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = (row: CvEducationEntry, i: number) => {
    if (!row.courseTypeId || !row.degreeId) return;
    upsert.mutate(
      { subscriberEducationId: row.subscriberEducationId || undefined, courseTypeId: row.courseTypeId, degreeId: row.degreeId },
      {
        onSuccess: (result) => {
          update(i, { subscriberEducationId: result.subscriberEducationId });
          notify(t('cv.educationSaved'), 'success');
        },
        onError: onError(t('cv.saveError')),
      },
    );
  };
  const remove = (row: CvEducationEntry, i: number) => {
    if (!row.subscriberEducationId) {
      setList((prev) => prev.filter((_, idx) => idx !== i));
      return;
    }
    del.mutate(row.subscriberEducationId, {
      onSuccess: () => {
        setList((prev) => prev.filter((_, idx) => idx !== i));
        notify(t('cv.educationRemoved'), 'success');
      },
      onError: onError(t('cv.removeError')),
    });
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">{t('cv.educationSection')}</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setList((prev) => [...prev, { subscriberEducationId: 0, courseTypeId: null, degreeId: null }])}
        >
          <Plus className="h-4 w-4" /> {t('cv.add')}
        </Button>
      </div>
      <div className="space-y-3">
        {list.map((row, i) => (
          <div key={row.subscriberEducationId || `new-${i}`} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
            <Select
              placeholder={`${t('cv.courseType')}…`}
              options={opts(masters?.courseTypes)}
              value={row.courseTypeId ?? ''}
              onChange={(e) => update(i, { courseTypeId: Number(e.target.value) })}
            />
            <Select
              placeholder={`${t('cv.degree')}…`}
              options={opts(masters?.educationDegrees)}
              value={row.degreeId ?? ''}
              onChange={(e) => update(i, { degreeId: Number(e.target.value) })}
            />
            <Button type="button" size="sm" onClick={() => save(row, i)} isLoading={upsert.isPending}>
              {t('common:actions.save')}
            </Button>
            <button
              type="button"
              onClick={() => remove(row, i)}
              className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 text-red-700 hover:bg-red-100"
              aria-label={t('common:actions.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-gray-500">{t('cv.noEducation')}</p>}
      </div>
    </Card>
  );
}

/* ------------------------------- Employment -------------------------------- */

function EmploymentSection({ rows, masters }: { rows: CvEmploymentEntry[]; masters?: CvMasters }) {
  const { t } = useTranslation('dashboard');
  const [list, setList] = useState<CvEmploymentEntry[]>(rows);
  const upsert = useUpsertEmployment();
  const del = useDeleteEmployment();
  const { notify } = useToast();
  const onError = useErrorNotify();

  const blank: CvEmploymentEntry = {
    subscriberEmployerId: 0, employer: '', designationId: null, employeeTypeId: null,
    joiningDate: '', releavingDate: '', flgCurrent: false, salary: null, jobDescr: '', noticePeriodDays: null,
  };

  const update = (i: number, patch: Partial<CvEmploymentEntry>) =>
    setList((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const save = (row: CvEmploymentEntry, i: number) => {
    if (!row.employer.trim()) return;
    upsert.mutate(
      {
        subscriberEmployerId: row.subscriberEmployerId || undefined,
        employer: row.employer,
        designationId: row.designationId ?? undefined,
        employeeTypeId: row.employeeTypeId ?? undefined,
        joiningDate: row.joiningDate || undefined,
        releavingDate: row.flgCurrent ? undefined : row.releavingDate || undefined,
        flgCurrent: row.flgCurrent,
        salary: row.salary ?? undefined,
        noticePeriodDays: row.noticePeriodDays ?? undefined,
      },
      {
        onSuccess: (result) => {
          update(i, { subscriberEmployerId: result.subscriberEmployerId });
          notify(t('cv.employmentSaved'), 'success');
        },
        onError: onError(t('cv.saveError')),
      },
    );
  };
  const remove = (row: CvEmploymentEntry, i: number) => {
    if (!row.subscriberEmployerId) {
      setList((prev) => prev.filter((_, idx) => idx !== i));
      return;
    }
    del.mutate(row.subscriberEmployerId, {
      onSuccess: () => {
        setList((prev) => prev.filter((_, idx) => idx !== i));
        notify(t('cv.employmentRemoved'), 'success');
      },
      onError: onError(t('cv.removeError')),
    });
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">{t('cv.employmentHistory')}</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setList((prev) => [...prev, blank])}>
          <Plus className="h-4 w-4" /> {t('cv.add')}
        </Button>
      </div>
      <div className="space-y-4">
        {list.map((row, i) => (
          <div key={row.subscriberEmployerId || `new-${i}`} className="rounded-lg border border-gray-200 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder={t('cv.employer')} value={row.employer} onChange={(e) => update(i, { employer: e.target.value })} />
              <Select
                placeholder={`${t('common:labels.designation')}…`}
                options={opts(masters?.designations)}
                value={row.designationId ?? ''}
                onChange={(e) => update(i, { designationId: Number(e.target.value) })}
              />
              <Select
                placeholder={`${t('cv.employmentType')}…`}
                options={opts(masters?.employmentTypes)}
                value={row.employeeTypeId ?? ''}
                onChange={(e) => update(i, { employeeTypeId: Number(e.target.value) })}
              />
              <Input placeholder={t('cv.salary')} type="number" value={row.salary ?? ''} onChange={(e) => update(i, { salary: Number(e.target.value) })} />
              <Input type="date" value={row.joiningDate} onChange={(e) => update(i, { joiningDate: e.target.value })} />
              <Input
                type="date"
                disabled={row.flgCurrent}
                value={row.releavingDate}
                onChange={(e) => update(i, { releavingDate: e.target.value })}
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={row.flgCurrent}
                  onChange={(e) => update(i, { flgCurrent: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                {t('cv.currentlyWorking')}
              </label>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={() => save(row, i)} isLoading={upsert.isPending}>
                  {t('common:actions.save')}
                </Button>
                <button
                  type="button"
                  onClick={() => remove(row, i)}
                  className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 text-red-700 hover:bg-red-100"
                  aria-label={t('common:actions.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-gray-500">{t('cv.noEmployment')}</p>}
      </div>
    </Card>
  );
}

/* ------------------------------- Certificates -------------------------------- */

function CertificatesSection({ rows }: { rows: CvCertificateEntry[] }) {
  const { t } = useTranslation('dashboard');
  const [list, setList] = useState<CvCertificateEntry[]>(rows);
  const upsert = useUpsertCertificate();
  const del = useDeleteCertificate();
  const { notify } = useToast();
  const onError = useErrorNotify();

  const save = (row: CvCertificateEntry, i: number) => {
    if (!row.certificateName.trim()) return;
    upsert.mutate(
      { subscriberCertificateId: row.subscriberCertificateId || undefined, certificateName: row.certificateName },
      {
        onSuccess: (result) => {
          setList((prev) => prev.map((r, idx) => (idx === i ? { ...r, subscriberCertificateId: result.subscriberCertificateId } : r)));
          notify(t('cv.certificateSaved'), 'success');
        },
        onError: onError(t('cv.saveError')),
      },
    );
  };
  const remove = (row: CvCertificateEntry, i: number) => {
    if (!row.subscriberCertificateId) {
      setList((prev) => prev.filter((_, idx) => idx !== i));
      return;
    }
    del.mutate(row.subscriberCertificateId, {
      onSuccess: () => {
        setList((prev) => prev.filter((_, idx) => idx !== i));
        notify(t('cv.certificateRemoved'), 'success');
      },
      onError: onError(t('cv.removeError')),
    });
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy">{t('cv.certificates')}</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setList((prev) => [...prev, { subscriberCertificateId: 0, certificateName: '' }])}
        >
          <Plus className="h-4 w-4" /> {t('cv.add')}
        </Button>
      </div>
      <div className="space-y-3">
        {list.map((row, i) => (
          <div key={row.subscriberCertificateId || `new-${i}`} className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <Input
              placeholder={t('cv.certificateName')}
              value={row.certificateName}
              onChange={(e) => setList((prev) => prev.map((r, idx) => (idx === i ? { ...r, certificateName: e.target.value } : r)))}
            />
            <Button type="button" size="sm" onClick={() => save(row, i)} isLoading={upsert.isPending}>
              {t('common:actions.save')}
            </Button>
            <button
              type="button"
              onClick={() => remove(row, i)}
              className="inline-flex items-center justify-center rounded-lg bg-red-50 px-3 text-red-700 hover:bg-red-100"
              aria-label={t('common:actions.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        {list.length === 0 && <p className="text-sm text-gray-500">{t('cv.noCertificates')}</p>}
      </div>
    </Card>
  );
}

/* --------------------------------- Page ---------------------------------- */

/** Candidate — editable CV manager (candidate-dashboard-cv-manager.aspx). */
export default function CvManagerPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useCvEditProfile();
  const { data: masters } = useCvMasters();

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('cv.heading') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('cv.heading')}</h1>

      {isLoading || !data ? (
        <CardSkeleton />
      ) : (
        <div className="space-y-6">
          <PersonalSection
            data={
              data.personal ?? {
                fullName: '', email: '', mobile: '', dob: '', gender: 'M', address: '', cityId: null,
              }
            }
            masters={masters}
          />
          <ProfessionalSection
            data={
              data.professional ?? {
                subFunctionId: null, skillId: null, totalExp: 0, currentCtc: null, currentCityId: null,
                flgReadyToRelocate: false, noticePeriod: null, industryTypeId: null, preferredCityIds: [], tagNames: [],
              }
            }
            masters={masters}
          />
          <EducationSection rows={data.education} masters={masters} />
          <EmploymentSection rows={data.employment} masters={masters} />
          <CertificatesSection rows={data.certificates} />
        </div>
      )}
    </div>
  );
}
