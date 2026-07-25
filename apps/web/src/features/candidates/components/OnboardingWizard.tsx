import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, GraduationCap, Briefcase, User } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Button, Card, Input, Select, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import {
  useCvMasters,
  useUpdatePersonal,
  useUpdateProfessional,
  useUpsertEducation,
} from '../candidate.api';

const STEPS = ['personal', 'professional', 'education', 'complete'] as const;
const personalSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  mobile: z.string().min(10),
  dob: z.string().optional(),
  gender: z.enum(['M', 'F']),
  address: z.string().optional(),
  cityId: z.coerce.number().optional(),
});

const professionalSchema = z.object({
  subFunctionId: z.coerce.number().optional(),
  skillId: z.coerce.number().optional(),
  totalExp: z.coerce.number().min(0),
  currentCtc: z.coerce.number().optional(),
  industryTypeId: z.coerce.number().optional(),
  tagNames: z.string().optional(),
});

const educationSchema = z.object({
  courseTypeId: z.coerce.number().min(1),
  degreeId: z.coerce.number().min(1),
});

function StepIndicator({ steps, current }: { steps: readonly string[]; current: number }) {
  const { t } = useTranslation('dashboard');
  const icons = [User, Briefcase, GraduationCap, Check];
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {steps.map((step, i) => {
        const Icon = icons[i];
        const done = i < current;
        const active = i === current;
        return (
          <div key={step} className="flex items-center gap-2">
            {i > 0 && <div className={cn('h-0.5 w-6 sm:w-10', done ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700')} />}
            <div className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition',
              done ? 'bg-primary text-white' : active ? 'bg-primary/10 text-primary ring-2 ring-primary' : 'bg-gray-100 text-gray-400 dark:bg-gray-700',
            )}>
              {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </div>
            <span className={cn('hidden text-xs font-medium sm:block', active ? 'text-primary' : 'text-gray-400')}>
              {t(`onboarding.${step}`)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Multi-step onboarding wizard for new candidates. */
export function OnboardingWizard({ initialName, initialEmail, initialMobile, onComplete }: {
  initialName?: string;
  initialEmail?: string;
  initialMobile?: string;
  /** Called when the user finishes the last step. */
  onComplete?: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { notify } = useToast();
  const { data: masters } = useCvMasters();
  const updatePersonal = useUpdatePersonal();
  const updateProfessional = useUpdateProfessional();
  const upsertEducation = useUpsertEducation();

  const [stepIdx, setStepIdx] = useState(0);
  const step = STEPS[stepIdx];

  const opts = (list?: { id: number; label: string }[]) => (list ?? []).map((o) => ({ label: o.label, value: o.id }));

  // Personal form
  const personalForm = useForm({ resolver: zodResolver(personalSchema), defaultValues: {
    fullName: initialName ?? '', email: initialEmail ?? '', mobile: initialMobile ?? '',
    dob: '', gender: 'M' as const, address: '', cityId: undefined,
  }});

  // Professional form
  const professionalForm = useForm({ resolver: zodResolver(professionalSchema), defaultValues: {
    subFunctionId: undefined, skillId: undefined, totalExp: 0, currentCtc: undefined,
    industryTypeId: undefined, tagNames: '',
  }});

  // Education form
  const educationForm = useForm({ resolver: zodResolver(educationSchema), defaultValues: {
    courseTypeId: undefined as unknown as number, degreeId: undefined as unknown as number,
  }});

  const errMsg = (e: unknown, fallback: string) =>
    isAxiosError(e) ? e.response?.data?.message ?? fallback : fallback;

  const onPersonalSubmit = personalForm.handleSubmit((values) => {
    updatePersonal.mutate(values as any, {
      onSuccess: () => setStepIdx(1),
      onError: (e) => notify(errMsg(e, t('cv.personalError')), 'error'),
    });
  });

  const onProfessionalSubmit = professionalForm.handleSubmit((values) => {
    const payload = {
      ...values,
      currentCityId: null,
      flgReadyToRelocate: false,
      noticePeriod: null,
      preferredCityIds: [],
      tagNames: values.tagNames?.split(',').map(s => s.trim()).filter(Boolean) ?? [],
    };
    updateProfessional.mutate(payload as any, {
      onSuccess: () => setStepIdx(2),
      onError: (e) => notify(errMsg(e, t('cv.professionalError')), 'error'),
    });
  });

  const onEducationSubmit = educationForm.handleSubmit((values) => {
    upsertEducation.mutate(values, {
      onSuccess: () => setStepIdx(3),
      onError: (e) => notify(errMsg(e, t('cv.saveError')), 'error'),
    });
  });

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6 text-center">
        <h1 className="font-heading text-2xl font-bold text-navy">{t('onboarding.welcome')}</h1>
        <p className="mt-1 text-sm text-gray-500">{t('onboarding.subtitle')}</p>
      </div>

      <StepIndicator steps={STEPS} current={stepIdx} />

      {step === 'personal' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-navy">{t('cv.personalDetails')}</h2>
          <form onSubmit={onPersonalSubmit} className="space-y-4" noValidate>
            <Input label={t('cv.fullName')} error={personalForm.formState.errors.fullName?.message} {...personalForm.register('fullName')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('cv.email')} type="email" {...personalForm.register('email')} />
              <Input label={t('cv.mobile')} {...personalForm.register('mobile')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('cv.dob')} type="date" {...personalForm.register('dob')} />
              <Select label={t('cv.gender')} options={[{ label: t('cv.male'), value: 'M' }, { label: t('cv.female'), value: 'F' }]} {...personalForm.register('gender')} />
            </div>
            <Select label={t('cv.districtCity')} placeholder={t('common:labels.select')} options={opts(masters?.cities)} {...personalForm.register('cityId')} />
            <Input label={t('cv.address')} {...personalForm.register('address')} />
            <div className="flex justify-end">
              <Button type="submit" isLoading={updatePersonal.isPending}>
                {t('common:actions.next')} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 'professional' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-navy">{t('cv.professionalDetails')}</h2>
          <form onSubmit={onProfessionalSubmit} className="space-y-4" noValidate>
            <div className="grid gap-4 sm:grid-cols-2">
              <Select label={t('cv.designation')} placeholder={t('common:labels.select')} options={opts(masters?.subFunctions)} {...professionalForm.register('subFunctionId')} />
              <Select label={t('cv.primarySkill')} placeholder={t('common:labels.select')} options={opts(masters?.skills)} {...professionalForm.register('skillId')} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label={t('cv.totalExperience')} type="number" min={0} {...professionalForm.register('totalExp')} />
              <Input label={t('cv.currentCtc')} type="number" min={0} {...professionalForm.register('currentCtc')} />
            </div>
            <Select label={t('cv.industry')} placeholder={t('common:labels.select')} options={opts(masters?.industries)} {...professionalForm.register('industryTypeId')} />
            <Input label={t('cv.skillsCsv')} placeholder="React, Node.js, SQL" {...professionalForm.register('tagNames')} />
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStepIdx(0)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> {t('common:actions.back')}
              </Button>
              <Button type="submit" isLoading={updateProfessional.isPending}>
                {t('common:actions.next')} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 'education' && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-navy">{t('cv.educationSection')}</h2>
          <form onSubmit={onEducationSubmit} className="space-y-4" noValidate>
            <Select
              label={t('cv.courseType')}
              placeholder={t('common:labels.select')}
              options={opts(masters?.courseTypes)}
              error={educationForm.formState.errors.courseTypeId?.message}
              {...educationForm.register('courseTypeId')}
            />
            <Select
              label={t('cv.degree')}
              placeholder={t('common:labels.select')}
              options={opts(masters?.educationDegrees)}
              error={educationForm.formState.errors.degreeId?.message}
              {...educationForm.register('degreeId')}
            />
            <div className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStepIdx(1)}>
                <ChevronLeft className="mr-1 h-4 w-4" /> {t('common:actions.back')}
              </Button>
              <Button type="submit" isLoading={upsertEducation.isPending}>
                {t('common:actions.next')} <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </form>
        </Card>
      )}

      {step === 'complete' && (
        <Card className="text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-navy">{t('onboarding.allDone')}</h2>
          <p className="mt-2 text-sm text-gray-500">{t('onboarding.allDoneHint')}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button onClick={() => (onComplete ? onComplete() : navigate('/candidate/dashboard'))}>
              {t('onboarding.editProfile')}
            </Button>
            <Button variant="outline" onClick={() => (onComplete ? onComplete() : navigate('/jobs'))}>
              {t('onboarding.browseJobs')}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
