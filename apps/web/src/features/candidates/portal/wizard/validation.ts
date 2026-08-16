import { z } from 'zod';
import { EDUCATION_MAX_YEAR_AHEAD, EDUCATION_MIN_YEAR } from '../../candidate.types';

/**
 * Shared zod pieces for the wizard steps.
 *
 * An unselected `<select>` submits `''`, and an empty string still reaches the API's
 * `@IsDateString()` / `@IsEmail()` validators — class-validator's `@IsOptional()` only skips
 * `undefined` and `null`. Mapping blank to undefined is what keeps "left alone" from being
 * sent as a value, which is what used to make step one impossible to submit with an empty
 * date of birth.
 *
 * Lives in its own module so `StepShell.tsx` only exports components and React Fast Refresh
 * keeps working.
 */
const blankToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

/** An optional free-text field that is omitted entirely when blank. */
export const optionalText = z.preprocess(blankToUndefined, z.string().optional());

/* ------------------------------------------------------------------ */
/* Education                                                           */
/* ------------------------------------------------------------------ */

/**
 * The Education step's draft, validated as the strings the form actually holds.
 *
 * Every rule here is enforced again by the API (candidates.service.validateEducation) — the
 * wizard is not the only writer, and the ones that protect the data cannot live only in a form.
 * What this adds is telling the candidate *which field* is wrong before a round trip.
 */
export const educationDraftSchema = z
  .object({
    degreeId: z.string().min(1, 'Select your education.'),
    // Required here but optional in the API DTO: the CV manager and the profile dialog post to
    // the same endpoint without collecting these, and tightening the DTO would break them.
    courseTypeId: z.string().min(1, 'Select a course.'),
    instituteName: z.string().trim().min(2, 'Enter your institution or university.').max(500),
    specialization: z.string().trim().min(2, 'Enter your specialization.').max(300),
    startYear: z.string(),
    passingYear: z.string(),
    courseMode: z.string(),
    marks: z.string(),
  })
  .superRefine((v, ctx) => {
    const thisYear = new Date().getFullYear();
    const maxYear = thisYear + EDUCATION_MAX_YEAR_AHEAD;
    const start = v.startYear ? Number(v.startYear) : null;
    const end = v.passingYear ? Number(v.passingYear) : null;
    const fail = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });

    if (start !== null && (start < EDUCATION_MIN_YEAR || start > thisYear)) {
      fail('startYear', `Enter a year between ${EDUCATION_MIN_YEAR} and ${thisYear}.`);
    }
    if (end !== null && (end < EDUCATION_MIN_YEAR || end > maxYear)) {
      // The ceiling is ahead of today on purpose: an ongoing course has an expected graduation
      // year, and the schema has no "currently pursuing" flag to record it any other way.
      fail('passingYear', `Enter a year between ${EDUCATION_MIN_YEAR} and ${maxYear}.`);
    }
    if (start !== null && end !== null && end < start) {
      fail('passingYear', 'End year cannot be earlier than start year.');
    }

    const marks = v.marks.trim();
    if (marks) {
      // The field is labelled "Percentage %", but the column already holds CGPA values typed by
      // candidates, so both are accepted and only the plain number is range-checked.
      const percent = /^(\d{1,3}(\.\d{1,2})?)\s*%?$/.exec(marks);
      const cgpa = /^(\d{1,2}(\.\d{1,2})?)\s*(cgpa|gpa|\/\s*(10|4|5))$/i.exec(marks);
      if (percent) {
        const value = Number(percent[1]);
        if (value < 0 || value > 100) fail('marks', 'Percentage must be between 0 and 100.');
      } else if (!cgpa) {
        fail('marks', 'Enter a percentage (0-100) or a CGPA such as "8.5 CGPA".');
      }
    }
  });

/** Per-field messages the Education step renders under each control. */
export type EducationErrors = Partial<
  Record<
    | 'degreeId'
    | 'courseTypeId'
    | 'instituteName'
    | 'specialization'
    | 'startYear'
    | 'passingYear'
    | 'courseMode'
    | 'marks',
    string
  >
>;
