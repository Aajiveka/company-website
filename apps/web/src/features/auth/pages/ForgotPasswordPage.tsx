import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Alert, Button, Input } from '@/components/ui';
import { authApi } from '../auth.api';
import { forgotSchema, type ForgotValues } from '../auth.types';
import { AuthShell } from '../components/AuthShell';

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema) });

  const mutation = useMutation({ mutationFn: authApi.forgotPassword });

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a reset link"
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          Back to login
        </Link>
      }
    >
      {mutation.isSuccess ? (
        <Alert variant="success">
          If an account exists, a password reset link is on its way to the email on file. Please check your inbox.
        </Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
          <Input
            label="Username or registered mobile"
            error={errors.userName?.message}
            {...register('userName')}
          />
          <Button type="submit" className="w-full" isLoading={mutation.isPending}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
