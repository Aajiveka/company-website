import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BookOpen, Briefcase } from 'lucide-react';
import { cn } from '@/lib/cn';
import { LocationSelect } from '@/components/ui';
import {
  useUpdateHeadline,
  useUpdatePersonal,
  useUpdateProfessional,
  useUpsertAccomplishment,
} from '../../candidate.api';
import type { CvEditProfile, CvMasters } from '../../candidate.types';
import { Field, Input, Select } from '../components/primitives';
import { FieldGrid, StepShell, type StepProps } from './StepShell';
import { optionalText } from './validation';

const schema = z.object({
  fullName: z.string().min(2, 'Enter your full name'),
  mobile: z.string().min(10, 'Enter a 10-digit mobile number'),
  dob: optionalText,
  gender: z.enum(['M', 'F', '']).optional(),
  email: z.preprocess((v) => (v === '' ? undefined : v), z.string().email('Enter a valid email').optional()),
  headline: optionalText,
  linkedIn: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().url('Enter a valid URL, including https://').optional(),
  ),
});

type Values = z.infer<typeof schema>;

/** Step 1 — Personal Details (Figma 7:3777). */
export function PersonalStep({
  cv,
  masters,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { cv: CvEditProfile; masters: CvMasters | undefined }) {
  const personal = cv.personal;
  const existingLinkedIn = cv.accomplishments.find((a) => a.kind === 'ONLINE_PROFILE');

  const [cityId, setCityId] = useState<number | null>(personal?.cityId ?? null);
  const [fresher, setFresher] = useState(!cv.professional?.totalExp);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: personal?.fullName ?? '',
      mobile: personal?.mobile ?? '',
      dob: personal?.dob ? personal.dob.slice(0, 10) : '',
      gender: personal?.gender ?? '',
      email: personal?.email ?? '',
      headline: cv.headline ?? '',
      linkedIn: existingLinkedIn?.url ?? '',
    },
  });

  const savePersonal = useUpdatePersonal();
  const saveHeadline = useUpdateHeadline();
  const saveProfessional = useUpdateProfessional();
  const saveLink = useUpsertAccomplishment();

  const saving =
    savePersonal.isPending || saveHeadline.isPending || saveProfessional.isPending || saveLink.isPending;

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    try {
      await savePersonal.mutateAsync({
        fullName: values.fullName,
        email: values.email ?? personal?.email ?? '',
        mobile: values.mobile,
        dob: values.dob ?? '',
        gender: (values.gender || 'M') as 'M' | 'F',
        address: personal?.address ?? '',
        cityId,
      });

      if ((values.headline ?? '') !== (cv.headline ?? '')) {
        await saveHeadline.mutateAsync({ resumeHeadline: values.headline ?? '' });
      }

      // "I'm a fresher" is stored as zero total experience, which is also what gates
      // the Work Experience step — there is no separate flag in the schema.
      if (fresher && cv.professional?.totalExp) {
        await saveProfessional.mutateAsync({ ...cv.professional, totalExp: 0 });
      }

      if (values.linkedIn && values.linkedIn !== existingLinkedIn?.url) {
        await saveLink.mutateAsync({
          subscriberAccomplishmentId: existingLinkedIn?.subscriberAccomplishmentId,
          kind: 'ONLINE_PROFILE',
          title: 'LinkedIn',
          url: values.linkedIn,
        });
      }

      onNext();
    } catch {
      setError('Could not save. Please try again.');
    }
  });

  return (
    <StepShell
      number={1}
      title="Personal Details"
      blurb="Name, title & location"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={saving}
      error={error}
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <ExperienceChoice
          selected={!fresher}
          onSelect={() => setFresher(false)}
          icon={<Briefcase className="size-5" aria-hidden />}
          title="I'm experienced"
          blurb="I have work experience (excluding internships)"
        />
        <ExperienceChoice
          selected={fresher}
          onSelect={() => setFresher(true)}
          icon={<BookOpen className="size-5" aria-hidden />}
          title="I'm a fresher"
          blurb="I am a student / haven't worked after graduation"
        />
      </div>

      <FieldGrid>
        <Field label="Full Name" htmlFor="fullName" required error={form.formState.errors.fullName?.message}>
          <Input
            id="fullName"
            placeholder="e.g. Rahul Sharma"
            invalid={!!form.formState.errors.fullName}
            {...form.register('fullName')}
          />
        </Field>

        <Field label="Phone Number" htmlFor="mobile" required error={form.formState.errors.mobile?.message}>
          <Input
            id="mobile"
            inputMode="tel"
            placeholder="+91 98765 43210"
            invalid={!!form.formState.errors.mobile}
            {...form.register('mobile')}
          />
        </Field>

        <Field label="Date of Birth" htmlFor="dob" error={form.formState.errors.dob?.message}>
          <Input id="dob" type="date" {...form.register('dob')} />
        </Field>

        <Field label="Gender" htmlFor="gender">
          <Select id="gender" {...form.register('gender')}>
            <option value="">Select</option>
            <option value="M">Male</option>
            <option value="F">Female</option>
          </Select>
        </Field>

        <Field label="Email Address" htmlFor="email" error={form.formState.errors.email?.message}>
          <Input
            id="email"
            type="email"
            placeholder="rahul.sharma@email.com"
            invalid={!!form.formState.errors.email}
            {...form.register('email')}
          />
        </Field>

        <Field label="Professional Title" htmlFor="headline">
          <Input id="headline" placeholder="e.g. Senior Full-Stack Engineer" {...form.register('headline')} />
        </Field>

        <Field label="Current Location">
          <LocationSelect
            states={masters?.states}
            cities={masters?.cities}
            value={cityId}
            onChange={setCityId}
            placeholder="Select your city"
          />
        </Field>

        <Field label="LinkedIn URL" htmlFor="linkedIn" error={form.formState.errors.linkedIn?.message}>
          <Input
            id="linkedIn"
            placeholder="https://linkedin.com/in/yourname"
            invalid={!!form.formState.errors.linkedIn}
            {...form.register('linkedIn')}
          />
        </Field>
      </FieldGrid>
    </StepShell>
  );
}

function ExperienceChoice({
  selected,
  onSelect,
  icon,
  title,
  blurb,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition-colors',
        selected
          ? 'border-aj-blue bg-blue-50 dark:bg-blue-950'
          : 'border-aj-line hover:border-aj-blue hover:bg-aj-surface-soft dark:border-gray-700',
      )}
    >
      <span
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-lg',
          selected ? 'bg-aj-blue text-white' : 'bg-aj-canvas text-slate-500 dark:bg-gray-700',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-800 dark:text-gray-100">{title}</span>
        <span className="block text-xs leading-snug text-slate-500 dark:text-gray-400">{blurb}</span>
      </span>
    </button>
  );
}
