import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { KeyRound, Power } from 'lucide-react';
import { getErrorMessage } from '@/lib/axios';
import { useAuth } from '@/features/auth/auth.store';
import { Role, ROLE_LABEL, type RoleId } from '@/types/roles';
import { Button, ConfirmDialog, useToast } from '@/components/ui';
import { useAdminUser, useSendPasswordReset, useUpdateUser } from '../admin.api';
import type { SetPasswordResult } from '../admin.types';
import { STAGE_LABEL } from '../admin.types';
import { AdminShell } from '../components/AdminShell';
import { SetPasswordNotice } from '../components/SetPasswordNotice';
import { AuditList } from '../components/AuditList';
import {
  ActivePill,
  ErrorState,
  Facts,
  Panel,
  Pill,
} from '../components/primitives';
import { STAGE_TONE, fmtDate } from '../admin.format';

/** Staff may move between staff roles; candidate and employer logins never change role. */
const STAFF_ROLES: RoleId[] = [Role.QC1, Role.QC2, Role.Q3, Role.Admin];

type Pending = { kind: 'status'; to: boolean } | { kind: 'role'; to: RoleId } | { kind: 'reset' };

export default function AdminUserDetailPage() {
  const id = Number(useParams().userId);
  const { user: me } = useAuth();
  const { notify } = useToast();
  const { data: u, isLoading, error, refetch } = useAdminUser(id);
  const update = useUpdateUser();
  const reset = useSendPasswordReset();
  const [pending, setPending] = useState<Pending | null>(null);
  const [resetResult, setResetResult] = useState<SetPasswordResult | null>(null);
  const [roleDraft, setRoleDraft] = useState<RoleId | ''>('');

  const isSelf = me?.userId === id;
  const isStaff = u ? STAFF_ROLES.includes(u.roleId as RoleId) : false;

  const run = () => {
    if (!pending || !u) return;
    const done = (msg: string) => () => {
      notify(msg, 'success');
      setPending(null);
    };
    const fail = (e: unknown) => {
      notify(getErrorMessage(e, 'That change was not saved'), 'error');
      setPending(null);
    };
    if (pending.kind === 'status') {
      update.mutate(
        { userId: id, isActive: pending.to },
        { onSuccess: done(pending.to ? 'Account activated' : 'Account deactivated and signed out'), onError: fail },
      );
    } else if (pending.kind === 'role') {
      update.mutate(
        { userId: id, roleId: pending.to },
        {
          onSuccess: () => {
            setRoleDraft('');
            done(`Role changed to ${ROLE_LABEL[pending.to]}`)();
          },
          onError: fail,
        },
      );
    } else {
      reset.mutate(id, {
        onSuccess: (r) => {
          setResetResult(r);
          setPending(null);
        },
        onError: fail,
      });
    }
  };

  const name = u?.fullName || u?.userName || `User ${id}`;

  return (
    <AdminShell
      title={isLoading ? 'User' : name}
      subtitle={u ? `${ROLE_LABEL[u.roleId as RoleId] ?? 'User'} · @${u.userName}` : undefined}
      crumbs={[
        { label: 'Dashboard', to: '/admin' },
        { label: 'Users & staff', to: '/admin/users' },
        { label: isLoading ? '…' : name },
      ]}
    >
      {error ? (
        <Panel>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Panel>
      ) : isLoading || !u ? (
        <div className="h-64 animate-pulse rounded-xl bg-white dark:bg-gray-800" aria-busy="true" />
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
          <div className="min-w-0 space-y-5 xl:col-span-2">
            <Panel title="Profile" action={<ActivePill active={u.isActive} />}>
              <Facts
                items={[
                  ['Full name', u.fullName],
                  ['Username', u.userName],
                  ['Email', u.email],
                  ['Mobile', u.mobile],
                  ['Role', ROLE_LABEL[u.roleId as RoleId] ?? `Role ${u.roleId}`],
                  ['Joined', fmtDate(u.createdAt)],
                  ['Signed-in sessions', u.activeSessions],
                  ['Password', u.mustChangePassword ? 'Must be changed at next sign-in' : 'Set by the user'],
                  ...(u.company
                    ? ([['Company', <Link key="c" to={`/admin/jobs?clientId=${u.company.clientId}`} className="text-aj-blue hover:underline">{u.company.clientName}</Link>]] as [string, React.ReactNode][])
                    : []),
                  ...(u.candidate?.screening
                    ? ([['Q1 screening', `${u.candidate.screening.status} · ${u.candidate.screening.priority} priority`]] as [string, React.ReactNode][])
                    : []),
                ]}
              />
              {u.subscriberId != null && (
                <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                  Candidate profile details are edited by the candidate, or reviewed in{' '}
                  <Link to={`/q1/candidates/${u.subscriberId}`} className="text-aj-blue hover:underline">
                    Q1 screening
                  </Link>
                  . Opening it there counts as a review: a New candidate moves to Screening.
                </p>
              )}
            </Panel>

            {u.candidate && (
              <Panel title="Applications" description="Where each of this candidate's applications stands" bodyClassName="p-0">
                {u.candidate.applications.length ? (
                  <ul className="divide-y divide-aj-line-soft dark:divide-gray-700">
                    {u.candidate.applications.map((a) => (
                      <li key={a.mapId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm sm:px-5">
                        <Link to={`/admin/applications/${a.mapId}`} className="min-w-0 hover:text-aj-blue hover:underline">
                          <span className="font-semibold text-navy dark:text-white">{a.job.designation}</span>
                          <span className="text-gray-500"> · {a.job.company}</span>
                        </Link>
                        <span className="flex items-center gap-2">
                          <Pill tone={STAGE_TONE[a.stage]}>{STAGE_LABEL[a.stage]}</Pill>
                          <span className="text-xs text-gray-500">{a.status}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="px-5 py-6 text-sm text-gray-500">No applications yet.</p>
                )}
              </Panel>
            )}

            <Panel title="Recent activity by this user" bodyClassName="p-0">
              <AuditList entries={u.activity} empty="Nothing recorded yet." showActor={false} />
            </Panel>
          </div>

          <div className="min-w-0 space-y-5">
            <Panel title="Account actions">
              {isSelf && (
                <p className="mb-3 rounded-lg bg-aj-surface-soft p-3 text-xs text-gray-600 dark:bg-gray-700/50 dark:text-gray-300">
                  This is your own account. You cannot deactivate or demote yourself — ask another admin.
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <Button
                    className="w-full"
                    variant={u.isActive ? 'danger' : 'primary'}
                    disabled={isSelf}
                    onClick={() => setPending({ kind: 'status', to: !u.isActive })}
                  >
                    <Power className="mr-1.5 h-4 w-4" />
                    {u.isActive ? 'Deactivate account' : 'Activate account'}
                  </Button>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {u.isActive
                      ? 'Signs them out everywhere and blocks sign-in. Records are kept.'
                      : 'Lets them sign in again with their existing password.'}
                  </p>
                </div>

                <div>
                  <Button className="w-full" variant="outline" disabled={!u.isActive || !u.email} onClick={() => setPending({ kind: 'reset' })}>
                    <KeyRound className="mr-1.5 h-4 w-4" />
                    Send password reset link
                  </Button>
                  <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                    {!u.email ? 'No email address on file.' : !u.isActive ? 'Activate the account first.' : `Sent to ${u.email}; valid for one hour.`}
                  </p>
                  {resetResult && (
                    <div className="mt-3">
                      <SetPasswordNotice result={resetResult} />
                    </div>
                  )}
                </div>

                {isStaff && (
                  <div>
                    <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
                      Change staff role
                    </label>
                    <div className="flex gap-2">
                      <select
                        id="role"
                        value={roleDraft || u.roleId}
                        disabled={isSelf}
                        onChange={(e) => setRoleDraft(Number(e.target.value) as RoleId)}
                        className="h-10 min-w-0 flex-1 rounded-lg border border-aj-line bg-white px-3 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
                      >
                        {STAFF_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="outline"
                        disabled={isSelf || !roleDraft || roleDraft === u.roleId}
                        onClick={() => roleDraft && setPending({ kind: 'role', to: roleDraft })}
                      >
                        Apply
                      </Button>
                    </div>
                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
                      Takes effect at their next sign-in; current sessions are ended.
                    </p>
                  </div>
                )}
                {!isStaff && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {u.roleId === Role.Subscriber ? 'Candidate' : 'Employer'} logins keep their role: the account is tied to
                    {u.roleId === Role.Subscriber ? ' a candidate profile' : ' a company'}.
                  </p>
                )}
              </div>
            </Panel>

            <Panel title="Sign-in history" bodyClassName="p-0">
              {u.logins.length ? (
                <ul className="divide-y divide-aj-line-soft text-sm dark:divide-gray-700">
                  {u.logins.map((l, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 px-4 py-2.5 sm:px-5">
                      <span className="text-gray-700 dark:text-gray-200">{fmtDate(l.loginTime, true)}</span>
                      <span className="truncate text-xs text-gray-500">{l.ipAddress ?? '—'}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-6 text-sm text-gray-500">No sign-ins recorded.</p>
              )}
            </Panel>

            <Panel title="Changes made to this account" bodyClassName="p-0">
              <AuditList entries={u.history} empty="No admin changes yet." />
            </Panel>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pending != null}
        title={
          pending?.kind === 'status'
            ? pending.to
              ? 'Activate this account?'
              : 'Deactivate this account?'
            : pending?.kind === 'role'
              ? `Change role to ${ROLE_LABEL[pending.to]}?`
              : 'Send a password reset link?'
        }
        message={
          pending?.kind === 'status'
            ? pending.to
              ? `${name} will be able to sign in again.`
              : `${name} will be signed out everywhere and unable to sign in until reactivated.`
            : pending?.kind === 'role'
              ? `${name} will be signed out and get ${ROLE_LABEL[pending.to]} access at their next sign-in.`
              : `A single-use link will be sent to ${u?.email}. Their current password keeps working until they use it.`
        }
        confirmLabel={pending?.kind === 'status' && !pending.to ? 'Deactivate' : 'Confirm'}
        variant={pending?.kind === 'status' && !pending.to ? 'danger' : 'warning'}
        isLoading={update.isPending || reset.isPending}
        onConfirm={run}
        onCancel={() => setPending(null)}
      />
    </AdminShell>
  );
}
