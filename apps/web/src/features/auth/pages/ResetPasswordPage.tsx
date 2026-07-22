import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { authApi } from '../auth.api';
import { resetSchema, type ResetValues } from '../auth.types';
import { AuthShell } from '../components/AuthShell';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const token = params.get('token') ?? '';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { token } });

  useEffect(() => setValue('token', token), [token, setValue]);

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      notify('Password updated. Please log in.', 'success');
      navigate('/login', { replace: true });
    },
    onError: () => notify('Reset link is invalid or expired.', 'error'),
  });

  return (
    <>
    <Seo title="Reset Password" path="/reset-password" noIndex />
    <AuthShell
      title="Reset password"
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
        <input type="hidden" {...register('token')} />
        <Input
          label="New Password"
          type="password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label="Confirm Password"
          type="password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          Update password
        </Button>
      </form>
    </AuthShell>
    </>
  );
}
