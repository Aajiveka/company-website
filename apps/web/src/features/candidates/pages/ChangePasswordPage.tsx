import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, Input, useToast } from '@/components/ui';
import { useChangePassword } from '../candidate.api';

/** Change password (change-password.aspx / dashboard-change-password.aspx). */
export default function ChangePasswordPage() {
  const { t } = useTranslation('auth');
  const { notify } = useToast();
  const mutation = useChangePassword();

  const schema = z
    .object({
      currentPassword: z.string().min(1, t('changePassword.currentPassword')),
      newPassword: z.string().min(6, t('changePassword.newPassword')),
      confirm: z.string().min(1, t('changePassword.confirmPassword')),
    })
    .refine((v) => v.newPassword === v.confirm, { message: t('changePassword.mismatch'), path: ['confirm'] });
  type Values = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = (v: Values) =>
    mutation.mutate(
      { currentPassword: v.currentPassword, newPassword: v.newPassword },
      {
        onSuccess: () => {
          notify(t('changePassword.success'), 'success');
          reset();
        },
        onError: (err) =>
          notify(
            isAxiosError(err) ? ((err.response?.data as { message?: string })?.message ?? 'Failed') : 'Failed',
            'error',
          ),
      },
    );

  return (
    <div className="mx-auto max-w-lg">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('changePassword.title') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('changePassword.title')}</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label={t('changePassword.currentPassword')} type="password" error={errors.currentPassword?.message} {...register('currentPassword')} />
          <Input label={t('changePassword.newPassword')} type="password" error={errors.newPassword?.message} {...register('newPassword')} />
          <Input label={t('changePassword.confirmPassword')} type="password" error={errors.confirm?.message} {...register('confirm')} />
          <Button type="submit" isLoading={mutation.isPending}>
            {t('changePassword.updateButton')}
          </Button>
        </form>
      </Card>
    </div>
  );
}
