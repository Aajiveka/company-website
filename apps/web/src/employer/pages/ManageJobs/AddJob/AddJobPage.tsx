import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Eye, FileEdit, Plus, Send, Trash2 } from 'lucide-react';
import {
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { SearchableSelect, SkillTagInput, type SkillTagOption } from '@/components/ui';
import { cn } from '@/lib/cn';
import { employerPaths } from '@/employer/constants/paths';
import {
  useCompanyJob,
  useCompanyMasters,
  usePostJob,
  useUpdateJob,
} from '@/employer/services/employer.api';
import type { JobPostInput, InterviewMode } from '@/employer/services/employer.types';
import { INTERVIEW_MODE_OPTIONS } from '@/employer/services/employer.types';
import { getErrorMessage } from '@/lib/axios';
import { JobPreviewModal, type JobPreviewData } from './JobPreviewModal';

const DESC_MAX = 1000;

const fieldClass =
  'mt-0.5 h-8 w-full rounded-lg border border-slate-500 bg-white px-2.5 text-xs text-slate-800 outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20 disabled:bg-slate-50';
const fieldErrorClass =
  'border-rose-500 focus:border-rose-500 focus:ring-rose-500/20';
const labelClass = 'text-[11px] font-medium text-slate-600';

type FieldKey =
  | 'designationId'
  | 'employmentTypeId'
  | 'workModeId'
  | 'minExp'
  | 'cityId'
  | 'educationDetail'
  | 'industryTypeId'
  | 'department'
  | 'skills'
  | 'description';

const FIELD_ORDER: FieldKey[] = [
  'designationId',
  'employmentTypeId',
  'workModeId',
  'minExp',
  'cityId',
  'educationDetail',
  'industryTypeId',
  'department',
  'skills',
  'description',
];

function Field({
  label,
  required,
  children,
  className = '',
  invalid,
  fieldKey,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  invalid?: boolean;
  fieldKey?: FieldKey;
}) {
  return (
    <div className={cn('block', className)} data-field={fieldKey}>
      <span className={cn(labelClass, invalid && 'text-rose-600')}>
        {label}
        {required ? <span className="text-rose-600">*</span> : null}
      </span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
      <h2 className="mb-3 text-xs font-semibold text-slate-800">{title}</h2>
      {/* 1 col mobile → 2 tablet → 3 desktop; page shell caps width on ultra-wide monitors */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

type Round = { id: number; process: string; mode: InterviewMode | '' };

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
  const { pathname } = useLocation();
  return <AddJobBody key={pathname} />;
}

function AddJobBody() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const fromPath = location.pathname.match(/\/company\/jobs\/(\d+)\/edit$/);
  const jobId = fromPath
    ? Number(fromPath[1])
    : params.id && /^\d+$/.test(params.id)
      ? Number(params.id)
      : null;
  const isEdit = jobId != null;

  const { data: masters, isLoading: mastersLoading } = useCompanyMasters();
  const { data: existing, isLoading: jobLoading, isError: jobError } = useCompanyJob(jobId);
  const postJob = usePostJob();
  const updateJob = useUpdateJob(jobId ?? 0);

  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [rounds, setRounds] = useState<Round[]>([{ id: 1, process: '', mode: '' }]);
  const [selectedSkills, setSelectedSkills] = useState<SkillTagOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [hydrated, setHydrated] = useState(!isEdit);
  const [previewOpen, setPreviewOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!isEdit || !existing || hydrated) return;
    const labels = existing.skills ?? [];
    const ids = existing.skillIds ?? [];
    if (!labels.length && ids.length && !masters?.skills?.length) return;

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
      description: (existing.description ?? '').slice(0, DESC_MAX),
    });
    setSelectedSkills(
      labels.length
        ? labels.map((label, i) => ({ id: ids[i], label }))
        : ids.map((id) => {
            const fromMaster = masters?.skills?.find((s) => s.id === id);
            return { id, label: fromMaster?.label ?? `Skill #${id}` };
          }),
    );
    setRounds(
      existing.interviewProcess?.length
        ? existing.interviewProcess.map((r) => ({
            id: r.round,
            process: r.process,
            mode: (INTERVIEW_MODE_OPTIONS.some((o) => o.id === r.mode) ? r.mode : '') as InterviewMode | '',
          }))
        : [{ id: 1, process: '', mode: '' }],
    );
    setHydrated(true);
  }, [isEdit, existing, hydrated, masters?.skills]);

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if ((FIELD_ORDER as string[]).includes(key as string)) {
      clearFieldError(key as FieldKey);
    }
  };

  const employmentOptions = useMemo(() => masters?.employmentTypes ?? [], [masters]);
  const workModeOptions = useMemo(() => masters?.workModes ?? [], [masters]);

  const addRound = () => {
    setRounds((prev) => [...prev, { id: prev.length + 1, process: '', mode: '' }]);
  };

  const removeRound = (roundId: number) => {
    setRounds((prev) =>
      prev.length <= 1
        ? prev
        : prev.filter((r) => r.id !== roundId).map((r, i) => ({ ...r, id: i + 1 })),
    );
  };

  const updateRound = (roundId: number, patch: Partial<Pick<Round, 'process' | 'mode'>>) => {
    setRounds((prev) => prev.map((r) => (r.id === roundId ? { ...r, ...patch } : r)));
  };

  const onSkillsChange = (next: SkillTagOption[]) => {
    setSelectedSkills(next);
    if (next.length) clearFieldError('skills');
  };

  const masterLabel = (list: { id: number; label: string }[] | undefined, id: string) =>
    list?.find((o) => String(o.id) === id)?.label ?? '';

  const scrollToFirstError = (errors: Partial<Record<FieldKey, boolean>>) => {
    const first = FIELD_ORDER.find((k) => errors[k]);
    if (!first) return;
    window.requestAnimationFrame(() => {
      const el = formRef.current?.querySelector(`[data-field="${first}"]`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const collectPublishErrors = (): Partial<Record<FieldKey, boolean>> => {
    const errors: Partial<Record<FieldKey, boolean>> = {};
    if (!Number(form.designationId)) errors.designationId = true;
    if (!Number(form.employmentTypeId)) errors.employmentTypeId = true;
    if (!Number(form.workModeId)) errors.workModeId = true;
    if (form.minExp.trim() === '' || Number.isNaN(Number(form.minExp))) errors.minExp = true;
    if (!Number(form.cityId)) errors.cityId = true;
    if (!form.educationDetail.trim()) errors.educationDetail = true;
    if (!Number(form.industryTypeId)) errors.industryTypeId = true;
    if (!form.department.trim()) errors.department = true;
    if (!selectedSkills.length) errors.skills = true;
    if (!form.description.trim()) errors.description = true;
    return errors;
  };

  const collectDraftErrors = (): Partial<Record<FieldKey, boolean>> => {
    const errors: Partial<Record<FieldKey, boolean>> = {};
    if (!Number(form.designationId)) errors.designationId = true;
    if (!Number(form.employmentTypeId)) errors.employmentTypeId = true;
    if (!Number(form.workModeId)) errors.workModeId = true;
    if (!Number(form.cityId)) errors.cityId = true;
    return errors;
  };

  const buildPayload = (asDraft: boolean): JobPostInput | null => {
    const errors = asDraft ? collectDraftErrors() : collectPublishErrors();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      setError(
        asDraft
          ? 'To save a draft, select Position, Employment type, Work mode, and Location.'
          : 'Please fill the highlighted required fields.',
      );
      scrollToFirstError(errors);
      return null;
    }
    setFieldErrors({});

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

    return {
      designationId,
      employmentTypeId,
      workModeId,
      cityId,
      industryTypeId: industryTypeId || undefined,
      minExp: Number.isNaN(minExp) ? undefined : minExp,
      maxExp: maxExp != null && !Number.isNaN(maxExp) ? maxExp : undefined,
      minCtc: Number.isNaN(minCtc) ? 0 : minCtc,
      maxCtc: Number.isNaN(maxCtc) ? 0 : maxCtc,
      description: form.description.trim().slice(0, DESC_MAX),
      educationDetail: form.educationDetail.trim() || undefined,
      reportTo: form.reportTo.trim() || undefined,
      teamSize: teamSize != null && !Number.isNaN(teamSize) ? teamSize : undefined,
      department: form.department.trim() || undefined,
      subDepartment: form.subDepartment.trim() || undefined,
      skills: selectedSkills.map((s) => s.label.trim()).filter(Boolean),
      interviewProcess: rounds
        .filter((r) => r.process.trim() || r.mode)
        .map((r) => ({
          round: r.id,
          process: r.process.trim(),
          ...(r.mode ? { mode: r.mode } : {}),
        })),
    };
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
      skills: selectedSkills.map((s) => s.label),
      interviewRounds: rounds
        .filter((r) => r.process.trim() || r.mode)
        .map((r) => ({ round: r.id, process: r.process.trim(), ...(r.mode ? { mode: r.mode } : {}) })),
    }),
    [masters, form, selectedSkills, rounds],
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

      <form ref={formRef} onSubmit={submit} noValidate className="space-y-3">
        <Section title="Job details">
          <Field label="Position" required fieldKey="designationId" invalid={!!fieldErrors.designationId}>
            <SearchableSelect
              required
              disabled={loadingForm}
              invalid={!!fieldErrors.designationId}
              options={masters?.designations ?? []}
              value={form.designationId || null}
              onChange={(id) => setField('designationId', id)}
              placeholder="Select position"
              searchPlaceholder="Search position…"
              aria-label="Position"
            />
          </Field>

          <Field label="Employment type" required fieldKey="employmentTypeId" invalid={!!fieldErrors.employmentTypeId}>
            <SearchableSelect
              required
              disabled={loadingForm}
              invalid={!!fieldErrors.employmentTypeId}
              options={employmentOptions}
              value={form.employmentTypeId || null}
              onChange={(id) => setField('employmentTypeId', id)}
              placeholder="Select"
              searchPlaceholder="Search employment type…"
              aria-label="Employment type"
            />
          </Field>

          <Field label="Work mode" required fieldKey="workModeId" invalid={!!fieldErrors.workModeId}>
            <SearchableSelect
              required
              disabled={loadingForm}
              invalid={!!fieldErrors.workModeId}
              options={workModeOptions}
              value={form.workModeId || null}
              onChange={(id) => setField('workModeId', id)}
              placeholder="Select"
              searchPlaceholder="Search work mode…"
              aria-label="Work mode"
            />
          </Field>

          <Field label="Experience (min yrs)" required fieldKey="minExp" invalid={!!fieldErrors.minExp}>
            <input
              className={cn(fieldClass, fieldErrors.minExp && fieldErrorClass)}
              type="number"
              min={0}
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

          <Field label="Location" required fieldKey="cityId" invalid={!!fieldErrors.cityId}>
            <SearchableSelect
              required
              disabled={loadingForm}
              invalid={!!fieldErrors.cityId}
              options={masters?.cities ?? []}
              value={form.cityId || null}
              onChange={(id) => setField('cityId', id)}
              placeholder="Select city"
              searchPlaceholder="Search city…"
              aria-label="Location"
            />
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

          <Field label="Education Detail" required fieldKey="educationDetail" invalid={!!fieldErrors.educationDetail}>
            <input
              className={cn(fieldClass, fieldErrors.educationDetail && fieldErrorClass)}
              placeholder="e.g. B.Tech / MCA / Equivalent"
              disabled={loadingForm}
              value={form.educationDetail}
              onChange={(e) => setField('educationDetail', e.target.value)}
            />
          </Field>

          <Field label="Industry type" required fieldKey="industryTypeId" invalid={!!fieldErrors.industryTypeId}>
            <SearchableSelect
              required
              disabled={loadingForm}
              invalid={!!fieldErrors.industryTypeId}
              options={masters?.industryTypes ?? []}
              value={form.industryTypeId || null}
              onChange={(id) => setField('industryTypeId', id)}
              placeholder="Select"
              searchPlaceholder="Search industry…"
              aria-label="Industry type"
            />
          </Field>

          <Field label="Department" required fieldKey="department" invalid={!!fieldErrors.department}>
            <input
              className={cn(fieldClass, fieldErrors.department && fieldErrorClass)}
              placeholder="e.g. Engineering"
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

          <Field label="Skills" required className="sm:col-span-2 xl:col-span-3" fieldKey="skills" invalid={!!fieldErrors.skills}>
            <SkillTagInput
              options={masters?.skills ?? []}
              value={selectedSkills}
              onChange={onSkillsChange}
              disabled={loadingForm}
              invalid={!!fieldErrors.skills}
              placeholder={mastersLoading ? 'Loading skills…' : 'Type to search or add a skill…'}
              suggestCount={5}
            />
            <p className={cn('mt-1 text-[11px]', fieldErrors.skills ? 'text-rose-600' : 'text-slate-400')}>
              {selectedSkills.length
                ? `${selectedSkills.length} selected — click × to remove`
                : fieldErrors.skills
                  ? 'Add at least one skill'
                  : 'Focus for suggestions, or type a new skill and press Enter'}
            </p>
          </Field>

          <Field
            label="Job Description"
            required
            className="sm:col-span-2 xl:col-span-3"
            fieldKey="description"
            invalid={!!fieldErrors.description}
          >
            <textarea
              className={cn(fieldClass, 'h-auto min-h-[96px] py-1.5', fieldErrors.description && fieldErrorClass)}
              placeholder="Role overview, responsibilities…"
              disabled={loadingForm}
              maxLength={DESC_MAX}
              value={form.description}
              onChange={(e) => setField('description', e.target.value.slice(0, DESC_MAX))}
            />
            <p
              className={cn(
                'mt-1 text-right text-[11px]',
                form.description.length >= DESC_MAX ? 'text-rose-600' : 'text-slate-400',
              )}
            >
              {form.description.length}/{DESC_MAX}
            </p>
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
              <div
                key={round.id}
                className="grid gap-2 sm:grid-cols-[6.5rem_minmax(0,1fr)_minmax(9rem,11rem)_auto] sm:items-end"
              >
                <Field label="Interview round">
                  <input className={fieldClass} value={round.id} readOnly />
                </Field>
                <Field label="Interview process">
                  <input
                    className={fieldClass}
                    placeholder={`e.g. HR screen / Technical / Hiring manager`}
                    value={round.process}
                    disabled={loadingForm}
                    onChange={(e) => updateRound(round.id, { process: e.target.value })}
                  />
                </Field>
                <Field label="Interview mode">
                  <select
                    className={fieldClass}
                    disabled={loadingForm}
                    value={round.mode}
                    onChange={(e) =>
                      updateRound(round.id, { mode: e.target.value as InterviewMode | '' })
                    }
                    aria-label={`Interview mode for round ${round.id}`}
                  >
                    <option value="">Select mode…</option>
                    {INTERVIEW_MODE_OPTIONS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))}
                  </select>
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
