import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Button, ErrorSummary, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { useAuth } from '../auth.store';
import { authApi } from '../auth.api';
import {
  registerSchema,
  type AuthSession,
  type RegisterValues,
  type RegistrationChallenge,
} from '../auth.types';
import { Role, ROLE_HOME } from '@/types/roles';
import { AuthShell } from '../components/AuthShell';
import SocialLoginButtons from '../components/SocialLoginButtons';
import OtpVerification from '../components/OtpVerification';

const apiMessage = (err: unknown, fallback: string) =>
  isAxiosError(err) ? ((err.response?.data as { message?: string })?.message ?? fallback) : fallback;

/**
 * Candidate registration — full form (Full Name, Email, Mobile, Password) with OTP verification.
 */
export default function RegisterPage() {
  const { notify } = useToast();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  // Set once /auth/register accepts the form — it is the handle for the pending signup, which
  // the server holds. The form values themselves are deliberately dropped: the password does
  // not linger in component state while the user reads their email.
  const [challenge, setChallenge] = useState<RegistrationChallenge | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema(tCommon)) });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      setChallenge(res);
      notify(t('register.otpSent'), 'success');
      if (res.devCode) notify(`Dev OTP: ${res.devCode}`, 'info');
    },
    onError: (err) => notify(apiMessage(err, t('register.registrationFailed')), 'error'),
  });

  const onVerified = (session: AuthSession) => {
    setSession(session);
    notify(t('register.accountCreated'), 'success');
    // New candidates go to onboarding wizard; other roles go to their default dashboard
    const home =
      session.user.roleId === Role.Subscriber ? '/candidate/onboarding' : ROLE_HOME[session.user.roleId];
    navigate(home, { replace: true });
  };

  return (
    <>
    <Seo title="Register" description="Create your free Aajiveka account. Sign up as a candidate to search jobs, build your resume, and get matched with top employers." path="/register" noIndex />
    <AuthShell
      title={challenge ? t('otp.heading') : t('register.title')}
      subtitle={challenge ? undefined : t('register.subtitle')}
      footer={
        <>
          {t('register.alreadyRegistered')}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('register.loginLink')}
          </Link>
        </>
      }
    >
      {!challenge && <SocialLoginButtons mode="register" />}
      {!challenge ? (
        <form key="register-form" onSubmit={handleSubmit((v) => registerMutation.mutate(v))} className="space-y-4" noValidate>
          <ErrorSummary errors={errors} heading={tCommon('validation.errorSummary', 'Please fix the following errors:')} />
          <Input
            label={t('register.fullName')}
            autoComplete="name"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <Input
            label={t('register.email')}
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label={t('register.mobileNumber')}
            inputMode="numeric"
            autoComplete="tel-national"
            placeholder={t('register.mobilePlaceholder')}
            error={errors.mobile?.message}
            {...register('mobile')}
          />
          {/* new-password, not password: stops a manager autofilling the saved credential for
              this site into what is meant to be a brand-new one, and prompts it to offer to
              generate and store one instead. */}
          <Input
            label={t('register.password')}
            type="password"
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
            {t('register.registerButton')}
          </Button>
        </form>
      ) : (
        <OtpVerification
          email={challenge.email}
          registrationToken={challenge.registrationToken}
          resendAfterSeconds={challenge.resendAfterSeconds}
          expiresInSeconds={challenge.expiresInSeconds}
          initialCode={challenge.devCode}
          onVerified={onVerified}
          // Discards the handle, so going back means filling the form in again. The password
          // was never kept client-side, so there is nothing to restore it from.
          onBack={() => setChallenge(null)}
        />
      )}
    </AuthShell>
    </>
  );
}
