import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { saveErrorMessage } from '../saveError';

const response = (status: number, message?: string | string[]) =>
  new AxiosError('failed', 'ERR', undefined, null, {
    status,
    statusText: '',
    data: message === undefined ? {} : { statusCode: status, message },
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });

describe('saveErrorMessage', () => {
  it('names the field and the fix instead of the validator jargon', () => {
    expect(saveErrorMessage(response(400, ['dob must be a valid ISO 8601 date string']), 'your personal details')).toBe(
      'Could not save your personal details. Date of Birth: enter a valid date.',
    );
  });

  it('uses the label the form passes for a field whose name differs per step', () => {
    const err = response(400, ['skillName must be shorter than or equal to 100 characters']);
    expect(saveErrorMessage(err, 'your primary skill', { skillName: 'Primary Skill' })).toBe(
      'Could not save your primary skill. Primary Skill is too long — keep it to 100 characters or fewer.',
    );
  });

  it('passes a rule the API already wrote for people straight through', () => {
    expect(saveErrorMessage(response(400, 'Worked till cannot be earlier than worked from.'), 'this project')).toBe(
      'Could not save this project. Worked till cannot be earlier than worked from.',
    );
  });

  it('lists several failures, not just the first', () => {
    const msg = saveErrorMessage(response(400, ['fullName should not be empty', 'email must be an email']), 'your details');
    expect(msg).toContain('Full Name is required.');
    expect(msg).toContain('Email Address: enter a valid email address');
  });

  it('says the connection failed when there was no response at all', () => {
    expect(saveErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'), 'your summary')).toMatch(/internet connection/);
  });

  it('does not blame the candidate for a server failure', () => {
    expect(saveErrorMessage(response(500, 'Internal server error'), 'your summary')).toMatch(/on our side/);
  });

  it('tells an expired session to sign in again', () => {
    expect(saveErrorMessage(response(401, 'Invalid or expired token'), 'your summary')).toMatch(/sign in again/);
  });
});
