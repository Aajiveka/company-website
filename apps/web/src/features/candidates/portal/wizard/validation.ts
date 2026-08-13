import { z } from 'zod';

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
