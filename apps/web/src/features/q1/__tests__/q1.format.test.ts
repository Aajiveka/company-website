import { describe, it, expect } from 'vitest';
import {
  durationLabel,
  experienceLabel,
  greeting,
  initialsOf,
  receivedLabel,
} from '../q1.format';

/**
 * The label helpers behind the Candidate Queue columns and the profile hero.
 *
 * These exist because the Figma is specific about its formats — "Fresher" rather than "0 yrs",
 * "02 Sep, 10:30 AM" rather than a locale default, "1h 24m" rather than "84 minutes" — and a
 * silent drift in any of them shows up on every row of every screen.
 */
describe('experienceLabel', () => {
  it('calls zero and null experience "Fresher"', () => {
    // The design's Ishita Verma row: a graduate trainee with no prior company.
    expect(experienceLabel(0)).toBe('Fresher');
    expect(experienceLabel(null)).toBe('Fresher');
  });

  it('singularises one year', () => {
    expect(experienceLabel(1)).toBe('1 yr');
    expect(experienceLabel(10)).toBe('10 yrs');
  });

  it('treats negative experience as fresher rather than printing it', () => {
    expect(experienceLabel(-3)).toBe('Fresher');
  });
});

describe('receivedLabel', () => {
  it('formats as "02 Sep, 10:30 AM"', () => {
    const out = receivedLabel('2026-09-02T10:30:00.000Z');
    expect(out).toMatch(/^02 Sep, \d{2}:\d{2} (AM|PM)$/);
  });

  it('renders an em dash for a missing or unparseable date', () => {
    expect(receivedLabel(null)).toBe('—');
    expect(receivedLabel('not-a-date')).toBe('—');
  });
});

describe('durationLabel', () => {
  it('splits minutes into hours and minutes', () => {
    expect(durationLabel(84)).toBe('1h 24m');
    expect(durationLabel(45)).toBe('45m');
  });

  it('shows an em dash when nothing has been screened yet', () => {
    expect(durationLabel(0)).toBe('—');
  });
});

describe('initialsOf', () => {
  it('takes the first two words', () => {
    expect(initialsOf('Jatinder Singh')).toBe('JS');
    expect(initialsOf('Anuranjan Kumar')).toBe('AK');
  });

  it('handles a single name and extra whitespace', () => {
    expect(initialsOf('Priya')).toBe('P');
    expect(initialsOf('  Nishu   Kumar  ')).toBe('NK');
  });

  it('does not crash on an empty name', () => {
    // Registrations with no CV row fall back to the mobile number, which can be blank.
    expect(initialsOf('')).toBe('?');
    expect(initialsOf('   ')).toBe('?');
  });
});

describe('greeting', () => {
  const t = (k: string) => k;

  it('picks the greeting from the hour', () => {
    expect(greeting(t, new Date('2026-09-12T09:00:00'))).toBe('q1.greeting.morning');
    expect(greeting(t, new Date('2026-09-12T13:00:00'))).toBe('q1.greeting.afternoon');
    expect(greeting(t, new Date('2026-09-12T19:00:00'))).toBe('q1.greeting.evening');
  });

  it('treats noon as afternoon and 5pm as evening', () => {
    expect(greeting(t, new Date('2026-09-12T12:00:00'))).toBe('q1.greeting.afternoon');
    expect(greeting(t, new Date('2026-09-12T17:00:00'))).toBe('q1.greeting.evening');
  });
});
