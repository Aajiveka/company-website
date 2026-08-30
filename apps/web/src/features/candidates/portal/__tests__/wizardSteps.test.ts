import { describe, expect, it } from 'vitest';
import type { CvEditProfile } from '../../candidate.types';
import { isFresherProfile } from '../../fresher';
import { WIZARD_STEPS, visibleSteps } from '../wizardSteps';

const cvWith = (professional: unknown, employment: unknown[] = []) =>
  ({ professional, employment }) as unknown as CvEditProfile;

describe('isFresherProfile', () => {
  it('reads zero total experience as the fresher answer', () => {
    expect(isFresherProfile(cvWith({ totalExp: 0, totalExpMonths: 0 }))).toBe(true);
  });

  it('is not a fresher once any experience is recorded', () => {
    expect(isFresherProfile(cvWith({ totalExp: 2, totalExpMonths: 0 }))).toBe(false);
    expect(isFresherProfile(cvWith({ totalExp: 0, totalExpMonths: 6 }))).toBe(false);
  });

  // A saved role outranks the years: hiding the step would strand the row that edits it.
  it('is not a fresher when an employment row exists', () => {
    expect(isFresherProfile(cvWith({ totalExp: 0, totalExpMonths: 0 }, [{ subscriberEmployerId: 1 }]))).toBe(
      false,
    );
  });
});

describe('visibleSteps', () => {
  it('drops Work Experience for a fresher and keeps the rest in order', () => {
    const keys = visibleSteps(true).map((s) => s.key);
    expect(keys).not.toContain('experience');
    expect(keys).toEqual(WIZARD_STEPS.map((s) => s.key).filter((k) => k !== 'experience'));
  });

  it('walks all eight steps for an experienced candidate', () => {
    expect(visibleSteps(false).map((s) => s.key)).toEqual(WIZARD_STEPS.map((s) => s.key));
  });
});
