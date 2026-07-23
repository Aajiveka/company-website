import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Button, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { useAuth } from '../auth.store';
import { authApi } from '../auth.api';
import { loginSchema, type LoginValues } from '../auth.types';
import { ROLE_HOME } from '@/types/roles';
import { AuthShell } from '../components/AuthShell';

export default function LoginPage() {
  const { setSession } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const from = (location.state as { from?: Location } | null)?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema(tCommon)) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      setSession(session);
      notify(t('login.welcomeBack'), 'success');
      navigate(from ?? ROLE_HOME[session.user.roleId], { replace: true });
    },
    onError: (err) => {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ?? t('login.invalidCredentials')
        : t('login.somethingWrong');
      notify(msg, 'error');
    },
  });

  return (
    <>
    <Seo title="Login" description="Log in to your Aajiveka account to manage jobs, applications, and your career profile." path="/login" noIndex />
    <AuthShell
      title={t('login.title')}
      subtitle={t('login.subtitle')}
      footer={
        <>
          {t('login.noAccount')}{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            {t('login.registerLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
        <Input
          label={t('login.usernameOrEmail')}
          autoComplete="username"
          error={errors.userName?.message}
          {...register('userName')}
        />
        <Input
          label={t('login.password')}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            {t('login.forgotPassword')}
          </Link>
        </div>
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          {t('login.loginButton')}
        </Button>
      </form>
    </AuthShell>
    </>
  );
}
