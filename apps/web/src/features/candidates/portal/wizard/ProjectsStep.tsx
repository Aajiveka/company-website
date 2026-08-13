import { useState } from 'react';
import { useDeleteProject, useUpsertProject } from '../../candidate.api';
import {
  EMPLOYMENT_TYPES,
  PROJECT_SITES,
  PROJECT_STATUSES,
  type CvEditProfile,
  type CvProjectEntry,
} from '../../candidate.types';
import { Field, Input, Select, Textarea } from '../components/primitives';
import { dotted } from '../format';
import { AddAnother, FieldGrid, SavedRow, StepShell, type StepProps } from './StepShell';

interface Draft {
  subscriberProjectId?: number;
  title: string;
  clientName: string;
  workedFrom: string;
  workedTill: string;
  projectStatus: string;
  /** Onsite / Offsite — where the work happened, which is not the same as the contract type. */
  projectSite: string;
  natureOfEmployment: string;
  teamSize: string;
  skillsUsed: string;
  details: string;
}

const emptyDraft = (): Draft => ({
  title: '',
  clientName: '',
  workedFrom: '',
  workedTill: '',
  projectStatus: '',
  projectSite: '',
  natureOfEmployment: '',
  teamSize: '',
  skillsUsed: '',
  details: '',
});

/** `YYYY-MM` for the month inputs, from the entry's month/year pair. */
const monthValue = (month: number | null, year: number | null) =>
  year ? `${year}-${String(month ?? 1).padStart(2, '0')}` : '';

const splitMonth = (value: string): { month?: number; year?: number } => {
  if (!value) return {};
  const [year, month] = value.split('-').map(Number);
  return Number.isFinite(year) ? { year, month: Number.isFinite(month) ? month : 1 } : {};
};

const toDraft = (p: CvProjectEntry): Draft => ({
  subscriberProjectId: p.subscriberProjectId,
  title: p.title,
  clientName: p.clientName,
  workedFrom: monthValue(p.workedFromMonth, p.workedFromYear),
  workedTill: monthValue(p.workedTillMonth, p.workedTillYear),
  projectStatus: p.projectStatus,
  projectSite: p.projectSite,
  natureOfEmployment: p.natureOfEmployment,
  teamSize: p.teamSize ? String(p.teamSize) : '',
  skillsUsed: p.skillsUsed.join(', '),
  details: p.details,
});

/** Step 7 — Projects (Figma 7:8408). */
export function ProjectsStep({
  cv,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { cv: CvEditProfile }) {
  const [draft, setDraft] = useState<Draft | null>(cv.projects.length ? null : emptyDraft());
  const [error, setError] = useState<string | null>(null);

  const upsert = useUpsertProject();
  const remove = useDeleteProject();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const saveDraft = async (): Promise<boolean> => {
    if (!draft || !draft.title.trim()) return true;
    const from = splitMonth(draft.workedFrom);
    const till = splitMonth(draft.workedTill);
    try {
      await upsert.mutateAsync({
        subscriberProjectId: draft.subscriberProjectId,
        title: draft.title.trim(),
        clientName: draft.clientName.trim(),
        projectStatus: draft.projectStatus,
        workedFromMonth: from.month ?? null,
        workedFromYear: from.year ?? null,
        workedTillMonth: till.month ?? null,
        workedTillYear: till.year ?? null,
        projectSite: draft.projectSite,
        natureOfEmployment: draft.natureOfEmployment,
        teamSize: draft.teamSize ? Number(draft.teamSize) : null,
        skillsUsed: draft.skillsUsed
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        details: draft.details,
      });
      return true;
    } catch {
      setError('Could not save this project. Please try again.');
      return false;
    }
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (await saveDraft()) onNext();
  };

  const addAnother = async () => {
    setError(null);
    if (await saveDraft()) setDraft(emptyDraft());
  };

  return (
    <StepShell
      number={7}
      title="Projects"
      blurb="Past & current worked"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={upsert.isPending}
      error={error}
    >
      {cv.projects.length > 0 && (
        <div className="mb-5 space-y-2">
          {cv.projects.map((p) => (
            <SavedRow
              key={p.subscriberProjectId}
              title={p.title}
              subtitle={p.clientName || null}
              meta={dotted(
                p.projectStatus || null,
                p.workedFromYear ? `${p.workedFromYear} – ${p.workedTillYear ?? 'Present'}` : null,
                p.skillsUsed.join(', ') || null,
              )}
              onEdit={() => setDraft(toDraft(p))}
              onDelete={() => remove.mutate(p.subscriberProjectId)}
              deleting={remove.isPending}
            />
          ))}
        </div>
      )}

      {draft ? (
        <>
          <FieldGrid cols={2}>
            <Field label="Project Title" htmlFor="title" required>
              <Input
                id="title"
                placeholder="e.g. HRMS"
                value={draft.title}
                onChange={(e) => set('title', e.target.value)}
              />
            </Field>

            <Field label="Client" htmlFor="clientName">
              <Input
                id="clientName"
                placeholder="e.g. Infosys Ltd"
                value={draft.clientName}
                onChange={(e) => set('clientName', e.target.value)}
              />
            </Field>

            <Field label="Worked From" htmlFor="workedFrom">
              <Input
                id="workedFrom"
                type="month"
                value={draft.workedFrom}
                onChange={(e) => set('workedFrom', e.target.value)}
              />
            </Field>

            <Field label="Worked Till" htmlFor="workedTill">
              <Input
                id="workedTill"
                type="month"
                value={draft.workedTill}
                onChange={(e) => set('workedTill', e.target.value)}
              />
            </Field>

            <Field label="Work Status" htmlFor="projectStatus">
              <Select
                id="projectStatus"
                value={draft.projectStatus}
                onChange={(e) => set('projectStatus', e.target.value)}
              >
                <option value="">Select</option>
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Project Site" htmlFor="projectSite">
              <Select
                id="projectSite"
                value={draft.projectSite}
                onChange={(e) => set('projectSite', e.target.value)}
              >
                <option value="">Select</option>
                {PROJECT_SITES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Nature of Employment" htmlFor="natureOfEmployment">
              <Select
                id="natureOfEmployment"
                value={draft.natureOfEmployment}
                onChange={(e) => set('natureOfEmployment', e.target.value)}
              >
                <option value="">Select</option>
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Team Size" htmlFor="teamSize">
              <Input
                id="teamSize"
                inputMode="numeric"
                placeholder="e.g. 5"
                value={draft.teamSize}
                onChange={(e) => set('teamSize', e.target.value.replace(/\D/g, ''))}
              />
            </Field>

            <Field label="Skills Used" htmlFor="skillsUsed">
              <Input
                id="skillsUsed"
                placeholder="Comma separated, e.g. React, Node.js"
                value={draft.skillsUsed}
                onChange={(e) => set('skillsUsed', e.target.value)}
              />
            </Field>
          </FieldGrid>

          <Field label="Project Details" htmlFor="details" className="mt-4">
            <Textarea
              id="details"
              rows={4}
              value={draft.details}
              onChange={(e) => set('details', e.target.value)}
              placeholder="Describe the problem, your role and the outcome…"
            />
          </Field>

          <div className="mt-4">
            <AddAnother label="Add another project" onClick={addAnother} />
          </div>
        </>
      ) : (
        <AddAnother label="Add another project" onClick={() => setDraft(emptyDraft())} />
      )}
    </StepShell>
  );
}
