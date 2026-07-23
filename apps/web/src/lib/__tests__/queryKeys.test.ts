import { describe, it, expect } from 'vitest';
import { queryKeys } from '../queryClient';

describe('queryKeys', () => {
  it('auth.me is a stable tuple', () => {
    expect(queryKeys.auth.me).toEqual(['auth', 'me']);
  });

  it('candidate.profile includes the id', () => {
    expect(queryKeys.candidate.profile(42)).toEqual(['candidate', 'profile', 42]);
    expect(queryKeys.candidate.profile('abc')).toEqual(['candidate', 'profile', 'abc']);
  });

  it('client keys include id', () => {
    expect(queryKeys.client.company(1)).toEqual(['client', 'company', 1]);
    expect(queryKeys.client.jobs(1)).toEqual(['client', 'jobs', 1]);
  });

  it('recruitment.candidates includes params', () => {
    expect(queryKeys.recruitment.candidates({ page: 1 })).toEqual([
      'recruitment',
      'candidates',
      { page: 1 },
    ]);
    expect(queryKeys.recruitment.candidates()).toEqual([
      'recruitment',
      'candidates',
      undefined,
    ]);
  });

  it('jobs.search includes params', () => {
    const params = { keyword: 'react' };
    expect(queryKeys.jobs.search(params)).toEqual(['jobs', 'search', params]);
  });

  it('jobs.detail includes id', () => {
    expect(queryKeys.jobs.detail(99)).toEqual(['jobs', 'detail', 99]);
  });

  it('payments keys are stable', () => {
    expect(queryKeys.payments.plans).toEqual(['payments', 'plans']);
    expect(queryKeys.payments.order('ORD-1')).toEqual(['payments', 'order', 'ORD-1']);
    expect(queryKeys.payments.subscription).toEqual(['payments', 'subscription']);
  });
});
