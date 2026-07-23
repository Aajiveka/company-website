import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getErrorMessage } from '@/lib/axios';
import { Breadcrumbs, Button, Card, Input, useToast } from '@/components/ui';
import { useChangePassword } from '../candidate.api';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z
      .string()
      .min(8, 'At least 8 characters')
      .regex(/[A-Z]/, 'Include at least one uppercase letter')
      .regex(/[a-z]/, 'Include at least one lowercase letter')
      .regex(/\d/, 'Include at least one number'),
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.newPassword === v.confirm, { message: 'Passwords do not match', path: ['confirm'] });
type Values = z.infer<typeof schema>;

/** Change password (change-password.aspx / dashboard-change-password.aspx). */
export default function ChangePasswordPage() {
  const { notify } = useToast();
  const mutation = useChangePassword();
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
          notify('Password changed successfully.', 'success');
          reset();
        },
        onError: (err) =>
          notify(getErrorMessage(err, 'Failed'), 'error'),
      },
    );

  return (
    <div className="mx-auto max-w-lg">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/candidate/profile' }, { label: 'Change Password' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Change Password</h1>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Input label="Current Password" type="password" required autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
          <Input label="New Password" type="password" required autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
          <Input label="Confirm New Password" type="password" required autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
          <Button type="submit" isLoading={mutation.isPending}>
            Update Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
