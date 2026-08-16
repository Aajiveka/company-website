import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useDeleteCertificate, useUpsertCertificate } from '../../candidate.api';
import type { CvCertificateEntry } from '../../candidate.types';
import { Btn, Field, Input, Select } from './primitives';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** A sensible range around now — a credential is neither ancient nor far-future. */
const YEARS = Array.from({ length: 40 }, (_, i) => new Date().getFullYear() + 2 - i);

interface Draft {
  subscriberCertificateId?: number;
  certificateName: string;
  certificateUrl: string;
  certificationId: string;
  validFromMonth: string;
  validFromYear: string;
}

const emptyDraft = (): Draft => ({
  certificateName: '',
  certificateUrl: '',
  certificationId: '',
  validFromMonth: '',
  validFromYear: '',
});

const toDraft = (c: CvCertificateEntry): Draft => ({
  subscriberCertificateId: c.subscriberCertificateId,
  certificateName: c.certificateName,
  certificateUrl: c.certificateUrl ?? '',
  certificationId: c.certificationId ?? '',
  validFromMonth: c.validFromMonth ? String(c.validFromMonth) : '',
  validFromYear: c.validFromYear ? String(c.validFromYear) : '',
});

/**
 * Certifications editor — Figma node 7:7714 ("Name *", "Issuing organization*",
 * "Credential ID", "Issue date").
 *
 * The schema stores the issuing organisation in `CertificateUrl` on the legacy row; the
 * design labels that field "Issuing organization", so it is presented that way rather than
 * adding a column that duplicates it.
 */
export function CertificationEditor({ rows }: { rows: CvCertificateEntry[] }) {
  const [draft, setDraft] = useState<Draft | null>(rows.length ? null : emptyDraft());
  const [error, setError] = useState<string | null>(null);

  const upsert = useUpsertCertificate();
  const remove = useDeleteCertificate();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = async () => {
    if (!draft) return;
    if (!draft.certificateName.trim()) {
      setError('Enter the certification name.');
      return;
    }
    setError(null);
    try {
      await upsert.mutateAsync({
        subscriberCertificateId: draft.subscriberCertificateId,
        certificateName: draft.certificateName.trim(),
        certificateUrl: draft.certificateUrl.trim() || undefined,
        certificationId: draft.certificationId.trim() || undefined,
        validFromMonth: draft.validFromMonth ? Number(draft.validFromMonth) : undefined,
        validFromYear: draft.validFromYear ? Number(draft.validFromYear) : undefined,
      });
      setDraft(null);
    } catch {
      setError('Could not save this certification. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((c) => (
            <div
              key={c.subscriberCertificateId}
              className="flex items-start justify-between gap-3 rounded-lg border border-aj-line bg-aj-surface-soft px-3.5 py-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">
                  {c.certificateName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {[c.certificateUrl, c.validFromYear ? String(c.validFromYear) : null].filter(Boolean).join(' · ') ||
                    '—'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(toDraft(c))}
                  className="text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => remove.mutate(c.subscriberCertificateId)}
                  disabled={remove.isPending}
                  aria-label={`Remove ${c.certificateName}`}
                  className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft ? (
        <div className="space-y-4 rounded-lg border border-aj-line p-4 dark:border-gray-700">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="certName" required error={error ?? undefined}>
              <Input
                id="certName"
                placeholder="e.g. full stack developer"
                value={draft.certificateName}
                onChange={(e) => set('certificateName', e.target.value)}
              />
            </Field>

            <Field label="Issuing organization" htmlFor="certOrg" required>
              <Input
                id="certOrg"
                placeholder="e.g. Amazon Web Services"
                value={draft.certificateUrl}
                onChange={(e) => set('certificateUrl', e.target.value)}
              />
            </Field>

            <Field label="Credential ID" htmlFor="certId">
              <Input
                id="certId"
                placeholder="e.g. AWS-12345"
                value={draft.certificationId}
                onChange={(e) => set('certificationId', e.target.value)}
              />
            </Field>

            <div>
              <p className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-gray-300">Issue date</p>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  aria-label="Issue month"
                  value={draft.validFromMonth}
                  onChange={(e) => set('validFromMonth', e.target.value)}
                >
                  <option value="">Month</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </Select>
                <Select
                  aria-label="Issue year"
                  value={draft.validFromYear}
                  onChange={(e) => set('validFromYear', e.target.value)}
                >
                  <option value="">Year</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Btn onClick={save} disabled={upsert.isPending}>
              {upsert.isPending ? 'Saving…' : 'Save'}
            </Btn>
            {rows.length > 0 && (
              <Btn variant="secondary" onClick={() => setDraft(null)}>
                Cancel
              </Btn>
            )}
          </div>
        </div>
      ) : (
        <Btn variant="secondary" onClick={() => setDraft(emptyDraft())}>
          Add Certifications
        </Btn>
      )}
    </div>
  );
}
