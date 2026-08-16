import { useMemo, useState } from 'react';
import { useDebounce } from '@/hooks/useDebounce';
import { useDeleteEducation, useInstituteSearch, useUpsertEducation } from '../../candidate.api';
import {
  COURSE_MODES,
  DEGREE_CATEGORIES,
  type CvEditProfile,
  type CvEducationEntry,
  type CvMasters,
} from '../../candidate.types';
import { Combobox } from '../components/Combobox';
import { Field, Input, Select } from '../components/primitives';
import { dotted, educationTitle, labelOf, years } from '../format';
import { AddAnother, FieldGrid, SavedRow, StepShell, type StepProps } from './StepShell';
import { educationDraftSchema, type EducationErrors } from './validation';

interface Draft {
  subscriberEducationId?: number;
  degreeId: string;
  courseTypeId: string;
  instituteName: string;
  startYear: string;
  passingYear: string;
  specialization: string;
  courseMode: string;
  marks: string;
}

const emptyDraft = (): Draft => ({
  degreeId: '',
  courseTypeId: '',
  instituteName: '',
  startYear: '',
  passingYear: '',
  specialization: '',
  courseMode: '',
  marks: '',
});

const toDraft = (e: CvEducationEntry): Draft => ({
  subscriberEducationId: e.subscriberEducationId,
  degreeId: e.degreeId ? String(e.degreeId) : '',
  courseTypeId: e.courseTypeId ? String(e.courseTypeId) : '',
  instituteName: e.instituteName,
  startYear: e.startYear ? String(e.startYear) : '',
  passingYear: e.passingYear ? String(e.passingYear) : '',
  specialization: e.specialization ?? '',
  courseMode: e.courseMode,
  marks: e.marks,
});

/**
 * Step 4 — Education (Figma 7:4302).
 *
 * Three cascades meet on this step:
 *
 *   qualification -> course   The Course list is filtered by the chosen qualification, which is
 *                             how the master tables relate (MstrCourse.EducationTypeID). Picking
 *                             B.Tech narrows Course to engineering branches; picking MBBS gives
 *                             medical courses rather than the whole catalogue.
 *   location -> institution   The candidate's profile city gives a state, and the institution
 *                             search sorts that state's institutions first. It never restricts:
 *                             plenty of people work in one state and studied in another.
 *   free text always wins     The institution field saves whatever is typed. No list of Indian
 *                             institutions is complete, and blocking an unlisted-but-real
 *                             college would be a worse failure than an occasional odd spelling.
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
  const [errors, setErrors] = useState<EducationErrors>({});

  const upsert = useUpsertEducation();
  const remove = useDeleteEducation();

  // Keyed on the editable fields only — `subscriberEducationId` is carried, never typed into.
  const set = <K extends keyof EducationErrors>(key: K, value: string) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
    // Clear this field's message as soon as it is edited; leaving it up while the candidate
    // fixes it reads as though the fix did not take.
    setErrors((e) => (e[key] ? { ...e, [key]: undefined } : e));
  };

  /* -- location -------------------------------------------------------- */

  // The candidate's state, via the city on their profile. `personal.cityId` is set on step 1,
  // so by the time anyone reaches step 4 it is usually there; when it is not, the search simply
  // falls back to a nationwide list rather than showing nothing.
  const stateId = useMemo(() => {
    const cityId = cv.personal?.cityId;
    if (!cityId) return null;
    return masters?.cities.find((c) => c.id === cityId)?.stateId ?? null;
  }, [cv.personal?.cityId, masters?.cities]);

  const instituteQuery = useDebounce(draft?.instituteName ?? '', 250);
  const institutes = useInstituteSearch(instituteQuery.trim(), stateId, !!draft);

  /* -- cascades -------------------------------------------------------- */

  const degreeGroups = useMemo(() => {
    const all = masters?.degrees ?? [];
    return DEGREE_CATEGORIES.map((category) => ({
      category,
      // Anything without a category (a row added straight to the table) is filed under Other,
      // so it is still selectable rather than silently missing from the dropdown.
      items: all.filter((d) => (d.category ?? 'Other') === category),
    })).filter((g) => g.items.length > 0);
  }, [masters?.degrees]);

  const courses = useMemo(() => {
    if (!masters?.courses) return [];
    if (!draft?.degreeId) return [];
    return masters.courses.filter((c) => c.degreeId === Number(draft.degreeId));
  }, [masters?.courses, draft?.degreeId]);

  /* -- save ------------------------------------------------------------ */

  const isBlank = (d: Draft) => !d.degreeId && !d.instituteName.trim();

  /** Returns false when the draft could not be saved, so the caller stays on the step. */
  const saveDraft = async (): Promise<boolean> => {
    // An untouched extra form is not an error — the candidate opened it and changed their mind.
    if (!draft || isBlank(draft)) return true;

    const parsed = educationDraftSchema.safeParse(draft);
    if (!parsed.success) {
      const next: EducationErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof EducationErrors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setError('Please fix the highlighted fields.');
      return false;
    }

    // A duplicate is a double-submit or a mis-click, not a second degree. The API rejects it
    // too; catching it here saves the round trip and points at the field that caused it.
    const clash = cv.education.some(
      (e) =>
        e.subscriberEducationId !== draft.subscriberEducationId &&
        e.degreeId === Number(draft.degreeId) &&
        (e.instituteName ?? '').trim().toLowerCase() === draft.instituteName.trim().toLowerCase(),
    );
    if (clash) {
      setErrors({ degreeId: 'You have already added this qualification from this institution.' });
      setError('Please fix the highlighted fields.');
      return false;
    }

    setErrors({});
    try {
      await upsert.mutateAsync({
        subscriberEducationId: draft.subscriberEducationId,
        degreeId: Number(draft.degreeId),
        courseTypeId: draft.courseTypeId ? Number(draft.courseTypeId) : undefined,
        instituteName: draft.instituteName.trim() || undefined,
        passingYear: draft.passingYear ? Number(draft.passingYear) : undefined,
        startYear: draft.startYear ? Number(draft.startYear) : undefined,
        specialization: draft.specialization.trim() || undefined,
        courseMode: draft.courseMode || undefined,
        marks: draft.marks.trim() || undefined,
      });
      return true;
    } catch (e) {
      // The API's message names the rule that failed ("End year cannot be earlier than start
      // year"), which is more use than a generic retry prompt.
      const message =
        (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      setError(
        (Array.isArray(message) ? message[0] : message) ??
          'Could not save this qualification. Please try again.',
      );
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
    // Saving before opening the next form is what keeps the records independent: each one is a
    // row of its own the moment it is added, rather than a shared draft the next entry overwrites.
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
              title={educationTitle(masters?.degrees, masters?.courses, e)}
              subtitle={e.instituteName}
              meta={dotted(
                labelOf(masters?.courses, e.courseTypeId),
                years(e.startYear, e.passingYear),
                e.courseMode || null,
                e.marks || null,
              )}
              onEdit={() => {
                setErrors({});
                setDraft(toDraft(e));
              }}
              onDelete={() => remove.mutate(e.subscriberEducationId)}
              deleting={remove.isPending}
            />
          ))}
        </div>
      )}

      {draft ? (
        <>
          <FieldGrid cols={2}>
            <Field label="Education" htmlFor="degreeId" required error={errors.degreeId}>
              <Select
                id="degreeId"
                value={draft.degreeId}
                invalid={!!errors.degreeId}
                // Clearing the course is not optional: it belonged to the previous
                // qualification's list, and leaving it would file a B.Tech branch under an MBBS.
                onChange={(e) => {
                  setDraft((d) => (d ? { ...d, degreeId: e.target.value, courseTypeId: '' } : d));
                  setErrors((x) => ({ ...x, degreeId: undefined, courseTypeId: undefined }));
                }}
              >
                <option value="">Select</option>
                {degreeGroups.map((g) => (
                  <optgroup key={g.category} label={g.category}>
                    {g.items.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            </Field>

            <Field
              label="Institution / University name"
              htmlFor="instituteName"
              required
              error={errors.instituteName}
            >
              <Combobox
                id="instituteName"
                placeholder="e.g. University of Pune"
                value={draft.instituteName}
                invalid={!!errors.instituteName}
                onChange={(v) => set('instituteName', v)}
                loading={institutes.isFetching}
                options={(institutes.data ?? []).map((i) => ({ id: i.id, label: i.label, hint: i.city }))}
                emptyHint="Not listed — type your institution's name and it will be saved."
              />
            </Field>

            <Field label="Course" htmlFor="courseTypeId" required error={errors.courseTypeId}>
              <Select
                id="courseTypeId"
                value={draft.courseTypeId}
                invalid={!!errors.courseTypeId}
                // Disabled rather than showing every course in the system: the list only means
                // anything once a qualification narrows it.
                disabled={!draft.degreeId}
                onChange={(e) => set('courseTypeId', e.target.value)}
              >
                <option value="">{draft.degreeId ? 'Select' : 'Select education first'}</option>
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

            <Field label="Start Year" htmlFor="startYear" error={errors.startYear}>
              <Input
                id="startYear"
                inputMode="numeric"
                placeholder="2016"
                invalid={!!errors.startYear}
                value={draft.startYear}
                onChange={(e) => set('startYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </Field>

            <Field label="End Year" htmlFor="passingYear" error={errors.passingYear}>
              <Input
                id="passingYear"
                inputMode="numeric"
                placeholder="2020"
                invalid={!!errors.passingYear}
                value={draft.passingYear}
                onChange={(e) => set('passingYear', e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </Field>

            <Field label="Specialization" htmlFor="specialization" required error={errors.specialization}>
              <Input
                id="specialization"
                placeholder="e.g. Information Technology"
                invalid={!!errors.specialization}
                value={draft.specialization}
                onChange={(e) => set('specialization', e.target.value)}
              />
            </Field>

            <Field label="Percentage %" htmlFor="marks" error={errors.marks}>
              <Input
                id="marks"
                inputMode="decimal"
                placeholder="e.g. 80"
                invalid={!!errors.marks}
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
        <AddAnother
          label="Add another education"
          onClick={() => {
            setErrors({});
            setDraft(emptyDraft());
          }}
        />
      )}
    </StepShell>
  );
}
