import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Input, PasswordInput, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { useAuth } from '../auth.store';
import { authApi } from '../auth.api';
import { loginSchema, type LoginValues } from '../auth.types';
import { ROLE_HOME } from '@/types/roles';
import { AuthShell } from '../components/AuthShell';
import SocialLoginButtons from '../components/SocialLoginButtons';
import {
  LOGIN_PORTAL_PARAM,
  isLoginPortal,
  portalAllowsRole,
  type LoginPortal,
} from '../loginPortals';

export default function LoginPage() {
  const { setSession } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const [searchParams] = useSearchParams();
  const from = (location.state as { from?: Location } | null)?.from?.pathname;

  // `/login?as=admin|employer|candidate` — set by the navbar's login dropdown. Without it
  // the page keeps its original behaviour: any role may sign in here.
  const portalParam = searchParams.get(LOGIN_PORTAL_PARAM);
  const portal: LoginPortal | null = isLoginPortal(portalParam) ? portalParam : null;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema(tCommon)) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      // Wrong door: the credentials are valid but not for this portal. Drop the session
      // rather than redirecting, so "Admin Login" only ever signs in an admin. The tokens
      // the API just issued are revoked so nothing usable is left behind.
      if (portal && !portalAllowsRole(portal, session.user.roleId)) {
        void authApi.logout(session.refreshToken).catch(() => {});
        notify(t(`login.portal.${portal}.wrongPortal`), 'error');
        return;
      }
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
      title={portal ? t(`login.portal.${portal}.title`) : t('login.title')}
      subtitle={portal ? t(`login.portal.${portal}.subtitle`) : t('login.subtitle')}
      footer={
        // Admin accounts are provisioned, never self-registered, so that door gets no
        // "register now" link.
        portal === 'admin' ? null : (
          <>
            {t('login.noAccount')}{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              {t('login.registerLink')}
            </Link>
          </>
        )
      }
    >
      {/* OAuth returns its own session and so never passes through the portal check
          below — keep it off the admin door entirely. */}
      {portal !== 'admin' && <SocialLoginButtons mode="login" />}
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
        <Input
          label={t('login.usernameOrEmail')}
          autoComplete="username"
          placeholder="anuj@aajiveka.com"
          error={errors.userName?.message}
          {...register('userName')}
        />
        <PasswordInput
          label={t('login.password')}
          autoComplete="current-password"
          placeholder={t('login.passwordPlaceholder', 'Enter your password')}
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm font-medium text-aj-blue hover:underline">
            {t('login.forgotPassword')}
          </Link>
        </div>
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-[10px] bg-[#1D60E5] py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgb(29_96_229/0.33)] transition-colors hover:bg-aj-blue-hover disabled:opacity-60"
        >
          {mutation.isPending ? `${t('login.loginButton')}…` : t('login.loginButton')}
        </button>
      </form>
    </AuthShell>
    </>
  );
}
