import { useState, type ReactNode } from 'react';
import { Copy, KeyRound, Plus, Save, Trash2 } from 'lucide-react';
import {
  EmployerBadge,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';

const TABS = [
  'Company',
  'Recruiters',
  'Security',
  'Password',
  'Notifications',
  'Email Templates',
  'Integrations',
  'API Keys',
  'Roles',
] as const;

type Tab = (typeof TABS)[number];

const fieldClass =
  'mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-sm outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20';
const labelClass = 'text-[11px] font-medium text-slate-600';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-xs font-semibold text-slate-800">{title}</h2>
      {children}
    </section>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<Tab>('Company');

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Company profile, team access, security, and integrations."
        actions={
          <PrimaryButton>
            <Save className="h-4 w-4" />
            Save Changes
          </PrimaryButton>
        }
      />

      <div className="mb-3 flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition ${
              tab === t ? 'bg-[#1A56DB] text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Company' && (
        <Card title="Company">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Company Name">
              <input className={fieldClass} defaultValue="Aajiveka Technologies" />
            </Field>
            <Field label="Industry">
              <input className={fieldClass} defaultValue="IT / Software" />
            </Field>
            <Field label="Website">
              <input className={fieldClass} defaultValue="https://aajiveka.com" />
            </Field>
            <Field label="Support Email">
              <input className={fieldClass} defaultValue="hiring@aajiveka.com" />
            </Field>
          </div>
        </Card>
      )}

      {tab === 'Recruiters' && (
        <Card title="Recruiters">
          <div className="mb-2 flex justify-end">
            <PrimaryButton className="!px-3 !py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Invite Recruiter
            </PrimaryButton>
          </div>
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {[
              { name: 'Anita Verma', email: 'anita@aajiveka.com', role: 'Admin' },
              { name: 'Rohit Sen', email: 'rohit@aajiveka.com', role: 'Recruiter' },
            ].map((r) => (
              <li key={r.email} className="flex items-center justify-between gap-2 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-slate-800">{r.name}</p>
                  <p className="text-[11px] text-slate-500">{r.email}</p>
                </div>
                <EmployerBadge tone="primary">{r.role}</EmployerBadge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tab === 'Security' && (
        <Card title="Security">
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-xs text-slate-700">Two-factor authentication</span>
              <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-[#1A56DB]" />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-xs text-slate-700">Require SSO for team members</span>
              <input type="checkbox" className="h-3.5 w-3.5 accent-[#1A56DB]" />
            </label>
            <label className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
              <span className="text-xs text-slate-700">Session timeout (30 min)</span>
              <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-[#1A56DB]" />
            </label>
          </div>
        </Card>
      )}

      {tab === 'Password' && (
        <Card title="Change Password">
          <div className="grid max-w-md gap-3 sm:grid-cols-2">
            <Field label="Current Password">
              <input className={fieldClass} type="password" />
            </Field>
            <Field label="New Password">
              <input className={fieldClass} type="password" />
            </Field>
            <Field label="Confirm New Password">
              <input className={fieldClass} type="password" />
            </Field>
            <div className="flex items-end">
              <PrimaryButton className="w-fit">
                <KeyRound className="h-4 w-4" />
                Update Password
              </PrimaryButton>
            </div>
          </div>
        </Card>
      )}

      {tab === 'Notifications' && (
        <Card title="Notification Preferences">
          <div className="space-y-2">
            {['New applications', 'Interview reminders', 'Invoice alerts', 'Weekly digest'].map((label) => (
              <label
                key={label}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
              >
                <span className="text-xs text-slate-700">{label}</span>
                <input type="checkbox" defaultChecked className="h-3.5 w-3.5 accent-[#1A56DB]" />
              </label>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Email Templates' && (
        <Card title="Email Templates">
          <div className="space-y-2">
            {[
              { name: 'Interview Invite', subject: 'Interview invitation from {{company}}' },
              { name: 'Offer Letter', subject: 'Offer of employment — {{role}}' },
              { name: 'Rejection', subject: 'Update on your application' },
            ].map((tpl) => (
              <div key={tpl.name} className="rounded-lg border border-slate-200 p-2.5">
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs font-medium text-slate-800">{tpl.name}</p>
                  <SecondaryButton className="!px-2 !py-1 text-xs">Edit</SecondaryButton>
                </div>
                <p className="text-[11px] text-slate-500">Subject: {tpl.subject}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'Integrations' && (
        <Card title="Integrations">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { name: 'Google Calendar', status: 'Connected' },
              { name: 'Slack', status: 'Not connected' },
              { name: 'LinkedIn Recruiter', status: 'Connected' },
              { name: 'Zoom', status: 'Not connected' },
            ].map((i) => (
              <div key={i.name} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div>
                  <p className="text-xs font-medium text-slate-800">{i.name}</p>
                  <EmployerBadge tone={i.status === 'Connected' ? 'success' : 'neutral'}>{i.status}</EmployerBadge>
                </div>
                <SecondaryButton className="!px-2 !py-1 text-xs">
                  {i.status === 'Connected' ? 'Manage' : 'Connect'}
                </SecondaryButton>
              </div>
            ))}
          </div>
        </Card>
      )}

      {tab === 'API Keys' && (
        <Card title="API Keys">
          <div className="mb-2 flex justify-end">
            <PrimaryButton className="!px-3 !py-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" />
              Generate Key
            </PrimaryButton>
          </div>
          <div className="rounded-lg border border-slate-200 px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-medium text-slate-800">Production</p>
                <p className="font-mono text-[11px] text-slate-500">ajk_live_••••••••••••3f9a</p>
              </div>
              <div className="flex gap-1">
                <SecondaryButton className="!px-2 !py-1 text-xs">
                  <Copy className="h-3.5 w-3.5" />
                  Copy
                </SecondaryButton>
                <SecondaryButton className="!px-2 !py-1 text-xs">
                  <Trash2 className="h-3.5 w-3.5" />
                  Revoke
                </SecondaryButton>
              </div>
            </div>
          </div>
        </Card>
      )}

      {tab === 'Roles' && (
        <Card title="Roles & Permissions">
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-1.5">Role</th>
                  <th className="px-3 py-1.5">Jobs</th>
                  <th className="px-3 py-1.5">Applicants</th>
                  <th className="px-3 py-1.5">Billing</th>
                  <th className="px-3 py-1.5">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  { role: 'Admin', jobs: 'Full', apps: 'Full', billing: 'Full', settings: 'Full' },
                  { role: 'Recruiter', jobs: 'Edit', apps: 'Full', billing: 'View', settings: 'None' },
                  { role: 'Hiring Manager', jobs: 'View', apps: 'Edit', billing: 'None', settings: 'None' },
                ].map((r) => (
                  <tr key={r.role}>
                    <td className="px-3 py-2 font-medium text-slate-800">{r.role}</td>
                    <td className="px-3 py-2 text-slate-600">{r.jobs}</td>
                    <td className="px-3 py-2 text-slate-600">{r.apps}</td>
                    <td className="px-3 py-2 text-slate-600">{r.billing}</td>
                    <td className="px-3 py-2 text-slate-600">{r.settings}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
