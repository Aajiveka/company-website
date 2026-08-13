import { useState } from 'react';
import { useDeleteEmployment, useUpsertEmployment } from '../../candidate.api';
import type { CvEditProfile, CvEmploymentEntry, CvMasters } from '../../candidate.types';
import { Field, Input, Select, Textarea } from '../components/primitives';
import { dotted, duration, labelOf, monthYear } from '../format';
import { AddAnother, FieldGrid, SavedRow, StepShell, type StepProps } from './StepShell';

/** A blank draft row. `id` absent means "create" when saved. */
interface Draft {
  subscriberEmployerId?: number;
  employer: string;
  designationId: string;
  employeeTypeId: string;
  joiningDate: string;
  releavingDate: string;
  flgCurrent: boolean;
  jobDescr: string;
}

const emptyDraft = (): Draft => ({
  employer: '',
  designationId: '',
  employeeTypeId: '',
  joiningDate: '',
  releavingDate: '',
  flgCurrent: false,
  jobDescr: '',
});

const toDraft = (e: CvEmploymentEntry): Draft => ({
  subscriberEmployerId: e.subscriberEmployerId,
  employer: e.employer,
  designationId: e.designationId ? String(e.designationId) : '',
  employeeTypeId: e.employeeTypeId ? String(e.employeeTypeId) : '',
  joiningDate: e.joiningDate ? e.joiningDate.slice(0, 10) : '',
  releavingDate: e.releavingDate ? e.releavingDate.slice(0, 10) : '',
  flgCurrent: e.flgCurrent,
  jobDescr: e.jobDescr,
});

/**
 * Step 3 — Work Experience (Figma 7:4119).
 *
 * Rows already saved are listed above an editor for the row being added or changed,
 * so "Add another role" never loses what is on screen. Each row is its own PUT, which
 * is what the API models.
 */
export function ExperienceStep({
  cv,
  masters,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { cv: CvEditProfile; masters: CvMasters | undefined }) {
  const [draft, setDraft] = useState<Draft | null>(cv.employment.length ? null : emptyDraft());
  const [error, setError] = useState<string | null>(null);

  const upsert = useUpsertEmployment();
  const remove = useDeleteEmployment();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  /** An editor the candidate never touched counts as "nothing more to add". */
  const isBlank = (d: Draft) => !d.employer.trim() && !d.jobDescr.trim() && !d.joiningDate;

  /** Persists the open editor. Returns false when it could not be saved. */
  const saveDraft = async (): Promise<boolean> => {
    if (!draft || isBlank(draft)) return true;
    if (!draft.employer.trim()) {
      setError('Enter the company name.');
      return false;
    }
    try {
      await upsert.mutateAsync({
        subscriberEmployerId: draft.subscriberEmployerId,
        employer: draft.employer.trim(),
        designationId: draft.designationId ? Number(draft.designationId) : undefined,
        employeeTypeId: draft.employeeTypeId ? Number(draft.employeeTypeId) : undefined,
        joiningDate: draft.joiningDate || undefined,
        releavingDate: draft.flgCurrent ? undefined : draft.releavingDate || undefined,
        flgCurrent: draft.flgCurrent,
        jobDescr: draft.jobDescr || undefined,
      });
      return true;
    } catch {
      setError('Could not save this role. Please try again.');
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (await saveDraft()) onNext();
  };

  /** Commits what is on screen before clearing the editor, so nothing is silently lost. */
  const addAnother = async () => {
    setError(null);
    if (await saveDraft()) setDraft(emptyDraft());
  };

  return (
    <StepShell
      number={3}
      title="Work Experience"
      blurb="Past & current roles"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={upsert.isPending}
      error={error}
    >
      {cv.employment.length > 0 && (
        <div className="mb-5 space-y-2">
          {cv.employment.map((e) => (
            <SavedRow
              key={e.subscriberEmployerId}
              title={labelOf(masters?.designations, e.designationId) ?? 'Role'}
              subtitle={e.employer}
              meta={dotted(
                [monthYear(e.joiningDate), e.flgCurrent ? 'Present' : monthYear(e.releavingDate)]
                  .filter(Boolean)
                  .join(' – ') || null,
                duration(e.joiningDate, e.flgCurrent ? null : e.releavingDate),
              )}
              onEdit={() => setDraft(toDraft(e))}
              onDelete={() => remove.mutate(e.subscriberEmployerId)}
              deleting={remove.isPending}
            />
          ))}
        </div>
      )}

      {draft ? (
        <>
          <FieldGrid cols={2}>
            <Field label="Job Title" htmlFor="designationId">
              <Select
                id="designationId"
                value={draft.designationId}
                onChange={(e) => set('designationId', e.target.value)}
              >
                <option value="">Select</option>
                {masters?.designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Company" htmlFor="employer" required>
              <Input
                id="employer"
                placeholder="e.g. Infosys Ltd"
                value={draft.employer}
                onChange={(e) => set('employer', e.target.value)}
              />
            </Field>

            <Field label="Joining Date" htmlFor="joiningDate">
              <Input
                id="joiningDate"
                type="date"
                value={draft.joiningDate}
                onChange={(e) => set('joiningDate', e.target.value)}
              />
            </Field>

            <Field label="Leaving Date" htmlFor="releavingDate" hint={draft.flgCurrent ? 'Currently working here' : undefined}>
              <Input
                id="releavingDate"
                type="date"
                value={draft.releavingDate}
                disabled={draft.flgCurrent}
                onChange={(e) => set('releavingDate', e.target.value)}
              />
            </Field>

            <Field label="Employment Type" htmlFor="employeeTypeId">
              <Select
                id="employeeTypeId"
                value={draft.employeeTypeId}
                onChange={(e) => set('employeeTypeId', e.target.value)}
              >
                <option value="">Select</option>
                {masters?.employmentTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex items-end">
              <label className="mb-2.5 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={draft.flgCurrent}
                  onChange={(e) => set('flgCurrent', e.target.checked)}
                  className="size-4 rounded border-aj-line text-aj-blue focus:ring-aj-ring"
                />
                I currently work here
              </label>
            </div>
          </FieldGrid>

          <Field label="Key Achievements / Description" htmlFor="jobDescr" className="mt-4">
            <Textarea
              id="jobDescr"
              rows={4}
              value={draft.jobDescr}
              onChange={(e) => set('jobDescr', e.target.value)}
              placeholder="Describe your impact, technologies used, and key achievements…"
            />
          </Field>

          <div className="mt-4">
            <AddAnother label="Add another role" onClick={addAnother} />
          </div>
        </>
      ) : (
        <AddAnother label="Add another role" onClick={() => setDraft(emptyDraft())} />
      )}
    </StepShell>
  );
}
