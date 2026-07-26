import { useMemo, useState } from 'react';
import { Search, ShieldCheck, ShieldOff, Trash2, UserCog, Users } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Breadcrumbs,
  Button,
  ConfirmDialog,
  Input,
  Modal,
  Pagination,
  Select,
  useToast,
  type BadgeTone,
  type Column,
} from '@/components/ui';
import { api } from '@/lib/axios';
import { Role, ROLE_LABEL, type RoleId } from '@/types/roles';

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

const ROLE_BADGE_TONE: Record<RoleId, BadgeTone> = {
  [Role.Subscriber]: 'blue',
  [Role.QC1]: 'amber',
  [Role.QC2]: 'amber',
  [Role.Client]: 'green',
  [Role.Admin]: 'purple',
  [Role.Subscription]: 'red',
};

const PAGE_SIZE = 15;

export default function AdminUsersPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [roleTarget, setRoleTarget] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete' | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'users', search, roleFilter, statusFilter],
    queryFn: () =>
      api
        .get<AdminUser[]>('/admin/users', {
          params: {
            ...(search ? { q: search } : {}),
            ...(roleFilter ? { roleId: Number(roleFilter) } : {}),
            ...(statusFilter ? { isActive: statusFilter === 'active' } : {}),
          },
        })
        .then((r) => r.data),
  });

  // Client-side pagination
  const paginatedData = useMemo(() => {
    const all = data ?? [];
    const start = (page - 1) * PAGE_SIZE;
    return {
      items: all.slice(start, start + PAGE_SIZE),
      total: all.length,
      pageCount: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
    };
  }, [data, page]);

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

  const bulkMutation = useMutation({
    mutationFn: async ({ action, userIds }: { action: 'activate' | 'deactivate' | 'delete'; userIds: number[] }) => {
      if (action === 'delete') {
        await api.post('/admin/users/bulk-delete', { userIds });
      } else {
        await api.post('/admin/users/bulk-update', {
          userIds,
          isActive: action === 'activate',
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      notify(t('adminUsers.bulkSuccess'), 'success');
      setSelected(new Set());
      setBulkAction(null);
    },
    onError: () => {
      notify(t('adminUsers.updateFailed'), 'error');
      setBulkAction(null);
    },
  });

  const roleOptions = Object.entries(ROLE_LABEL).map(([id, label]) => ({
    label,
    value: Number(id),
  }));

  const roleFilterOptions = [
    { label: t('adminUsers.allRoles'), value: '' },
    ...roleOptions,
  ];

  const statusFilterOptions = [
    { label: t('adminUsers.allStatuses'), value: '' },
    { label: t('adminUsers.active'), value: 'active' },
    { label: t('adminUsers.inactive'), value: 'inactive' },
  ];

  const toggleSelectAll = () => {
    if (selected.size === paginatedData.items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginatedData.items.map((u) => u.userId)));
    }
  };

  const toggleSelect = (userId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
      render: (u) => (
        <input
          type="checkbox"
          checked={selected.has(u.userId)}
          onChange={() => toggleSelect(u.userId)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
        />
      ),
    },
    { key: 'fullName', header: t('adminUsers.name') },
    { key: 'email', header: t('adminUsers.email') },
    { key: 'mobile', header: t('adminUsers.mobile') },
    {
      key: 'roleId',
      header: t('adminUsers.role'),
      render: (u) => (
        <Badge tone={ROLE_BADGE_TONE[u.roleId] ?? 'gray'}>{ROLE_LABEL[u.roleId]}</Badge>
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
    {
      key: 'createdAt',
      header: t('adminUsers.joined'),
      render: (u) => new Date(u.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      header: t('common:labels.actions'),
      render: (u) => (
        <div className="flex gap-2">
          <button
            onClick={() => setDeactivateTarget(u)}
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
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
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

      {/* Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="flex items-center gap-2 font-heading text-2xl font-bold text-navy">
          <Users className="h-6 w-6" />
          {t('adminUsers.heading')}
          {data && (
            <Badge tone="gray">{data.length}</Badge>
          )}
        </h1>
      </div>

      {/* Search & Filter bar */}
      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800 sm:flex-row sm:items-end">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder={t('adminUsers.searchPlaceholder')}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={roleFilterOptions}
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
            placeholder={t('adminUsers.filterByRole')}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            options={statusFilterOptions}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            placeholder={t('adminUsers.filterByStatus')}
          />
        </div>
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {t('adminUsers.selectedCount', { count: selected.size })}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkAction('activate')}>
              <ShieldCheck className="h-3.5 w-3.5" /> {t('adminUsers.activate')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setBulkAction('deactivate')}>
              <ShieldOff className="h-3.5 w-3.5" /> {t('adminUsers.deactivate')}
            </Button>
            <Button size="sm" variant="danger" onClick={() => setBulkAction('delete')}>
              <Trash2 className="h-3.5 w-3.5" /> {t('common:actions.delete')}
            </Button>
          </div>
        </div>
      )}

      {/* Table with select-all in header */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-gray-200 bg-brand-soft text-navy dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-200">
            <tr>
              <th className="w-10 px-3 py-2.5 sm:px-4 sm:py-3">
                <input
                  type="checkbox"
                  checked={paginatedData.items.length > 0 && selected.size === paginatedData.items.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
              </th>
              {columns.slice(1).map((c) => (
                <th key={c.key} scope="col" className="px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                  {columns.map((c, ci) => {
                    const widths = ['w-3/4', 'w-1/2', 'w-2/3', 'w-5/6', 'w-1/3'];
                    return (
                      <td key={c.key} className="px-3 py-2.5 sm:px-4 sm:py-3">
                        <div className={`h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-600 ${widths[(i + ci) % widths.length]}`} />
                      </td>
                    );
                  })}
                </tr>
              ))
            ) : paginatedData.items.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                  {t('adminUsers.noUsers')}
                </td>
              </tr>
            ) : (
              paginatedData.items.map((row) => (
                <tr
                  key={row.userId}
                  className={`border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50 ${
                    selected.has(row.userId) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-3 py-2.5 sm:px-4 sm:py-3 ${c.className ?? ''}`}>
                      {c.render ? c.render(row) : String((row as unknown as Record<string, unknown>)[c.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {paginatedData.pageCount > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination page={page} pageCount={paginatedData.pageCount} onChange={setPage} />
        </div>
      )}

      {/* Change role modal */}
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

      {/* Deactivate / activate single user confirm */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        title={deactivateTarget?.isActive ? t('adminUsers.deactivate') : t('adminUsers.activate')}
        message={
          deactivateTarget?.isActive
            ? t('adminUsers.deactivateWarning', { name: deactivateTarget?.fullName, defaultValue: `Are you sure you want to deactivate ${deactivateTarget?.fullName}?` })
            : t('adminUsers.activateWarning', { name: deactivateTarget?.fullName, defaultValue: `Are you sure you want to activate ${deactivateTarget?.fullName}?` })
        }
        variant={deactivateTarget?.isActive ? 'danger' : 'info'}
        confirmLabel={deactivateTarget?.isActive ? t('adminUsers.deactivate') : t('adminUsers.activate')}
        onConfirm={() => {
          if (deactivateTarget) {
            toggleActive.mutate(
              { userId: deactivateTarget.userId, isActive: !deactivateTarget.isActive },
              { onSettled: () => setDeactivateTarget(null) },
            );
          }
        }}
        onCancel={() => setDeactivateTarget(null)}
        isLoading={toggleActive.isPending}
      />

      {/* Bulk action confirm */}
      <ConfirmDialog
        isOpen={!!bulkAction}
        title={t('adminUsers.confirmBulkAction')}
        message={
          bulkAction === 'delete'
            ? t('adminUsers.bulkDeleteWarning', { count: selected.size })
            : t('adminUsers.bulkUpdateWarning', {
                count: selected.size,
                action: bulkAction === 'activate' ? t('adminUsers.activate').toLowerCase() : t('adminUsers.deactivate').toLowerCase(),
              })
        }
        variant={bulkAction === 'delete' ? 'danger' : 'warning'}
        confirmLabel={t('adminUsers.confirm')}
        onConfirm={() => {
          if (bulkAction) {
            bulkMutation.mutate({ action: bulkAction, userIds: Array.from(selected) });
          }
        }}
        onCancel={() => setBulkAction(null)}
        isLoading={bulkMutation.isPending}
      />
    </div>
  );
}
