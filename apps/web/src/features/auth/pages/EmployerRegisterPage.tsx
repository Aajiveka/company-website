import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, Check } from 'lucide-react';
import { Button, ErrorSummary, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { AuthShell } from '../components/AuthShell';
import { authApi } from '../auth.api';

interface EmployerFormValues {
  companyName: string;
  emailCompany: string;
  emailHR: string;
  contactNumberCompany: string;
  contactNumberHR: string;
  location: string;
  aboutCompany: string;
  industryType: string;
  website: string;
}

export default function EmployerRegisterPage() {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployerFormValues>({
    defaultValues: {
      companyName: '',
      emailCompany: '',
      emailHR: '',
      contactNumberCompany: '',
      contactNumberHR: '',
      location: '',
      aboutCompany: '',
      industryType: '',
      website: '',
    },
  });

  const mutation = useMutation({
    mutationFn: authApi.registerEmployer,
    onSuccess: () => setSubmitted(true),
    onError: (err) =>
      notify(
        isAxiosError(err)
          ? (err.response?.data as { message?: string })?.message ?? t('errors.somethingWrong')
          : t('errors.somethingWrong'),
        'error',
      ),
  });

  if (submitted) {
    return (
      <AuthShell title="Registration Submitted">
        <Seo title="Registration Submitted" />
        <div className="text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
            <Check className="size-8 text-emerald-600" />
          </div>
          <h1 className="mt-4 font-heading text-2xl font-bold text-navy">
            Registration Submitted
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            Your employer registration is under review. You will receive an email once approved.
          </p>
          <Link
            to="/login"
            className="mt-6 inline-block rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white"
          >
            Back to Login
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Register as Employer">
      <Seo title="Register as Employer" />
      <div className="text-center">
        <Building2 className="mx-auto size-10 text-primary" />
        <h1 className="mt-3 font-heading text-2xl font-bold text-navy">
          Register as Employer
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Fill in your company details. An admin will review and approve your account.
        </p>
      </div>

      <form
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        noValidate
        className="mt-6 space-y-4"
      >
        <ErrorSummary errors={errors} />

        <Input
          label="Company Name *"
          {...register('companyName', { required: 'Company name is required' })}
          error={errors.companyName?.message}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Company Email *"
            type="email"
            {...register('emailCompany', {
              required: 'Company email is required',
              pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
            })}
            error={errors.emailCompany?.message}
          />
          <Input
            label="HR Email"
            type="email"
            {...register('emailHR')}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Company Phone"
            {...register('contactNumberCompany')}
          />
          <Input
            label="HR Phone"
            {...register('contactNumberHR')}
          />
        </div>

        <Input
          label="Location"
          {...register('location')}
          placeholder="e.g. Mumbai, Maharashtra"
        />

        <Input
          label="Industry Type"
          {...register('industryType')}
          placeholder="e.g. IT, Manufacturing, Healthcare"
        />

        <Input
          label="Website"
          {...register('website')}
          placeholder="https://yourcompany.com"
        />

        <div>
          <label className="mb-1 block text-sm font-medium text-navy">About Company</label>
          <textarea
            {...register('aboutCompany')}
            rows={3}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-primary focus:ring-primary/30 dark:border-gray-600 dark:bg-gray-800"
            placeholder="Brief description of your company..."
          />
        </div>

        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Submit Registration
        </Button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
