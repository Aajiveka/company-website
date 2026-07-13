import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { Button, Input, useToast } from '@/components/ui';
import { useAuth } from '../auth.store';
import { authApi } from '../auth.api';
import { registerSchema, type RegisterValues } from '../auth.types';
import { ROLE_HOME } from '@/types/roles';
import { AuthShell } from '../components/AuthShell';

/** Candidate registration → 2Factor-style OTP verification (single page). */
export default function RegisterPage() {
  const { notify } = useToast();
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<number | null>(null);
  const [otp, setOtp] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      setUserId(res.userId);
      notify('OTP sent to your mobile number.', 'success');
    },
    onError: (err) =>
      notify(
        isAxiosError(err) ? ((err.response?.data as { message?: string })?.message ?? 'Registration failed') : 'Registration failed',
        'error',
      ),
  });

  const otpMutation = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: (session) => {
      setSession(session);
      notify('Account verified!', 'success');
      navigate(ROLE_HOME[session.user.roleId], { replace: true });
    },
    onError: () => notify('Invalid OTP. Please try again.', 'error'),
  });

  return (
    <AuthShell
      title={userId ? 'Verify your mobile' : 'Create your account'}
      subtitle={userId ? 'Enter the OTP we sent you' : 'Sign up as a candidate'}
      footer={
        <>
          Already registered?{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Login
          </Link>
        </>
      }
    >
      {!userId ? (
        <form onSubmit={handleSubmit((v) => registerMutation.mutate(v))} className="space-y-4" noValidate>
          <Input label="Full Name" error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Mobile Number" inputMode="numeric" error={errors.mobile?.message} {...register('mobile')} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
          <Button type="submit" className="w-full" isLoading={registerMutation.isPending}>
            Register
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            otpMutation.mutate({ userId, otp });
          }}
          className="space-y-4"
        >
          <Input
            label="One-Time Password"
            inputMode="numeric"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
          />
          <Button type="submit" className="w-full" isLoading={otpMutation.isPending}>
            Verify &amp; Continue
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
