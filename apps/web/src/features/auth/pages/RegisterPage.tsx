import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Button, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { useAuth } from '../auth.store';
import { authApi } from '../auth.api';
import { registerSchema, type RegisterValues } from '../auth.types';
import { ROLE_HOME } from '@/types/roles';
import { AuthShell } from '../components/AuthShell';

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
  const [pending, setPending] = useState<RegisterValues | null>(null);
  const [code, setCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema(tCommon)) });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res, values) => {
      setPending(values);
      if (res.devCode) {
        setCode(res.devCode);
        notify(`Dev OTP: ${res.devCode}`, 'info');
      } else {
        notify(t('register.otpSent'), 'success');
      }
    },
    onError: (err) => notify(apiMessage(err, t('register.registrationFailed')), 'error'),
  });

  const otpMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (session) => {
      setSession(session);
      notify(t('register.accountCreated'), 'success');
      navigate(ROLE_HOME[session.user.roleId], { replace: true });
    },
    onError: (err) => notify(apiMessage(err, t('register.invalidOtp')), 'error'),
  });

  return (
    <>
    <Seo title="Register" description="Create your free Aajiveka account. Sign up as a candidate to search jobs, build your resume, and get matched with top employers." path="/register" noIndex />
    <AuthShell
      title={pending ? t('register.otpTitle') : t('register.title')}
      subtitle={pending ? t('register.otpSubtitle', { mobile: pending.mobile }) : t('register.subtitle')}
      footer={
        <>
          {t('register.alreadyRegistered')}{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            {t('register.loginLink')}
          </Link>
        </>
      }
    >
      {!pending ? (
        <form key="register-form" onSubmit={handleSubmit((v) => registerMutation.mutate(v))} className="space-y-4" noValidate>
          <Input label={t('register.fullName')} error={errors.fullName?.message} {...register('fullName')} />
          <Input label={t('register.email')} type="email" error={errors.email?.message} {...register('email')} />
          <Input
            label={t('register.mobileNumber')}
            inputMode="numeric"
            placeholder={t('register.mobilePlaceholder')}
            error={errors.mobile?.message}
            {...register('mobile')}
          />
          <Input label={t('register.password')} type="password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
            {t('register.registerButton')}
          </Button>
        </form>
      ) : (
        <form
          key="otp-form"
          onSubmit={(e) => {
            e.preventDefault();
            otpMutation.mutate({
              mobile: pending.mobile,
              code,
              fullName: pending.fullName,
              email: pending.email,
              password: pending.password,
            });
          }}
          className="space-y-4"
        >
          <Input
            label={t('register.otpLabel')}
            inputMode="numeric"
            maxLength={6}
            placeholder={t('register.otpPlaceholder')}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" className="w-full" isLoading={otpMutation.isPending}>
            {t('register.verifyButton')}
          </Button>
          <button
            type="button"
            onClick={() => registerMutation.mutate(pending)}
            className="block w-full text-center text-sm text-primary hover:underline"
            disabled={registerMutation.isPending}
          >
            {t('register.resendCode')}
          </button>
        </form>
      )}
    </AuthShell>
    </>
  );
}
