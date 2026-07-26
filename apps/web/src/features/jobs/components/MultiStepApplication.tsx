import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Button, Input, Modal, useToast } from '@/components/ui';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';

/* ---------- types / schema ---------- */

interface CandidateProfile {
  name: string;
  email: string;
  phone: string;
}

const personalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(5, 'Phone number is required'),
});

const resumeSchema = z.object({
  coverLetter: z.string().optional(),
});

type PersonalValues = z.infer<typeof personalSchema>;
type ResumeValues = z.infer<typeof resumeSchema>;

interface Props {
  jobId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

/* ---------- hooks ---------- */

function useProfile() {
  return useQuery<CandidateProfile>({
    queryKey: ['candidates', 'me', 'profile'],
    queryFn: () => api.get<CandidateProfile>('/candidates/me/profile').then((r) => r.data),
    retry: false,
  });
}

function useApplyToJob(jobId: string) {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api
        .post(`/jobs/${jobId}/apply`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),
  });
}

/* ---------- step indicator ---------- */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
            i + 1 === current
              ? 'bg-primary text-white'
              : i + 1 < current
                ? 'bg-primary/20 text-primary dark:bg-primary/30'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
          )}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

/* ---------- component ---------- */

export default function MultiStepApplication({ jobId, onSuccess, onCancel }: Props) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const { data: profile } = useProfile();
  const apply = useApplyToJob(jobId);

  const [step, setStep] = useState(1);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeError, setResumeError] = useState<string | undefined>();
  const [confirmed, setConfirmed] = useState(false);

  const profilePrefilled = !!(profile?.name && profile?.email && profile?.phone);

  /* step 1 form */
  const personal = useForm<PersonalValues>({
    resolver: zodResolver(personalSchema),
    defaultValues: { name: '', email: '', phone: '' },
  });

  useEffect(() => {
    if (profile) {
      personal.reset({
        name: profile.name ?? '',
        email: profile.email ?? '',
        phone: profile.phone ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  /* step 2 form */
  const resume = useForm<ResumeValues>({
    resolver: zodResolver(resumeSchema),
    defaultValues: { coverLetter: '' },
  });

  /* navigation */
  const goNext = useCallback(async () => {
    if (step === 1) {
      const ok = await personal.trigger();
      if (!ok) return;
      setStep(2);
    } else if (step === 2) {
      if (!resumeFile) {
        setResumeError(t('multiStepApply.resumeRequired'));
        return;
      }
      setResumeError(undefined);
      await resume.trigger();
      setStep(3);
    }
  }, [step, personal, resume, resumeFile, t]);

  const goBack = useCallback(() => {
    if (step > 1) setStep((s) => s - 1);
  }, [step]);

  /* file handling */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setResumeFile(file);
    if (file) setResumeError(undefined);
  };

  /* submit */
  const handleSubmit = () => {
    if (!confirmed || !resumeFile) return;

    const fd = new FormData();
    fd.append('name', personal.getValues('name'));
    fd.append('email', personal.getValues('email'));
    fd.append('phone', personal.getValues('phone'));
    fd.append('resume', resumeFile);
    const coverLetter = resume.getValues('coverLetter');
    if (coverLetter) fd.append('coverLetter', coverLetter);

    apply.mutate(fd, {
      onSuccess: () => {
        notify(t('multiStepApply.success'), 'success');
        onSuccess();
      },
      onError: (e) =>
        notify(
          isAxiosError(e)
            ? (e.response?.data?.message ?? t('multiStepApply.error'))
            : t('multiStepApply.error'),
          'error',
        ),
    });
  };

  /* step content */
  const personalValues = personal.watch();
  const coverLetterValue = resume.watch('coverLetter');

  return (
    <Modal open onClose={onCancel} title={t('multiStepApply.title')} className="max-w-lg">
      <StepIndicator current={step} total={3} />

      {/* Step 1 — Personal Info */}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goNext();
          }}
          className="space-y-4"
          noValidate
        >
          <Input
            label={t('multiStepApply.name')}
            error={personal.formState.errors.name?.message}
            readOnly={profilePrefilled}
            required
            {...personal.register('name')}
          />
          <Input
            label={t('multiStepApply.email')}
            type="email"
            error={personal.formState.errors.email?.message}
            readOnly={profilePrefilled}
            required
            {...personal.register('email')}
          />
          <Input
            label={t('multiStepApply.phone')}
            type="tel"
            error={personal.formState.errors.phone?.message}
            readOnly={profilePrefilled}
            required
            {...personal.register('phone')}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              {t('multiStepApply.cancel')}
            </Button>
            <Button type="submit" size="sm">
              {t('multiStepApply.next')}
            </Button>
          </div>
        </form>
      )}

      {/* Step 2 — Resume & Cover Letter */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
              {t('multiStepApply.resume')}
              <span className="ml-0.5 text-danger" aria-hidden>*</span>
            </label>
            <label
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition',
                resumeError
                  ? 'border-danger bg-danger/5'
                  : 'border-gray-300 hover:border-primary dark:border-gray-600 dark:hover:border-primary',
              )}
            >
              <Upload className="mb-2 h-8 w-8 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {resumeFile ? resumeFile.name : t('multiStepApply.uploadResume')}
              </span>
              <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">.pdf, .doc, .docx</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {resumeError && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {resumeError}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
              {t('multiStepApply.coverLetter')}
            </label>
            <textarea
              className={cn(
                'w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm outline-none transition',
                'placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30',
                'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
              )}
              rows={4}
              placeholder={t('multiStepApply.coverLetterPlaceholder')}
              {...resume.register('coverLetter')}
            />
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              {t('multiStepApply.back')}
            </Button>
            <Button type="button" size="sm" onClick={goNext}>
              {t('multiStepApply.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — Review & Submit */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg bg-gray-50 p-4 text-sm dark:bg-gray-700/50">
            <h4 className="mb-2 font-semibold text-navy dark:text-gray-100">
              {t('multiStepApply.personalInfo')}
            </h4>
            <dl className="space-y-1 text-gray-700 dark:text-gray-300">
              <div className="flex gap-2">
                <dt className="font-medium">{t('multiStepApply.name')}:</dt>
                <dd>{personalValues.name}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">{t('multiStepApply.email')}:</dt>
                <dd>{personalValues.email}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="font-medium">{t('multiStepApply.phone')}:</dt>
                <dd>{personalValues.phone}</dd>
              </div>
            </dl>

            <h4 className="mb-2 mt-4 font-semibold text-navy dark:text-gray-100">
              {t('multiStepApply.documents')}
            </h4>
            <dl className="space-y-1 text-gray-700 dark:text-gray-300">
              <div className="flex gap-2">
                <dt className="font-medium">{t('multiStepApply.resume')}:</dt>
                <dd>{resumeFile?.name}</dd>
              </div>
              {coverLetterValue && (
                <div>
                  <dt className="font-medium">{t('multiStepApply.coverLetter')}:</dt>
                  <dd className="mt-1 whitespace-pre-line">{coverLetterValue}</dd>
                </div>
              )}
            </dl>
          </div>

          <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 dark:border-gray-600"
            />
            {t('multiStepApply.confirmAccuracy')}
          </label>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              {t('multiStepApply.back')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!confirmed}
              isLoading={apply.isPending}
              onClick={handleSubmit}
            >
              {t('multiStepApply.submit')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
