import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ImagePlus, Save } from 'lucide-react';
import {
  EmptyState,
  PageHeader,
  PrimaryButton,
} from '@/employer/components/Cards/ui';
import { SearchableSelect } from '@/components/ui';
import {
  useCompanyMasters,
  useCompanyProfile,
  useUpdateCompanyProfile,
  useUploadCompanyLogo,
} from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';
import { cn } from '@/lib/cn';

const fieldClass =
  'mt-0.5 h-8 w-full rounded-lg border border-slate-500 bg-white px-2.5 text-xs text-slate-800 outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20 disabled:bg-slate-50';
const labelClass = 'text-[11px] font-medium text-slate-600';

function Field({
  label,
  required,
  children,
  className = '',
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn('block', className)}>
      <span className={labelClass}>
        {label}
        {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
      {hint ? <p className="mt-0.5 text-[10px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="mb-3 text-xs font-semibold text-slate-800">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

type FormState = {
  clientName: string;
  industryTypeId: string;
  website: string;
  description: string;
  cityId: string;
  address: string;
  contactNo: string;
  email: string;
  hrContactName: string;
  hrContactNo: string;
  hrEmail: string;
};

const emptyForm: FormState = {
  clientName: '',
  industryTypeId: '',
  website: '',
  description: '',
  cityId: '',
  address: '',
  contactNo: '',
  email: '',
  hrContactName: '',
  hrContactNo: '',
  hrEmail: '',
};

export function CompleteProfilePage() {
  const { data: profile, isLoading, isError, error } = useCompanyProfile();
  const { data: masters } = useCompanyMasters();
  const update = useUpdateCompanyProfile();
  const uploadLogo = useUploadCompanyLogo();
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(emptyForm);
  const [hydrated, setHydrated] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile || hydrated) return;
    setForm({
      clientName: profile.clientName ?? '',
      industryTypeId: profile.industryTypeId != null ? String(profile.industryTypeId) : '',
      website: profile.website ?? '',
      description: profile.description ?? '',
      cityId: profile.cityId != null ? String(profile.cityId) : '',
      address: profile.address ?? '',
      contactNo: profile.contactNo ?? '',
      email: profile.email ?? '',
      hrContactName: profile.hrContactName ?? '',
      hrContactNo: profile.hrContactNo ?? '',
      hrEmail: profile.hrEmail ?? '',
    });
    setHydrated(true);
  }, [profile, hydrated]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onLogoChange = async (file: File | undefined) => {
    if (!file) return;
    setMessage(null);
    setSaveError(null);
    try {
      await uploadLogo.mutateAsync(file);
      setMessage('Company logo updated.');
    } catch (err) {
      setSaveError(getErrorMessage(err, 'Failed to upload logo'));
    }
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaveError(null);
    try {
      await update.mutateAsync({
        clientName: form.clientName.trim(),
        industryTypeId: form.industryTypeId ? Number(form.industryTypeId) : undefined,
        website: form.website.trim(),
        description: form.description.trim(),
        cityId: form.cityId ? Number(form.cityId) : undefined,
        address: form.address.trim(),
        contactNo: form.contactNo.trim(),
        email: form.email.trim(),
        hrContactName: form.hrContactName.trim(),
        hrContactNo: form.hrContactNo.trim(),
        hrEmail: form.hrEmail.trim(),
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

  const busy = update.isPending || uploadLogo.isPending;
  // Public logo route — <img> cannot send Authorization; path is /api/clients/:id/logo
  const logoSrc = profile?.logoUrl
    ? `${
        profile.logoUrl.startsWith('/api/') || profile.logoUrl.startsWith('http')
          ? profile.logoUrl
          : `/api${profile.logoUrl.startsWith('/') ? profile.logoUrl : `/${profile.logoUrl}`}`
      }?v=${encodeURIComponent(profile.companyLogo || profile.clientId)}`
    : null;

  return (
    <div>
      <PageHeader
        title="Company Profile"
        subtitle="Company details shown across your employer portal and job postings."
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

      <form onSubmit={(e) => void onSubmit(e)} className="space-y-3" noValidate>
        <Section title="Company">
          <Field label="Company Name" required hint='e.g. Maruti'>
            <input
              className={fieldClass}
              required
              placeholder="e.g. Maruti"
              value={form.clientName}
              onChange={(e) => setField('clientName', e.target.value)}
            />
          </Field>

          <Field label="Industry Type" required hint="e.g. Automotive Manufacturing">
            <SearchableSelect
              options={masters?.industryTypes ?? []}
              value={form.industryTypeId || null}
              onChange={(id) => setField('industryTypeId', id)}
              placeholder="Select industry"
              searchPlaceholder="Search industry…"
              clearable
              aria-label="Industry Type"
            />
          </Field>

          <Field label="Website">
            <input
              className={fieldClass}
              type="url"
              placeholder="https://www.example.com"
              value={form.website}
              onChange={(e) => setField('website', e.target.value)}
            />
          </Field>

          <Field label="Company Logo" className="sm:col-span-2 xl:col-span-3">
            <div className="mt-0.5 flex flex-wrap items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-slate-500 bg-slate-50">
                {logoSrc ? (
                  <img src={logoSrc} alt="Company logo" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus className="h-6 w-6 text-slate-400" />
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={(e) => void onLogoChange(e.target.files?.[0])}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-500 bg-white px-3 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  {uploadLogo.isPending ? 'Uploading…' : logoSrc ? 'Change logo' : 'Upload logo'}
                </button>
                <p className="mt-1 text-[10px] text-slate-400">JPEG or PNG, up to 10 MB</p>
              </div>
            </div>
          </Field>

          <Field label="About Company" className="sm:col-span-2 xl:col-span-3">
            <textarea
              className={cn(fieldClass, 'h-auto min-h-[88px] py-1.5')}
              placeholder="Brief overview of your company…"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Company Location">
          <Field label="City" required>
            <SearchableSelect
              options={masters?.cities ?? []}
              value={form.cityId || null}
              onChange={(id) => setField('cityId', id)}
              placeholder="Select city"
              searchPlaceholder="Search city…"
              clearable
              aria-label="Company Location City"
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <input
              className={fieldClass}
              placeholder="Building, street, area, PIN"
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Contact — Company">
          <Field label="Contact Number (Company)" required>
            <input
              className={fieldClass}
              type="tel"
              placeholder="Company phone"
              value={form.contactNo}
              onChange={(e) => setField('contactNo', e.target.value)}
            />
          </Field>
          <Field label="Email ID (Company)" required>
            <input
              className={fieldClass}
              type="email"
              placeholder="hr@company.com"
              value={form.email}
              onChange={(e) => setField('email', e.target.value)}
            />
          </Field>
        </Section>

        <Section title="Contact — HR">
          <Field label="HR Name">
            <input
              className={fieldClass}
              placeholder="Hiring contact name"
              value={form.hrContactName}
              onChange={(e) => setField('hrContactName', e.target.value)}
            />
          </Field>
          <Field label="Contact Number (HR)">
            <input
              className={fieldClass}
              type="tel"
              placeholder="HR phone"
              value={form.hrContactNo}
              onChange={(e) => setField('hrContactNo', e.target.value)}
            />
          </Field>
          <Field label="Email ID (HR)">
            <input
              className={fieldClass}
              type="email"
              placeholder="recruiter@company.com"
              value={form.hrEmail}
              onChange={(e) => setField('hrEmail', e.target.value)}
            />
          </Field>
        </Section>

        <div className="flex justify-end">
          <PrimaryButton type="submit" disabled={busy}>
            <Save className="h-4 w-4" />
            {update.isPending ? 'Saving…' : 'Save changes'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}
