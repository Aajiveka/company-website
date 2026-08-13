import { useMemo, useState } from 'react';
import { useDeleteEducation, useUpsertEducation } from '../../candidate.api';
import { COURSE_MODES, type CvEditProfile, type CvEducationEntry, type CvMasters } from '../../candidate.types';
import { Field, Input, Select } from '../components/primitives';
import { dotted, labelOf } from '../format';
import { AddAnother, FieldGrid, SavedRow, StepShell, type StepProps } from './StepShell';

interface Draft {
  subscriberEducationId?: number;
  degreeId: string;
  courseTypeId: string;
  instituteName: string;
  passingYear: string;
  courseMode: string;
  marks: string;
}

const emptyDraft = (): Draft => ({
  degreeId: '',
  courseTypeId: '',
  instituteName: '',
  passingYear: '',
  courseMode: '',
  marks: '',
});

const toDraft = (e: CvEducationEntry): Draft => ({
  subscriberEducationId: e.subscriberEducationId,
  degreeId: e.degreeId ? String(e.degreeId) : '',
  courseTypeId: e.courseTypeId ? String(e.courseTypeId) : '',
  instituteName: e.instituteName,
  passingYear: e.passingYear ? String(e.passingYear) : '',
  courseMode: e.courseMode,
  marks: e.marks,
});

/**
 * Step 4 — Education (Figma 7:4302).
 *
 * The course list cascades off the chosen education level, which is how the master
 * tables relate (`MstrCourse.degreeId`), so picking "Graduation" narrows the courses
 * rather than showing every course in the system.
 */
export function EducationStep({
  cv,
  masters,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { cv: CvEditProfile; masters: CvMasters | undefined }) {
  const [draft, setDraft] = useState<Draft | null>(cv.education.length ? null : emptyDraft());
  const [error, setError] = useState<string | null>(null);

  const upsert = useUpsertEducation();
  const remove = useDeleteEducation();

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const courses = useMemo(() => {
    if (!masters?.courses) return [];
    if (!draft?.degreeId) return masters.courses;
    return masters.courses.filter((c) => c.degreeId === Number(draft.degreeId));
  }, [masters?.courses, draft?.degreeId]);

  const isBlank = (d: Draft) => !d.degreeId && !d.instituteName.trim();

  const saveDraft = async (): Promise<boolean> => {
    if (!draft || isBlank(draft)) return true;
    if (!draft.degreeId) {
      setError('Choose an education level.');
      return false;
    }
    try {
      await upsert.mutateAsync({
        subscriberEducationId: draft.subscriberEducationId,
        degreeId: Number(draft.degreeId),
        courseTypeId: draft.courseTypeId ? Number(draft.courseTypeId) : undefined,
        instituteName: draft.instituteName.trim() || undefined,
        passingYear: draft.passingYear ? Number(draft.passingYear) : undefined,
        courseMode: draft.courseMode || undefined,
        marks: draft.marks || undefined,
      });
      return true;
    } catch {
      setError('Could not save this qualification. Please try again.');
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
      number={4}
      title="Education"
      blurb="Degrees & institutions"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={upsert.isPending}
      error={error}
    >
      {cv.education.length > 0 && (
        <div className="mb-5 space-y-2">
          {cv.education.map((e) => (
            <SavedRow
              key={e.subscriberEducationId}
              title={labelOf(masters?.courses, e.courseTypeId) ?? labelOf(masters?.degrees, e.degreeId) ?? 'Education'}
              subtitle={e.instituteName}
              meta={dotted(e.passingYear ? String(e.passingYear) : null, e.courseMode || null, e.marks || null)}
              onEdit={() => setDraft(toDraft(e))}
              onDelete={() => remove.mutate(e.subscriberEducationId)}
              deleting={remove.isPending}
            />
          ))}
        </div>
      )}

      {draft ? (
        <>
          <FieldGrid cols={2}>
            <Field label="Education" htmlFor="degreeId" required>
              <Select
                id="degreeId"
                value={draft.degreeId}
                onChange={(e) => setDraft((d) => (d ? { ...d, degreeId: e.target.value, courseTypeId: '' } : d))}
              >
                <option value="">Select</option>
                {masters?.degrees.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Institution / University name" htmlFor="instituteName">
              <Input
                id="instituteName"
                placeholder="e.g. University of Pune"
                value={draft.instituteName}
                onChange={(e) => set('instituteName', e.target.value)}
              />
            </Field>

            <Field label="Course" htmlFor="courseTypeId">
              <Select id="courseTypeId" value={draft.courseTypeId} onChange={(e) => set('courseTypeId', e.target.value)}>
                <option value="">Select</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Course Type" htmlFor="courseMode">
              <Select id="courseMode" value={draft.courseMode} onChange={(e) => set('courseMode', e.target.value)}>
                <option value="">Select</option>
                {COURSE_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Passing Year" htmlFor="passingYear">
              <Input
                id="passingYear"
                inputMode="numeric"
                placeholder="2020"
                value={draft.passingYear}
                onChange={(e) => set('passingYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </Field>

            <Field label="Percentage / CGPA" htmlFor="marks">
              <Input
                id="marks"
                placeholder="e.g. 80"
                value={draft.marks}
                onChange={(e) => set('marks', e.target.value)}
              />
            </Field>
          </FieldGrid>

          <div className="mt-4">
            <AddAnother label="Add another education" onClick={addAnother} />
          </div>
        </>
      ) : (
        <AddAnother label="Add another education" onClick={() => setDraft(emptyDraft())} />
      )}
    </StepShell>
  );
}
