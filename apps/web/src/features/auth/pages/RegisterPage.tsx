import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getErrorMessage } from '@/lib/axios';
import { Button, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { useAuth } from '../auth.store';
import { authApi } from '../auth.api';
import { registerSchema, type RegisterValues } from '../auth.types';
import { ROLE_HOME } from '@/types/roles';
import { AuthShell } from '../components/AuthShell';


/**
 * Candidate registration — full form (Full Name, Email, Mobile, Password) with OTP verification.
 * The backend register only takes the mobile (it texts an OTP); the rest of the form is held in
 * state and sent to verify-otp, which persists it when the account is created.
 */
export default function RegisterPage() {
  const { notify } = useToast();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  // Once set, the account details are captured and we're on the OTP step.
  const [pending, setPending] = useState<RegisterValues | null>(null);
  const [code, setCode] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res, values) => {
      setPending(values);
      // In dev (no SMS gateway) the API returns the code — pre-fill it and show it so the
      // user can just click Verify. In production `devCode` is absent and this is a no-op.
      if (res.devCode) {
        setCode(res.devCode);
        notify(`Dev OTP: ${res.devCode}`, 'info');
      } else {
        notify('OTP sent to your mobile number.', 'success');
      }
    },
    onError: (err) => notify(getErrorMessage(err, 'Registration failed'), 'error'),
  });

  const otpMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (session) => {
      setSession(session);
      notify('Account created!', 'success');
      navigate(ROLE_HOME[session.user.roleId], { replace: true });
    },
    onError: (err) => notify(getErrorMessage(err, 'Invalid OTP. Please try again.'), 'error'),
  });

  return (
    <>
    <Seo title="Register" description="Create your free Aajiveka account. Sign up as a candidate to search jobs, build your resume, and get matched with top employers." path="/register" noIndex />
    <AuthShell
      title={pending ? 'Verify your mobile' : 'Create your account'}
      subtitle={pending ? `Enter the 6-digit code sent to ${pending.mobile}` : 'Sign up as a candidate'}
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </>
      }
    >
      {!pending ? (
        <form key="register-form" onSubmit={handleSubmit((v) => registerMutation.mutate(v))} className="space-y-4" noValidate>
          <Input label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input
            label="Mobile Number"
            inputMode="numeric"
            placeholder="10-digit mobile number"
            error={errors.mobile?.message}
            {...register('mobile')}
          />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
            Register
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
            label="One-Time Password"
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <Button type="submit" className="w-full" isLoading={otpMutation.isPending}>
            Verify &amp; Continue
          </Button>
          <button
            type="button"
            onClick={() => registerMutation.mutate(pending)}
            className="block w-full text-center text-sm text-primary hover:underline"
            disabled={registerMutation.isPending}
          >
            Resend code
          </button>
        </form>
      )}
    </AuthShell>
    </>
  );
}
