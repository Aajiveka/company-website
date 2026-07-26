import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { authApi } from '../auth.api';
import { forgotSchema, type ForgotValues } from '../auth.types';
import { AuthShell } from '../components/AuthShell';

export default function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema(tCommon)) });

  const mutation = useMutation({ mutationFn: authApi.forgotPassword });

  return (
    <>
    <Seo title="Forgot Password" path="/forgot-password" noIndex />
    <AuthShell
      title={t('forgot.title')}
      subtitle={t('forgot.subtitle')}
      footer={
        <Link to="/login" className="font-medium text-primary hover:underline">
          {t('forgot.backToLogin')}
        </Link>
      }
    >
      {mutation.isSuccess ? (
        <Alert variant="success">{t('forgot.successMessage')}</Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4" noValidate>
          <Input
            label={t('forgot.usernameOrMobile')}
            error={errors.userName?.message}
            {...register('userName')}
          />
          <Button type="submit" className="w-full" isLoading={mutation.isPending}>
            {t('forgot.sendButton')}
          </Button>
        </form>
      )}
    </AuthShell>
    </>
  );
}
