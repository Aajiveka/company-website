import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Save } from 'lucide-react';
import {
  EmptyState,
  PageHeader,
  PrimaryButton,
} from '@/employer/components/Cards/ui';
import { useCompanyMasters, useCompanyProfile, useUpdateCompanyProfile } from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';

const fieldClass =
  'mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-sm outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20 disabled:bg-slate-50';
const labelClass = 'text-[11px] font-medium text-slate-600';

function Field({
  label,
  children,
  className = '',
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <h2 className="mb-2 text-xs font-semibold text-slate-800">{title}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

type FormState = {
  clientName: string;
  email: string;
  contactNo: string;
  website: string;
  address: string;
  description: string;
  cityId: string;
  industryTypeId: string;
};

export function CompleteProfilePage() {
  const { data: profile, isLoading, isError, error } = useCompanyProfile();
  const { data: masters } = useCompanyMasters();
  const update = useUpdateCompanyProfile();
  const [form, setForm] = useState<FormState>({
    clientName: '',
    email: '',
    contactNo: '',
    website: '',
    address: '',
    description: '',
    cityId: '',
    industryTypeId: '',
  });
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || hydrated) return;
    setForm({
      clientName: profile.clientName ?? '',
      email: profile.email ?? '',
      contactNo: profile.contactNo ?? '',
      website: profile.website ?? '',
      address: profile.address ?? '',
      description: profile.description ?? '',
      cityId: profile.cityId != null ? String(profile.cityId) : '',
      industryTypeId: profile.industryTypeId != null ? String(profile.industryTypeId) : '',
    });
    setHydrated(true);
  }, [profile, hydrated]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaveError(null);
    try {
      await update.mutateAsync({
        clientName: form.clientName.trim(),
        email: form.email.trim(),
        contactNo: form.contactNo.trim(),
        website: form.website.trim(),
        address: form.address.trim(),
        description: form.description.trim(),
        cityId: form.cityId ? Number(form.cityId) : undefined,
        industryTypeId: form.industryTypeId ? Number(form.industryTypeId) : undefined,
      });
      setMessage('Company profile saved.');
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to save profile'));
    }
  };

  if (isLoading && !hydrated) {
    return <EmptyState title="Loading…" description="Fetching company profile." />;
  }

  if (isError && !profile) {
    return (
      <EmptyState
        title="Could not load profile"
        description={getErrorMessage(error, 'No company is linked to this login.')}
      />
    );
  }

  return (
    <div>
      <PageHeader
        title="Company Profile"
        subtitle="Update company details used across your employer portal."
      />

      {message && (
        <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-700">
          {message}
        </div>
      )}
      {saveError && (
        <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          {saveError}
        </div>
      )}

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
        <Section title="Company Information">
          <Field label="Company Name">
            <input
              className={fieldClass}
              required
              value={form.clientName}
              onChange={(e) => setField('clientName', e.target.value)}
            />
          </Field>
          <Field label="Industry">
            <select
              className={fieldClass}
              value={form.industryTypeId}
              onChange={(e) => setField('industryTypeId', e.target.value)}
            >
              <option value="">Select industry</option>
              {(masters?.industryTypes ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Website" className="sm:col-span-2 lg:col-span-1">
            <input
              className={fieldClass}
              type="url"
              placeholder="https://"
              value={form.website}
              onChange={(e) => setField('website', e.target.value)}
            />
          </Field>
          <Field label="About Company" className="sm:col-span-2 lg:col-span-3">
            <textarea
              className={`${fieldClass} h-auto min-h-[72px] py-1.5`}
              placeholder="Short company description"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Office & contact">
          <Field label="City">
            <select
              className={fieldClass}
              value={form.cityId}
              onChange={(e) => setField('cityId', e.target.value)}
            >
              <option value="">Select city</option>
              {(masters?.cities ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Work Email">
            <input
              className={fieldClass}
              type="email"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              className={fieldClass}
              type="tel"
              value={form.contactNo}
              onChange={(e) => setField('contactNo', e.target.value)}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2 lg:col-span-3">
            <input
              className={fieldClass}
              placeholder="Building, street, area"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </Field>
          {profile?.logoUrl ? (
            <Field label="Current logo" className="sm:col-span-2 lg:col-span-3">
              <img src={profile.logoUrl} alt="Company logo" className="mt-1 h-12 w-12 rounded-md object-cover" />
            </Field>
          ) : null}
        </Section>

        <div className="flex justify-end">
          <PrimaryButton type="submit" disabled={update.isPending}>
            <Save className="h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
