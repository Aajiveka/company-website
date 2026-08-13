import { useState, type ReactNode } from 'react';
import { Eye, Save, Send } from 'lucide-react';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';

const fieldClass =
  'mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-sm outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20';
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

export function CompleteProfilePage() {
  const [saved, setSaved] = useState(false);

  return (
    <div>
      <PageHeader
        title="Complete Company Profile"
        subtitle="Fill in company, office, and recruiter details to go live."
        actions={
          <>
            <SecondaryButton onClick={() => setSaved(true)}>
              <Save className="h-4 w-4" />
              Save Draft
            </SecondaryButton>
            <SecondaryButton>
              <Eye className="h-4 w-4" />
              Preview
            </SecondaryButton>
            <PrimaryButton>
              <Send className="h-4 w-4" />
              Submit
            </PrimaryButton>
          </>
        }
      />

      {saved && (
        <div className="mb-3 rounded-lg border border-[#1A56DB]/20 bg-[#EBF2FF] px-3 py-1.5 text-xs text-[#1A56DB]">
          Draft saved locally. You can continue editing anytime.
        </div>
      )}

      <div className="space-y-3">
        <Section title="Company Information">
          <Field label="Company Name">
            <input className={fieldClass} defaultValue="Aajiveka Technologies" />
          </Field>
          <Field label="Legal Entity Name">
            <input className={fieldClass} placeholder="As per registration" />
          </Field>
          <Field label="Industry">
            <select className={fieldClass} defaultValue="IT">
              <option>IT / Software</option>
              <option>BFSI</option>
              <option>Healthcare</option>
              <option>Manufacturing</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Company Size">
            <select className={fieldClass} defaultValue="51-200">
              <option>1–50</option>
              <option>51-200</option>
              <option>201–500</option>
              <option>500+</option>
            </select>
          </Field>
          <Field label="Website" className="sm:col-span-2 lg:col-span-2">
            <input className={fieldClass} type="url" placeholder="https://" />
          </Field>
          <Field label="About Company" className="sm:col-span-2 lg:col-span-3">
            <textarea className={`${fieldClass} h-auto min-h-[72px] py-1.5`} placeholder="Short company description" />
          </Field>
        </Section>

        <Section title="Office Information">
          <Field label="Headquarters City">
            <input className={fieldClass} defaultValue="Bengaluru" />
          </Field>
          <Field label="State">
            <input className={fieldClass} defaultValue="Karnataka" />
          </Field>
          <Field label="PIN Code">
            <input className={fieldClass} placeholder="560001" />
          </Field>
          <Field label="Address Line 1" className="sm:col-span-2 lg:col-span-2">
            <input className={fieldClass} placeholder="Building, street" />
          </Field>
          <Field label="Work Mode">
            <select className={fieldClass} defaultValue="Hybrid">
              <option>Onsite</option>
              <option>Hybrid</option>
              <option>Remote</option>
            </select>
          </Field>
          <Field label="Address Line 2" className="sm:col-span-2 lg:col-span-3">
            <input className={fieldClass} placeholder="Area, landmark" />
          </Field>
        </Section>

        <Section title="Recruiter Information">
          <Field label="Primary Contact Name">
            <input className={fieldClass} placeholder="Full name" />
          </Field>
          <Field label="Designation">
            <input className={fieldClass} placeholder="Talent Acquisition Lead" />
          </Field>
          <Field label="Work Email">
            <input className={fieldClass} type="email" placeholder="recruiter@company.com" />
          </Field>
          <Field label="Phone">
            <input className={fieldClass} type="tel" placeholder="+91" />
          </Field>
        </Section>

        <Section title="Documents">
          <Field label="GST Certificate">
            <input className={fieldClass} type="file" accept=".pdf,.jpg,.png" />
          </Field>
          <Field label="Company PAN">
            <input className={fieldClass} type="file" accept=".pdf,.jpg,.png" />
          </Field>
          <Field label="Incorporation Certificate">
            <input className={fieldClass} type="file" accept=".pdf" />
          </Field>
          <Field label="Company Logo">
            <input className={fieldClass} type="file" accept=".png,.jpg,.svg" />
          </Field>
        </Section>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <SecondaryButton onClick={() => setSaved(true)}>
          <Save className="h-4 w-4" />
          Save Draft
        </SecondaryButton>
        <SecondaryButton>
          <Eye className="h-4 w-4" />
          Preview
        </SecondaryButton>
        <PrimaryButton>
          <Send className="h-4 w-4" />
          Submit for Verification
        </PrimaryButton>
      </div>
    </div>
  );
}
