/* eslint-disable @typescript-eslint/no-explicit-any -- the Prisma stub mirrors only the
   calls under test. */
import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { CvReferralService } from './cv-referral.service';

/**
 * The hourly expiry returns CVs the company never answered to Q2. A company that rejected
 * (or hired) has answered: the rejection path leaves companyShortlistedAt null, so the
 * expiry has to key on the review status too, or it reopens a decided application.
 */
describe('CvReferralService.expireStale', () => {
  it('only reclaims referrals the company has not answered', async () => {
    const wheres: any[] = [];
    const db = {
      cvReferral: {
        findMany: async (args: any) => { wheres.push(args.where); return []; },
        updateMany: async (args: any) => { wheres.push(args.where); return { count: 0 }; },
      },
    };
    const svc = new CvReferralService({ client: db } as any, {} as any, {} as any, {} as any);
    const out = await svc.expireStale(new Date('2026-10-18T00:00:00Z'));
    assert.deepEqual(out, { expired: 0 });
    assert.equal(wheres[0].companyReviewStatus, 'Pending');
    assert.equal(wheres[0].companyShortlistedAt, null);
  });
});
