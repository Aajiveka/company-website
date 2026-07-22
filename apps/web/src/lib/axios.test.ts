import { describe, expect, it } from 'vitest';
import { AxiosError, AxiosHeaders } from 'axios';
import { getErrorMessage } from './axios';

function makeAxiosError(status: number, data?: unknown): AxiosError {
  const error = new AxiosError('Request failed');
  error.response = {
    status,
    statusText: '',
    headers: {},
    config: { headers: new AxiosHeaders() },
    data: data ?? {},
  };
  error.isAxiosError = true;
  return error;
}

function makeNetworkError(code?: string): AxiosError {
  const error = new AxiosError('Network Error');
  error.response = undefined;
  error.isAxiosError = true;
  if (code) error.code = code;
  return error;
}

describe('getErrorMessage', () => {
  it('returns server message when present', () => {
    const err = makeAxiosError(400, { message: 'Email already exists' });
    expect(getErrorMessage(err)).toBe('Email already exists');
  });

  it('returns first message from array', () => {
    const err = makeAxiosError(422, { message: ['Name is required', 'Email is required'] });
    expect(getErrorMessage(err)).toBe('Name is required');
  });

  it('returns status-specific default for 403', () => {
    const err = makeAxiosError(403);
    expect(getErrorMessage(err)).toBe('You do not have permission to perform this action.');
  });

  it('returns status-specific default for 404', () => {
    const err = makeAxiosError(404);
    expect(getErrorMessage(err)).toBe('The requested resource was not found.');
  });

  it('returns status-specific default for 429', () => {
    const err = makeAxiosError(429);
    expect(getErrorMessage(err)).toBe('Too many requests. Please wait a moment and try again.');
  });

  it('returns server error for 500+', () => {
    const err = makeAxiosError(502);
    expect(getErrorMessage(err)).toBe('Server error. Please try again later.');
  });

  it('returns timeout message for ECONNABORTED', () => {
    const err = makeNetworkError('ECONNABORTED');
    expect(getErrorMessage(err)).toBe('Request timed out. Please try again.');
  });

  it('returns fallback for non-axios errors', () => {
    expect(getErrorMessage(new Error('oops'))).toBe('Something went wrong');
    expect(getErrorMessage(new Error('oops'), 'Custom fallback')).toBe('Custom fallback');
  });

  it('returns custom fallback for unknown status', () => {
    const err = makeAxiosError(418);
    expect(getErrorMessage(err, 'Teapot error')).toBe('Teapot error');
  });
});
