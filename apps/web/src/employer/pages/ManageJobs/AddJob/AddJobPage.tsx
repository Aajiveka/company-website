import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Eye, FileEdit, Plus, Send, Trash2 } from 'lucide-react';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { employerPaths } from '@/employer/constants/paths';
import {
  useCompanyJob,
  useCompanyMasters,
  usePostJob,
  useUpdateJob,
} from '@/employer/services/employer.api';
import type { JobPostInput } from '@/employer/services/employer.types';
import { getErrorMessage } from '@/lib/axios';
import { JobPreviewModal, type JobPreviewData } from './JobPreviewModal';

const fieldClass =
  'mt-0.5 h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-800 shadow-sm outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20 disabled:bg-slate-50';
const labelClass = 'text-[11px] font-medium text-slate-600';

function Field({
  label,
  required,
  children,
  className = '',
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={labelClass}>
        {label}
        {required ? <span className="text-rose-600">*</span> : null}
      </span>
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

type Round = { id: number; process: string };

type FormState = {
  designationId: string;
  employmentTypeId: string;
  workModeId: string;
  cityId: string;
  industryTypeId: string;
  minExp: string;
  maxExp: string;
  minCtc: string;
  maxCtc: string;
  educationDetail: string;
  reportTo: string;
  teamSize: string;
  department: string;
  subDepartment: string;
  description: string;
};

const emptyForm: FormState = {
  designationId: '',
  employmentTypeId: '',
  workModeId: '',
  cityId: '',
  industryTypeId: '',
  minExp: '0',
  maxExp: '',
  minCtc: '0',
  maxCtc: '0',
  educationDetail: '',
  reportTo: '',
  teamSize: '',
  department: '',
  subDepartment: '',
  description: '',
};

export function AddJobPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const jobId = id && /^\d+$/.test(id) ? Number(id) : null;
  const isEdit = jobId != null;

  const { data: masters, isLoading: mastersLoading } = useCompanyMasters();
  const { data: existing, isLoading: jobLoading, isError: jobError } = useCompanyJob(jobId);
  const postJob = usePostJob();
  const updateJob = useUpdateJob(jobId ?? 0);

  const [error, setError] = useState<string | null>(null);
  const [rounds, setRounds] = useState<Round[]>([{ id: 1, process: '' }]);
  const [skillIds, setSkillIds] = useState<number[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [hydrated, setHydrated] = useState(!isEdit);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    if (!isEdit || !existing || hydrated) return;
    setForm({
      designationId: String(existing.designationId || ''),
      employmentTypeId: String(existing.employmentTypeId || ''),
      workModeId: String(existing.workModeId || ''),
      cityId: String(existing.cityId || ''),
      industryTypeId: String(existing.industryTypeId || ''),
      minExp: String(existing.minExp ?? 0),
      maxExp: existing.maxExp != null ? String(existing.maxExp) : '',
      minCtc: String(existing.minCtc ?? 0),
      maxCtc: String(existing.maxCtc ?? 0),
      educationDetail: existing.educationDetail ?? '',
      reportTo: existing.reportTo ?? '',
      teamSize: existing.teamSize != null ? String(existing.teamSize) : '',
      department: existing.department ?? '',
      subDepartment: existing.subDepartment ?? '',
      description: existing.description ?? '',
    });
    setSkillIds(existing.skillIds ?? []);
    setRounds(
      existing.interviewProcess?.length
        ? existing.interviewProcess.map((r) => ({ id: r.round, process: r.process }))
        : [{ id: 1, process: '' }],
    );
    setHydrated(true);
  }, [isEdit, existing, hydrated]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const employmentOptions = useMemo(() => masters?.employmentTypes ?? [], [masters]);
  const workModeOptions = useMemo(() => masters?.workModes ?? [], [masters]);

  const addRound = () => {
    setRounds((prev) => [...prev, { id: prev.length + 1, process: '' }]);
  };

  const removeRound = (roundId: number) => {
    setRounds((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.id !== roundId).map((r, i) => ({ ...r, id: i + 1 })),
    );
  };

  const updateRound = (roundId: number, process: string) => {
    setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, process } : r)));
  };

  const toggleSkill = (skillId: number) => {
    setSkillIds((prev) => (prev.includes(skillId) ? prev.filter((x) => x !== skillId) : [...prev, skillId]));
  };

  const masterLabel = (list: { id: number; label: string }[] | undefined, id: string) =>
    list?.find((o) => String(o.id) === id)?.label ?? '';

  const buildPayload = (asDraft: boolean): JobPostInput | null => {
    const designationId = Number(form.designationId);
    const employmentTypeId = Number(form.employmentTypeId);
    const workModeId = Number(form.workModeId);
    const cityId = Number(form.cityId);
    const industryTypeId = Number(form.industryTypeId);
    const minExp = Number(form.minExp);
    const maxExp = form.maxExp.trim() === '' ? undefined : Number(form.maxExp);
    const minCtc = Number(form.minCtc);
    const maxCtc = Number(form.maxCtc);
    const teamSize = form.teamSize.trim() === '' ? undefined : Number(form.teamSize);

    // Drafts still need FK fields (DB non-null); publish needs the full required set.
    if (!designationId || !employmentTypeId || !workModeId || !cityId) {
      setError(
        asDraft
          ? 'To save a draft, select Position, Employment type, Work mode, and Location.'
          : 'Please fill all required dropdowns (Position, Employment type, Work mode, Location, Industry).',
      );
      return null;
    }
    if (!asDraft && !industryTypeId) {
      setError('Please fill all required dropdowns (Position, Employment type, Work mode, Location, Industry).');
      return null;
    }
    if (!asDraft && !skillIds.length) {
      setError('Select at least one skill.');
      return null;
    }

    const payload: JobPostInput = {
      designationId,
      employmentTypeId,
      workModeId,
      cityId,
      industryTypeId: industryTypeId || undefined,
      minExp: Number.isNaN(minExp) ? undefined : minExp,
      maxExp: maxExp != null && !Number.isNaN(maxExp) ? maxExp : undefined,
      minCtc: Number.isNaN(minCtc) ? 0 : minCtc,
      maxCtc: Number.isNaN(maxCtc) ? 0 : maxCtc,
      description: form.description.trim(),
      educationDetail: form.educationDetail.trim() || undefined,
      reportTo: form.reportTo.trim() || undefined,
      teamSize: teamSize != null && !Number.isNaN(teamSize) ? teamSize : undefined,
      department: form.department.trim() || undefined,
      subDepartment: form.subDepartment.trim() || undefined,
      skillIds,
      interviewProcess: rounds
        .filter((r) => r.process.trim())
        .map((r) => ({ round: r.id, process: r.process.trim() })),
    };

    if (!asDraft && (!payload.description || !payload.educationDetail || !payload.department)) {
      setError('Education Detail, Department, and Job Description are required.');
      return null;
    }

    return payload;
  };

  const persist = async (asDraft: boolean) => {
    setError(null);
    const payload = buildPayload(asDraft);
    if (!payload) return;

    // Create: draft?true. Update: draft true/false only when saving/publishing draft; omit otherwise.
    const draftParam: boolean | undefined = asDraft
      ? true
      : !isEdit || existing?.status === 'Draft'
        ? false
        : undefined;

    try {
      if (isEdit && jobId) {
        await updateJob.mutateAsync({
          data: payload,
          ...(draftParam !== undefined ? { draft: draftParam } : {}),
        });
      } else {
        await postJob.mutateAsync({
          data: payload,
          ...(draftParam === true ? { draft: true } : {}),
        });
      }
      navigate(asDraft ? employerPaths.draftJobs : employerPaths.jobList);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          asDraft ? 'Failed to save draft' : isEdit ? 'Failed to update job' : 'Failed to publish job',
        ),
      );
    }
  };

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await persist(false);
  };

  const saveDraft = async () => {
    await persist(true);
  };

  const previewData: JobPreviewData = useMemo(
    () => ({
      designation: masterLabel(masters?.designations, form.designationId) || 'Untitled position',
      employmentType: masterLabel(masters?.employmentTypes, form.employmentTypeId),
      workMode: masterLabel(masters?.workModes, form.workModeId),
      city: masterLabel(masters?.cities, form.cityId),
      industryType: masterLabel(masters?.industryTypes, form.industryTypeId),
      minExp: form.minExp,
      maxExp: form.maxExp,
      minCtc: form.minCtc,
      maxCtc: form.maxCtc,
      educationDetail: form.educationDetail,
      reportTo: form.reportTo,
      teamSize: form.teamSize,
      department: form.department,
      subDepartment: form.subDepartment,
      description: form.description,
      skills: (masters?.skills ?? []).filter((s) => skillIds.includes(s.id)).map((s) => s.label),
      interviewRounds: rounds.filter((r) => r.process.trim()).map((r) => ({ round: r.id, process: r.process.trim() })),
    }),
    [masters, form, skillIds, rounds],
  );

  const saving = postJob.isPending || updateJob.isPending;
  const loadingForm = mastersLoading || (isEdit && (jobLoading || !hydrated));
  const isExistingDraft = existing?.status === 'Draft';

  return (
    <div>
      <PageHeader
        title={isEdit ? 'Edit Job' : 'Post a New Job'}
        subtitle={
          isEdit
            ? isExistingDraft
              ? 'Update this draft, or publish when ready.'
              : 'Update fields and save changes to this posting.'
            : 'Preview anytime. Save as draft to finish later, or publish as Active.'
        }
      />

      {isEdit && jobError && (
        <p className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          Could not load this job. It may have been deleted or you do not have access.
        </p>
      )}

      <form onSubmit={submit} className="space-y-3">
        <Section title="Job details">
          <Field label="Position" required className="sm:col-span-2 lg:col-span-3">
            <select
              className={fieldClass}
              required
              disabled={loadingForm}
              value={form.designationId}
              onChange={(e) => setField('designationId', e.target.value)}
            >
              <option value="" disabled>
                Select position
              </option>
              {(masters?.designations ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employment type" required>
            <select
              className={fieldClass}
              required
              disabled={loadingForm}
              value={form.employmentTypeId}
              onChange={(e) => setField('employmentTypeId', e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              {employmentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Experience (min yrs)" required>
            <input
              className={fieldClass}
              type="number"
              min={0}
              required
              disabled={loadingForm}
              value={form.minExp}
              onChange={(e) => setField('minExp', e.target.value)}
            />
          </Field>

          <Field label="Experience (max yrs)">
            <input
              className={fieldClass}
              type="number"
              min={0}
              placeholder="e.g. 5"
              disabled={loadingForm}
              value={form.maxExp}
              onChange={(e) => setField('maxExp', e.target.value)}
            />
          </Field>

          <Field label="Work mode" required>
            <select
              className={fieldClass}
              required
              disabled={loadingForm}
              value={form.workModeId}
              onChange={(e) => setField('workModeId', e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              {workModeOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="CTC (min)">
            <input
              className={fieldClass}
              type="number"
              min={0}
              placeholder="e.g. 600000"
              disabled={loadingForm}
              value={form.minCtc}
              onChange={(e) => setField('minCtc', e.target.value)}
            />
          </Field>

          <Field label="CTC (max)">
            <input
              className={fieldClass}
              type="number"
              min={0}
              placeholder="e.g. 1200000"
              disabled={loadingForm}
              value={form.maxCtc}
              onChange={(e) => setField('maxCtc', e.target.value)}
            />
          </Field>

          <Field label="Education Detail" required className="sm:col-span-2 lg:col-span-3">
            <input
              className={fieldClass}
              placeholder="e.g. B.Tech / MCA / Equivalent"
              required
              disabled={loadingForm}
              value={form.educationDetail}
              onChange={(e) => setField('educationDetail', e.target.value)}
            />
          </Field>

          <Field label="Report to">
            <input
              className={fieldClass}
              placeholder="Reporting manager / role"
              disabled={loadingForm}
              value={form.reportTo}
              onChange={(e) => setField('reportTo', e.target.value)}
            />
          </Field>

          <Field label="Team size">
            <input
              className={fieldClass}
              type="number"
              min={1}
              placeholder="e.g. 8"
              disabled={loadingForm}
              value={form.teamSize}
              onChange={(e) => setField('teamSize', e.target.value)}
            />
          </Field>

          <Field label="Industry type" required>
            <select
              className={fieldClass}
              required
              disabled={loadingForm}
              value={form.industryTypeId}
              onChange={(e) => setField('industryTypeId', e.target.value)}
            >
              <option value="" disabled>
                Select
              </option>
              {(masters?.industryTypes ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Department" required>
            <input
              className={fieldClass}
              placeholder="e.g. Engineering"
              required
              disabled={loadingForm}
              value={form.department}
              onChange={(e) => setField('department', e.target.value)}
            />
          </Field>

          <Field label="Sub-Department">
            <input
              className={fieldClass}
              placeholder="e.g. Frontend"
              disabled={loadingForm}
              value={form.subDepartment}
              onChange={(e) => setField('subDepartment', e.target.value)}
            />
          </Field>

          <Field label="Skills" required className="sm:col-span-2 lg:col-span-3">
            <div className="mt-0.5 max-h-36 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
              <div className="flex flex-wrap gap-1.5">
                {(masters?.skills ?? []).slice(0, 80).map((s) => {
                  const on = skillIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={loadingForm}
                      onClick={() => toggleSkill(s.id)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium transition ${
                        on ? 'bg-[#1A56DB] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
              {!masters?.skills?.length && (
                <p className="text-[11px] text-slate-400">{mastersLoading ? 'Loading skills…' : 'No skills found'}</p>
              )}
            </div>
            <p className="mt-1 text-[11px] text-slate-400">{skillIds.length} selected</p>
          </Field>

          <Field label="Job Description" required className="sm:col-span-2 lg:col-span-3">
            <textarea
              className={`${fieldClass} h-auto min-h-[96px] py-1.5`}
              placeholder="Role overview, responsibilities…"
              required
              disabled={loadingForm}
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
            />
          </Field>

          <Field label="Location" required className="sm:col-span-2 lg:col-span-3">
            <select
              className={fieldClass}
              required
              disabled={loadingForm}
              value={form.cityId}
              onChange={(e) => setField('cityId', e.target.value)}
            >
              <option value="" disabled>
                Select city
              </option>
              {(masters?.cities ?? []).map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>

        <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-xs font-semibold text-slate-800">Interview process</h2>
            <SecondaryButton type="button" onClick={addRound} disabled={loadingForm}>
              <Plus className="h-3.5 w-3.5" />
              Add round
            </SecondaryButton>
          </div>

          <div className="space-y-2">
            {rounds.map((round) => (
              <div key={round.id} className="grid gap-2 sm:grid-cols-[7rem_1fr_auto] sm:items-end">
                <Field label="Interview round">
                  <input className={fieldClass} value={round.id} readOnly />
                </Field>
                <Field label={`Interview Process (Round ${round.id})`}>
                  <input
                    className={fieldClass}
                    placeholder={`e.g. Round ${round.id} — HR / Technical / Manager`}
                    value={round.process}
                    disabled={loadingForm}
                    onChange={(e) => updateRound(round.id, e.target.value)}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeRound(round.id)}
                  disabled={rounds.length <= 1 || loadingForm}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove round ${round.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {error && (
          <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <SecondaryButton type="button" onClick={() => navigate(employerPaths.jobList)}>
            Cancel
          </SecondaryButton>
          <SecondaryButton type="button" disabled={loadingForm} onClick={() => setPreviewOpen(true)}>
            <Eye className="h-4 w-4" />
            Preview
          </SecondaryButton>
          <SecondaryButton
            type="button"
            disabled={saving || loadingForm || (isEdit && jobError)}
            onClick={() => void saveDraft()}
          >
            <FileEdit className="h-4 w-4" />
            {saving ? 'Saving…' : 'Save Draft'}
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || loadingForm || (isEdit && jobError)}>
            <Send className="h-4 w-4" />
            {saving
              ? isEdit
                ? 'Saving…'
                : 'Publishing…'
              : isEdit && !isExistingDraft
                ? 'Save Changes'
                : 'Publish Job'}
          </PrimaryButton>
        </div>
      </form>

      <JobPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={previewData}
        draftPreview={isExistingDraft || !isEdit}
      />
    </div>
  );
}
