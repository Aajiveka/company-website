import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, Input, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { authApi } from '../auth.api';
import { resetSchema, type ResetValues } from '../auth.types';
import { AuthShell } from '../components/AuthShell';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { notify } = useToast();
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const token = params.get('token') ?? '';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema(tCommon)), defaultValues: { token } });

  useEffect(() => setValue('token', token), [token, setValue]);

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: () => {
      notify(t('reset.success'), 'success');
      navigate('/login', { replace: true });
    },
    onError: () => notify(t('reset.error'), 'error'),
  });

  return (
    <>
    <Seo title="Reset Password" path="/reset-password" noIndex />
    <AuthShell
      title={t('reset.title')}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('reset.backToLogin')}
        </Link>
      }
    >
      <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
        <input type="hidden" {...register('token')} />
        <Input
          label={t('reset.newPassword')}
          type="password"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />
        <Input
          label={t('reset.confirmPassword')}
          type="password"
          error={errors.confirm?.message}
          {...register('confirm')}
        />
        <Button type="submit" className="w-full" isLoading={mutation.isPending}>
          {t('reset.updateButton')}
        </Button>
      </form>
    </AuthShell>
    </>
  );
}
