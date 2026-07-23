import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/lib/axios';
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
  const from = (location.state as { from?: Location } | null)?.from?.pathname;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (session) => {
      setSession(session);
      notify('Welcome back!', 'success');
      // Mirror fnLogin_pass: land on the role home (or the originally requested page).
      navigate(from ?? ROLE_HOME[session.user.roleId], { replace: true });
    },
    onError: (err) => {
      notify(getErrorMessage(err, 'Invalid username or password'), 'error');
    },
  });

  return (
    <>
    <Seo title="Login" description="Log in to your Aajiveka account to manage jobs, applications, and your career profile." path="/login" noIndex />
    <AuthShell
      title="Login to your account"
      subtitle="Candidates, Employers & Admins"
      footer={
        <>
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Register now
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
        <Input
          label="Username or Email"
          required
          autoComplete="username"
          error={errors.userName?.message}
          {...register('userName')}
        />
        <Input
          label="Password"
          type="password"
          required
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <Link to="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Login
        </Button>
      </form>
    </AuthShell>
    </>
  );
}
