import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { getErrorMessage } from '@/lib/axios';
import { useAuth } from '@/features/auth/auth.store';
import { Role, ROLE_LABEL, type RoleId } from '@/types/roles';
import { Button, ConfirmDialog, Input, Modal, useToast } from '@/components/ui';
import ExportButton from '../components/ExportButton';
import { useAdminUsers, useBulkUpdateUsers, useCreateStaffUser } from '../admin.api';
import type { AdminUser, SetPasswordResult } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import { SetPasswordNotice } from '../components/SetPasswordNotice';
import {
  ActivePill,
  DataTable,
  Empty,
  ErrorState,
  FilterSelect,
  Panel,
  SearchInput,
  TableFooter,
  type ColumnDef,
} from '../components/primitives';
import { fmtDate } from '../admin.format';

const PAGE_SIZE = 20;

/** The roles an admin may create — mirrors STAFF_ROLES in the API's admin.dto.ts. */
const STAFF_ROLES = [Role.QC1, Role.QC2, Role.Q3, Role.Admin] as const;
const STAFF_ROLE_HINT: Record<number, string> = {
  [Role.QC1]: 'Q1 — screens and verifies candidates',
  [Role.QC2]: 'Q2 — matches applicants to jobs and refers them',
  [Role.Q3]: 'Q3 — runs interviews, documents and offers',
  [Role.Admin]: 'Admin — full access to this panel',
};

const ROLE_FILTER = [
  { value: '', label: 'All roles' },
  ...[Role.Subscriber, Role.QC1, Role.QC2, Role.Q3, Role.Client, Role.Admin].map((r) => ({
    value: String(r),
    label: ROLE_LABEL[r],
  })),
];

const staffSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter the person’s full name').max(100),
  userName: z
    .string()
    .trim()
    .min(3, 'At least 3 characters')
    .max(50)
    .regex(/^[A-Za-z0-9._@-]+$/, 'Letters, digits and . _ @ - only'),
  email: z.string().trim().email('Enter a valid email address').max(100),
  roleId: z.coerce.number().refine((v) => (STAFF_ROLES as readonly number[]).includes(v), 'Choose a role'),
});
type StaffValues = z.input<typeof staffSchema>;

function CreateStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateStaffUser();
  const [result, setResult] = useState<SetPasswordResult | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { fullName: '', userName: '', email: '', roleId: Role.QC1 },
  });

  const close = () => {
    reset();
    setResult(null);
    create.reset();
    onClose();
  };

  const onSubmit = handleSubmit((values) => {
    const v = staffSchema.parse(values);
    create.mutate(v, {
      onSuccess: (r) => setResult(r),
      onError: (e) => {
        const msg = getErrorMessage(e, 'Could not create the account');
        if (/username/i.test(msg)) setError('userName', { message: msg });
      },
    });
  });

  return (
    <Modal open={open} onClose={close} title={result ? 'Staff account created' : 'Add a staff member'}>
      {result ? (
        <div className="space-y-4">
          <SetPasswordNotice result={result} />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            The account is active. The person signs in after choosing a password from the link; nobody else ever
            sees it.
          </p>
          <div className="flex justify-end">
            <Button onClick={close}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Candidates register themselves and employers are created by approving their registration, so only staff
            accounts are added here.
          </p>
          <Input label="Full name" required autoComplete="off" error={errors.fullName?.message} {...register('fullName')} />
          <Input
            label="Username"
            required
            autoComplete="off"
            autoCapitalize="none"
            error={errors.userName?.message}
            {...register('userName')}
          />
          <Input
            label="Work email"
            type="email"
            required
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-navy dark:text-gray-200">Role</legend>
            <div className="grid gap-2">
              {STAFF_ROLES.map((r) => (
                <label
                  key={r}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-aj-line p-3 text-sm has-checked:border-aj-blue has-checked:bg-aj-line-soft dark:border-gray-600 dark:has-checked:bg-aj-blue/20"
                >
                  <input type="radio" value={r} className="mt-0.5 h-4 w-4" {...register('roleId')} />
                  <span>
                    <span className="block font-semibold text-navy dark:text-white">{ROLE_LABEL[r]}</span>
                    <span className="block text-xs text-gray-500 dark:text-gray-400">{STAFF_ROLE_HINT[r]}</span>
                  </span>
                </label>
              ))}
            </div>
            {errors.roleId && <p className="mt-1 text-sm text-danger">{errors.roleId.message}</p>}
          </fieldset>
          {create.isError && !errors.userName && (
            <p role="alert" className="text-sm text-danger">
              {getErrorMessage(create.error, 'Could not create the account')}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" isLoading={create.isPending}>
              Create account
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const { notify } = useToast();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page') ?? 1) || 1;
  const q = params.get('q') ?? '';
  const roleId = params.get('roleId') ?? '';
  const isActive = (params.get('status') ?? '') as '' | 'true' | 'false';

  const setFilter = useCallback(
    (key: string, value: string) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set(key, value);
          else next.delete(key);
          if (key !== 'page') next.delete('page');
          return next;
        },
        { replace: true },
      ),
    [setParams],
  );

  const { data, isLoading, isFetching, error, refetch } = useAdminUsers({
    page,
    pageSize: PAGE_SIZE,
    q,
    roleId: roleId ? Number(roleId) : '',
    isActive,
  });
  const bulk = useBulkUpdateUsers();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<null | boolean>(null);
  const [creating, setCreating] = useState(false);

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const toggleAll = (ids: number[]) =>
    setSelected((s) => (ids.every((id) => s.has(id)) ? new Set([...s].filter((id) => !ids.includes(id))) : new Set([...s, ...ids])));

  const runBulk = () => {
    if (confirm == null) return;
    bulk.mutate(
      { userIds: [...selected], isActive: confirm },
      {
        onSuccess: () => {
          notify(`${selected.size} account${selected.size === 1 ? '' : 's'} ${confirm ? 'activated' : 'deactivated'}`, 'success');
          setSelected(new Set());
          setConfirm(null);
        },
        onError: (e) => {
          notify(getErrorMessage(e, 'Could not update the accounts'), 'error');
          setConfirm(null);
        },
      },
    );
  };

  const columns: ColumnDef<AdminUser>[] = [
    {
      key: 'name',
      header: 'User',
      cell: (u) => (
        <Link to={`/admin/users/${u.userId}`} className="group block min-w-0">
          <span className="block truncate font-semibold text-navy group-hover:text-aj-blue group-hover:underline dark:text-white">
            {u.fullName || u.userName}
          </span>
          <span className="block truncate text-xs font-normal text-gray-500 dark:text-gray-400">@{u.userName}</span>
        </Link>
      ),
    },
    { key: 'role', header: 'Role', cell: (u) => ROLE_LABEL[u.roleId as RoleId] ?? `Role ${u.roleId}` },
    { key: 'email', header: 'Email', wideOnCard: true, cell: (u) => <span className="break-all">{u.email || '—'}</span> },
    { key: 'mobile', header: 'Mobile', cell: (u) => u.mobile || '—', className: 'whitespace-nowrap' },
    { key: 'status', header: 'Status', cell: (u) => <ActivePill active={u.isActive} /> },
    { key: 'joined', header: 'Joined', cell: (u) => fmtDate(u.createdAt), className: 'whitespace-nowrap' },
  ];

  return (
    <AdminShell
      title="Users & staff"
      subtitle="Every login on the platform — candidates, employers and staff"
      crumbs={[{ label: 'Dashboard', to: '/admin' }, { label: 'Users & staff' }]}
      actions={
        <>
          <ExportButton endpoint="/exports/users" filename="users" label="Export CSV" size="sm" variant="outline" />
          <Button size="sm" onClick={() => setCreating(true)}>
            <UserPlus className="mr-1.5 h-4 w-4" />
            Add staff member
          </Button>
        </>
      }
    >
      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-aj-line-soft p-4 sm:flex-row sm:flex-wrap sm:items-center dark:border-gray-700">
          <SearchInput
            label="Search users"
            placeholder="Name, username, email or mobile"
            value={q}
            onChange={(v) => setFilter('q', v)}
          />
          <FilterSelect label="Role" value={roleId} onChange={(v) => setFilter('roleId', v)} options={ROLE_FILTER} />
          <FilterSelect
            label="Status"
            value={isActive}
            onChange={(v) => setFilter('status', v)}
            options={[
              { value: '', label: 'Any status' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Inactive' },
            ]}
          />
          {isFetching && !isLoading && <span className="text-xs text-gray-400">Updating…</span>}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-aj-line-soft bg-aj-line-soft/60 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-aj-blue/10">
            <span className="font-semibold text-navy dark:text-white">{selected.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => setConfirm(true)}>
              Activate
            </Button>
            <Button size="sm" variant="danger" onClick={() => setConfirm(false)}>
              Deactivate
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}

        {error ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <DataTable
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(u) => u.userId}
            isLoading={isLoading}
            empty={<Empty title="No users match these filters" hint="Try a different search or clear the filters." />}
            selection={{
              selected,
              toggle,
              toggleAll,
              idOf: (u) => u.userId,
              // Your own row is excluded: the API refuses self-deactivation anyway.
              selectable: (u) => u.userId !== me?.userId,
            }}
          />
        )}
        {data && (
          <TableFooter
            page={data.page}
            pageCount={data.pageCount}
            total={data.total}
            pageSize={data.pageSize}
            onPage={(p) => setFilter('page', String(p))}
          />
        )}
      </Panel>

      <CreateStaffModal open={creating} onClose={() => setCreating(false)} />
      <ConfirmDialog
        isOpen={confirm != null}
        title={confirm ? 'Activate accounts?' : 'Deactivate accounts?'}
        message={
          confirm
            ? `${selected.size} account(s) will be able to sign in again.`
            : `${selected.size} account(s) will be signed out everywhere and unable to sign in until reactivated. Their records are kept.`
        }
        confirmLabel={confirm ? 'Activate' : 'Deactivate'}
        variant={confirm ? 'info' : 'danger'}
        isLoading={bulk.isPending}
        onConfirm={runBulk}
        onCancel={() => setConfirm(null)}
      />
    </AdminShell>
  );
}
