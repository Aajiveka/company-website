/**
 * The eight profile steps from the Figma wizard, in the order its chips run.
 *
 * The step lives in the query string (`/candidate/onboarding?step=education`) so the
 * profile page's per-section "Edit" links can jump straight to the right step, the
 * browser Back button walks the steps, and a half-finished profile can be linked to.
 */
export const WIZARD_STEPS = [
  { key: 'personal', title: 'Personal Details', blurb: 'Name, title & location' },
  { key: 'summary', title: 'Profile Summary', blurb: 'Your professional bio' },
  { key: 'experience', title: 'Work Experience', blurb: 'Past & current roles' },
  { key: 'education', title: 'Education', blurb: 'Degrees & institutions' },
  { key: 'skills', title: 'Skills', blurb: 'Technical skills & languages' },
  { key: 'preferences', title: 'Job Preferences', blurb: 'What you are looking for' },
  { key: 'projects', title: 'Projects', blurb: 'Past & current worked' },
  { key: 'resume', title: 'Resume', blurb: 'Upload your latest CV' },
] as const;

export type WizardStepKey = (typeof WIZARD_STEPS)[number]['key'];

export const STEP_KEYS = WIZARD_STEPS.map((s) => s.key) as readonly WizardStepKey[];

export function isStepKey(value: string | null | undefined): value is WizardStepKey {
  return !!value && (STEP_KEYS as readonly string[]).includes(value);
}

export function stepIndex(key: WizardStepKey): number {
  return STEP_KEYS.indexOf(key);
}

/** Link to a wizard step — used by every "Edit" affordance on the profile page. */
export function stepHref(key: WizardStepKey): string {
  return `/candidate/onboarding?step=${key}`;
}
