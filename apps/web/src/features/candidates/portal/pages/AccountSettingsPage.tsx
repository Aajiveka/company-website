import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { AlertTriangle, Download, Upload } from 'lucide-react';
import { ConfirmDialog, useToast } from '@/components/ui';
import { useAuthStore } from '@/features/auth/auth.store';
import {
  useCandidateProfile,
  useChangePassword,
  useUpdatePersonal,
  useUploadAvatar,
  useCvEditProfile,
} from '../../candidate.api';
import {
  type PrivacySettings,
  usePrivacySettings,
  useRequestAccountDeletion,
  useRequestDataExport,
  useUpdatePrivacy,
} from '../portal.api';
import { ModuleHeader, Tabs } from '../components/ModuleFrame';
import { Btn, Card, CardBody, CardHeader, Field, Input, SkeletonRows } from '../components/primitives';
import { ToggleRow } from './EmailPreferencesPage';
import { longDate } from '../format';

type TabKey = 'personal' | 'security' | 'privacy' | 'danger';

/**
 * The design asks for First and Last name, the CV stores one `fullName`. Splitting on the
 * last space keeps multi-word given names ("Rahul Kumar Sharma" → "Rahul Kumar" + "Sharma")
 * intact, and joining back is lossless for everything except trailing whitespace.
 */
function splitName(full: string): { firstName: string; lastName: string } {
  const parts = (full ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { firstName: parts[0] ?? '', lastName: '' };
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] };
}

const joinName = (first: string, last: string) => [first.trim(), last.trim()].filter(Boolean).join(' ');

const TABS = [
  { key: 'personal' as const, label: 'Personal Info' },
  { key: 'security' as const, label: 'Login & Security' },
  { key: 'privacy' as const, label: 'Privacy' },
  { key: 'danger' as const, label: 'Danger Zone' },
];

/** Account Settings — Figma nodes 7:6217, 7:6364, 7:6511 and 7:6628. */
export default function AccountSettingsPage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : 'personal';

  const setTab = (key: TabKey) => {
    const next = new URLSearchParams(params);
    next.set('tab', key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <ModuleHeader title="Account Settings" />
      <Tabs items={TABS} value={tab} onChange={setTab} />

      {tab === 'personal' && <PersonalInfoTab />}
      {tab === 'security' && <SecurityTab />}
      {tab === 'privacy' && <PrivacyTab />}
      {tab === 'danger' && <DangerZoneTab />}
    </>
  );
}

/* -------------------------------- Personal info -------------------------------- */

function PersonalInfoTab() {
  const { data: profile, isLoading } = useCandidateProfile();
  const { data: cv } = useCvEditProfile();
  const savePersonal = useUpdatePersonal();
  const uploadAvatar = useUploadAvatar();
  const { notify } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', mobile: '' });

  useEffect(() => {
    if (profile) setForm({ ...splitName(profile.fullName), email: profile.email, mobile: profile.mobile });
  }, [profile]);

  if (isLoading || !profile) {
    return (
      <Card>
        <CardBody>
          <SkeletonRows rows={3} />
        </CardBody>
      </Card>
    );
  }

  const fullName = joinName(form.firstName, form.lastName);
  const dirty = fullName !== profile.fullName || form.email !== profile.email || form.mobile !== profile.mobile;

  const onSave = () => {
    // The personal endpoint replaces the whole record, so the fields this tab does not
    // show are carried through from the CV rather than being blanked.
    savePersonal.mutate(
      {
        fullName,
        email: form.email,
        mobile: form.mobile,
        dob: cv?.personal?.dob ?? '',
        gender: (cv?.personal?.gender ?? 'M') as 'M' | 'F',
        address: cv?.personal?.address ?? '',
        cityId: cv?.personal?.cityId ?? null,
      },
      {
        onSuccess: () => notify('Your details have been saved.', 'success'),
        onError: () => notify('Could not save your details.', 'error'),
      },
    );
  };

  const onPhoto = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      notify('That image is larger than 5 MB.', 'error');
      return;
    }
    uploadAvatar.mutate(file, {
      onSuccess: () => notify('Photo updated.', 'success'),
      onError: () => notify('Could not upload that photo.', 'error'),
    });
  };

  return (
    <Card>
      <CardHeader title="Personal Information" />
      <CardBody>
        <div className="mb-5 flex items-center gap-4">
          <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl bg-aj-blue font-display text-xl font-bold text-white">
            {profile.photoUrl ? (
              <img src={profile.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              (profile.fullName || 'A').slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <Btn variant="secondary" onClick={() => fileRef.current?.click()} disabled={uploadAvatar.isPending}>
              <Upload className="size-4" aria-hidden />
              {uploadAvatar.isPending ? 'Uploading…' : 'Change Photo'}
            </Btn>
            <p className="mt-1 text-xs text-slate-400">JPG or PNG · max 5 MB</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              onPhoto(file);
            }}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First Name" htmlFor="acctFirstName">
            <Input
              id="acctFirstName"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Last Name" htmlFor="acctLastName">
            <Input
              id="acctLastName"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
          <Field label="Email" htmlFor="acctEmail">
            <Input
              id="acctEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone" htmlFor="acctPhone">
            <Input
              id="acctPhone"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </Field>
          <Field label="Location" hint="Change this from the profile wizard's first step.">
            <Input value={profile.city || '—'} disabled readOnly />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Btn
            variant="secondary"
            onClick={() => setForm({ ...splitName(profile.fullName), email: profile.email, mobile: profile.mobile })}
            disabled={!dirty}
          >
            Discard
          </Btn>
          <Btn onClick={onSave} disabled={!dirty || savePersonal.isPending}>
            {savePersonal.isPending ? 'Saving…' : 'Save Changes'}
          </Btn>
        </div>
      </CardBody>
    </Card>
  );
}

/* --------------------------------- Security ----------------------------------- */

function SecurityTab() {
  const change = useChangePassword();
  const { notify } = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState<string | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (form.newPassword.length < 8) {
      setError('Your new password must be at least 8 characters.');
      return;
    }
    if (form.newPassword !== form.confirm) {
      setError('The two new passwords do not match.');
      return;
    }

    change.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          notify('Password updated.', 'success');
          setForm({ currentPassword: '', newPassword: '', confirm: '' });
        },
        onError: (err) =>
          setError(
            isAxiosError(err) && err.response?.status === 400
              ? 'Your current password is not correct.'
              : 'Could not update your password. Please try again.',
          ),
      },
    );
  };

  return (
    <>
      <Card>
        <CardHeader title="Change Password" />
        <CardBody>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
            <Field label="Current Password" htmlFor="curPwd">
              <Input
                id="curPwd"
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                required
              />
            </Field>
            <Field label="New Password" htmlFor="newPwd">
              <Input
                id="newPwd"
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                required
              />
            </Field>
            <Field label="Confirm Password" htmlFor="confPwd" error={error ?? undefined}>
              <Input
                id="confPwd"
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                required
              />
            </Field>
            <div className="sm:col-span-3">
              <Btn type="submit" disabled={change.isPending}>
                {change.isPending ? 'Updating…' : 'Update Password'}
              </Btn>
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Two-Factor Authentication" />
        <CardBody className="divide-y divide-aj-line-soft dark:divide-gray-700">
          <ToggleRow
            title="Two-factor authentication"
            blurb="Extra layer of account security"
            checked={false}
            onChange={() => undefined}
            disabled
            note="Not available yet — this account still signs in with a password and OTP only."
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Connected Accounts" />
        <CardBody className="divide-y divide-aj-line-soft dark:divide-gray-700">
          <ToggleRow
            title="Google"
            blurb="Sign in with your Google account"
            checked={false}
            onChange={() => undefined}
            disabled
            note="Social sign-in is not configured for this deployment."
          />
          <ToggleRow
            title="LinkedIn"
            blurb="Sign in with your LinkedIn account"
            checked={false}
            onChange={() => undefined}
            disabled
            note="Social sign-in is not configured for this deployment."
          />
        </CardBody>
      </Card>
    </>
  );
}

/* ---------------------------------- Privacy ----------------------------------- */

function PrivacyTab() {
  const { data, isLoading } = usePrivacySettings();
  const save = useUpdatePrivacy();
  const { notify } = useToast();
  const [draft, setDraft] = useState<PrivacySettings | null>(null);

  useEffect(() => {
    if (data && !draft) setDraft(data);
  }, [data, draft]);

  if (isLoading || !draft) {
    return (
      <Card>
        <CardBody>
          <SkeletonRows rows={2} />
        </CardBody>
      </Card>
    );
  }

  // The design commits these with an explicit button rather than on toggle, so a half-made
  // decision is never persisted and Discard is meaningful.
  const dirty =
    !!data &&
    (draft.showCurrentEmployer !== data.showCurrentEmployer ||
      draft.allowRecruiterMessages !== data.allowRecruiterMessages);

  return (
    <Card>
      <CardHeader title="Privacy Settings" />
      <CardBody className="divide-y divide-aj-line-soft dark:divide-gray-700">
        <ToggleRow
          title="Show Current Employer"
          blurb="Display current company publicly"
          checked={draft.showCurrentEmployer}
          onChange={(v) => setDraft({ ...draft, showCurrentEmployer: v })}
        />
        <ToggleRow
          title="Allow Recruiter Messages"
          blurb="Recruiters can contact you directly"
          checked={draft.allowRecruiterMessages}
          onChange={(v) => setDraft({ ...draft, allowRecruiterMessages: v })}
        />
      </CardBody>
      <div className="flex justify-end gap-3 border-t border-aj-line-soft px-5 py-4 dark:border-gray-700">
        <Btn variant="secondary" onClick={() => data && setDraft(data)} disabled={!dirty}>
          Discard
        </Btn>
        <Btn
          onClick={() =>
            save.mutate(
              {
                showCurrentEmployer: draft.showCurrentEmployer,
                allowRecruiterMessages: draft.allowRecruiterMessages,
              },
              {
                onSuccess: () => notify('Privacy settings saved.', 'success'),
                onError: () => notify('Could not save your privacy settings.', 'error'),
              },
            )
          }
          disabled={!dirty || save.isPending}
        >
          {save.isPending ? 'Saving…' : 'Save Privacy Settings'}
        </Btn>
      </div>
    </Card>
  );
}

/* -------------------------------- Danger zone --------------------------------- */

function DangerZoneTab() {
  const { data } = usePrivacySettings();
  const requestExport = useRequestDataExport();
  const requestDeletion = useRequestAccountDeletion();
  const { notify } = useToast();
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const [confirming, setConfirming] = useState(false);

  const onDelete = () => {
    requestDeletion.mutate(undefined, {
      onSuccess: async () => {
        setConfirming(false);
        notify('Your account has been scheduled for deletion.', 'success');
        await logout();
        navigate('/');
      },
      onError: () => {
        setConfirming(false);
        notify('Could not process that request. Please contact support.', 'error');
      },
    });
  };

  return (
    <>
      <Card>
        <CardHeader title="Download My Data" />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] text-slate-600 dark:text-gray-300">
              Export your profile, applications and documents as a ZIP file.
            </p>
            {data?.exportRequestedAt && (
              <p className="mt-1 text-xs text-emerald-600">
                Requested {longDate(data.exportRequestedAt)} — we will email it when it is ready.
              </p>
            )}
          </div>
          <Btn
            variant="secondary"
            onClick={() =>
              requestExport.mutate(undefined, {
                onSuccess: () => notify('Export requested. We will email you the archive.', 'success'),
                onError: () => notify('Could not request the export.', 'error'),
              })
            }
            disabled={requestExport.isPending}
          >
            <Download className="size-4" aria-hidden />
            {requestExport.isPending ? 'Requesting…' : 'Request Export'}
          </Btn>
        </CardBody>
      </Card>

      <Card className="border-red-200 dark:border-red-900">
        <CardHeader title={<span className="text-red-600">Delete Account</span>} />
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
            <p className="max-w-lg text-[13px] text-slate-600 dark:text-gray-300">
              Permanently removes your account and all data. Applications you have already made stay with the
              employers who received them. This cannot be undone.
            </p>
          </div>
          <Btn variant="danger" onClick={() => setConfirming(true)} disabled={requestDeletion.isPending}>
            Delete My Account
          </Btn>
        </CardBody>
      </Card>

      <ConfirmDialog
        isOpen={confirming}
        isLoading={requestDeletion.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={onDelete}
        title="Delete your account?"
        message="You will be signed out immediately and will not be able to sign back in. This cannot be undone."
        confirmLabel="Delete my account"
        variant="danger"
      />
    </>
  );
}
