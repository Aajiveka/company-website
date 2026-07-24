import { useState } from 'react';
import { Search, ShieldCheck, ShieldOff, UserCog } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Button, Input, Modal, Select, Table, useToast, type Column } from '@/components/ui';
import { api } from '@/lib/axios';
import { ROLE_LABEL, type RoleId } from '@/types/roles';

interface AdminUser {
  userId: number;
  userName: string;
  fullName: string;
  email: string;
  mobile: string;
  roleId: RoleId;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search],
    queryFn: () =>
      api.get<AdminUser[]>('/admin/users', { params: search ? { q: search } : undefined }).then((r) => r.data),
  });

  const toggleActive = useMutation({
    mutationFn: ({ userId, isActive }: { userId: number; isActive: boolean }) =>
      api.patch(`/admin/users/${userId}`, { isActive }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      notify(t('adminUsers.updated'), 'success');
    },
    onError: () => notify(t('adminUsers.updateFailed'), 'error'),
  });

  const changeRole = useMutation({
    mutationFn: ({ userId, roleId }: { userId: number; roleId: number }) =>
      api.patch(`/admin/users/${userId}`, { roleId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      notify(t('adminUsers.roleChanged'), 'success');
      setRoleTarget(null);
    },
    onError: () => notify(t('adminUsers.updateFailed'), 'error'),
  });

  const roleOptions = Object.entries(ROLE_LABEL).map(([id, label]) => ({
    label,
    value: Number(id),
  }));

  const columns: Column<AdminUser>[] = [
    { key: 'fullName', header: t('adminUsers.name') },
    { key: 'email', header: t('adminUsers.email') },
    { key: 'mobile', header: t('adminUsers.mobile') },
    {
      key: 'roleId',
      header: t('adminUsers.role'),
      render: (u) => (
        <Badge tone="blue">{ROLE_LABEL[u.roleId]}</Badge>
      ),
    },
    {
      key: 'isActive',
      header: t('common:labels.status'),
      render: (u) => (
        <Badge tone={u.isActive ? 'green' : 'gray'}>
          {u.isActive ? t('adminUsers.active') : t('adminUsers.inactive')}
        </Badge>
      ),
    },
    { key: 'createdAt', header: t('adminUsers.joined') },
    {
      key: 'actions',
      header: t('common:labels.actions'),
      render: (u) => (
        <div className="flex gap-2">
          <button
            onClick={() => toggleActive.mutate({ userId: u.userId, isActive: !u.isActive })}
            disabled={toggleActive.isPending}
            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
              u.isActive
                ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400'
            }`}
          >
            {u.isActive ? (
              <><ShieldOff className="h-3.5 w-3.5" /> {t('adminUsers.deactivate')}</>
            ) : (
              <><ShieldCheck className="h-3.5 w-3.5" /> {t('adminUsers.activate')}</>
            )}
          </button>
          <button
            onClick={() => { setRoleTarget(u); setNewRole(String(u.roleId)); }}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-100"
          >
            <UserCog className="h-3.5 w-3.5" /> {t('adminUsers.changeRole')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/admin' }, { label: t('adminUsers.heading') }]} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">{t('adminUsers.heading')}</h1>
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t('adminUsers.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Table columns={columns} data={data ?? []} rowKey={(u) => u.userId} isLoading={isLoading} emptyMessage={t('adminUsers.noUsers')} />

      <Modal open={!!roleTarget} onClose={() => setRoleTarget(null)} title={t('adminUsers.changeRoleTitle', { name: roleTarget?.fullName })}>
        <div className="space-y-4">
          <Select
            label={t('adminUsers.newRole')}
            options={roleOptions}
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setRoleTarget(null)}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={() => roleTarget && changeRole.mutate({ userId: roleTarget.userId, roleId: Number(newRole) })}
              isLoading={changeRole.isPending}
            >
              {t('common:actions.save')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
