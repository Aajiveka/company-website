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
import { isFresherProfile } from '../../fresher';
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

/** 0–50 years and 0–11 months, the ranges every job portal offers for total experience. */
const YEARS = Array.from({ length: 51 }, (_, i) => i);
const MONTHS = Array.from({ length: 12 }, (_, i) => i);

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
  onFresherChange,
}: StepProps & {
  cv: CvEditProfile;
  masters: CvMasters | undefined;
  /** Lets the wizard add or drop the Work Experience step the moment the choice is made. */
  onFresherChange: (fresher: boolean) => void;
}) {
  const personal = cv.personal;
  const existingLinkedIn = cv.accomplishments.find((a) => a.kind === 'ONLINE_PROFILE');

  const [cityId, setCityId] = useState<number | null>(personal?.cityId ?? null);
  const [fresher, setFresher] = useState(() => isFresherProfile(cv));
  const [expYears, setExpYears] = useState(String(cv.professional?.totalExp ?? 0));
  const [expMonths, setExpMonths] = useState(String(cv.professional?.totalExpMonths ?? 0));
  // Function and primary skill are what the "Professional details" slice of profile
  // completion scores on — not the free-typed key skills, which is a different field.
  const [subFunctionId, setSubFunctionId] = useState(String(cv.professional?.subFunctionId ?? ''));
  const [skillId, setSkillId] = useState(String(cv.professional?.skillId ?? ''));
  const [error, setError] = useState<string | null>(null);

  const chooseFresher = (value: boolean) => {
    setFresher(value);
    setError(null);
    onFresherChange(value);
  };

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

    // "I'm a fresher" is stored as zero total experience, which is also what gates the
    // Work Experience step — there is no separate flag in the schema. That leaves
    // "experienced, 0 years, 0 months" indistinguishable from a fresher on the next load,
    // which would silently take the step away again, so it is not an answer we can accept.
    const totalExp = fresher ? 0 : Number(expYears) || 0;
    const totalExpMonths = fresher ? 0 : Number(expMonths) || 0;
    if (!fresher && !totalExp && !totalExpMonths) {
      setError('Add your total experience, or choose "I\'m a fresher".');
      return;
    }

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

      const nextSubFunctionId = subFunctionId ? Number(subFunctionId) : null;
      const nextSkillId = skillId ? Number(skillId) : null;
      if (
        totalExp !== (cv.professional?.totalExp ?? 0) ||
        totalExpMonths !== (cv.professional?.totalExpMonths ?? 0) ||
        nextSubFunctionId !== (cv.professional?.subFunctionId ?? null) ||
        nextSkillId !== (cv.professional?.skillId ?? null)
      ) {
        await saveProfessional.mutateAsync({
          ...cv.professional,
          totalExp,
          totalExpMonths,
          subFunctionId: nextSubFunctionId,
          skillId: nextSkillId,
        });
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
      number={stepIndex + 1}
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
          onSelect={() => chooseFresher(false)}
          icon={<Briefcase className="size-5" aria-hidden />}
          title="I'm experienced"
          blurb="I have work experience (excluding internships)"
        />
        <ExperienceChoice
          selected={fresher}
          onSelect={() => chooseFresher(true)}
          icon={<BookOpen className="size-5" aria-hidden />}
          title="I'm a fresher"
          blurb="I am a student / haven't worked after graduation"
        />
      </div>

      {/* Only the experienced path asks for a duration; a fresher has none to give. */}
      {!fresher && (
        <div className="mb-5 grid gap-4 sm:grid-cols-2 lg:max-w-md">
          <Field label="Total Experience — Years" htmlFor="expYears">
            <Select id="expYears" value={expYears} onChange={(e) => setExpYears(e.target.value)}>
              {YEARS.map((y) => (
                <option key={y} value={y}>
                  {y === 1 ? '1 Year' : `${y} Years`}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Months" htmlFor="expMonths">
            <Select id="expMonths" value={expMonths} onChange={(e) => setExpMonths(e.target.value)}>
              {MONTHS.map((m) => (
                <option key={m} value={m}>
                  {m === 1 ? '1 Month' : `${m} Months`}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )}

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

        <Field label="Function / Department" htmlFor="subFunction">
          <Select id="subFunction" value={subFunctionId} onChange={(e) => setSubFunctionId(e.target.value)}>
            <option value="">Select</option>
            {masters?.subFunctions?.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Primary Skill" htmlFor="primarySkill">
          <Select id="primarySkill" value={skillId} onChange={(e) => setSkillId(e.target.value)}>
            <option value="">Select</option>
            {masters?.skills?.map((sk) => (
              <option key={sk.id} value={sk.id}>
                {sk.label}
              </option>
            ))}
          </Select>
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
