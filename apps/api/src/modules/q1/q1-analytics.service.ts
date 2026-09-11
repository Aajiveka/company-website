import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ScreeningStatus } from '@/shared/screening';
import { completenessOf } from './q1.service';

/** Analytics & Reports — the four KPIs, two charts, status bars and funnel. */
@Injectable()
export class Q1AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async overview() {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [screened, screenedThisWeek, verifiedRows, byStatus, totalRegistrations, withCv, verifiedOfScreened] =
      await Promise.all([
        this.db.subscriberScreening.count({ where: { firstReviewedAt: { not: null } } }),
        this.db.subscriberScreening.count({ where: { firstReviewedAt: { gte: weekAgo } } }),
        this.db.subscriberScreening.findMany({
          where: { verifiedAt: { not: null }, firstReviewedAt: { not: null } },
          select: { firstReviewedAt: true, verifiedAt: true },
        }),
        this.db.subscriberScreening.groupBy({ by: ['status'], _count: { _all: true } }),
        this.db.subscriberRegistration.count(),
        this.db.subscriberCVUploaded.count(),
        // Counted over the same population as `screened`, not over status='Verified'. Those
        // two are different sets — a row verified before it was ever stamped as reviewed is
        // in one and not the other — and dividing one by the other produced a 200% rate.
        this.db.subscriberScreening.count({
          where: { firstReviewedAt: { not: null }, verifiedAt: { not: null } },
        }),
      ]);

    const count = (s: string) => byStatus.find((r) => r.status === s)?._count._all ?? 0;
    const tracked = byStatus.reduce((sum, r) => sum + r._count._all, 0);

    // Average screening time: first review -> verified, in minutes.
    const avgMinutes = verifiedRows.length
      ? Math.round(
          verifiedRows.reduce(
            (sum, r) => sum + (r.verifiedAt!.getTime() - r.firstReviewedAt!.getTime()) / 60000,
            0,
          ) / verifiedRows.length,
        )
      : 0;

    const verified = count(ScreeningStatus.VERIFIED);

    // Screenings per weekday over the last 7 days, Mon..Sun as the chart labels run.
    const recent = await this.db.subscriberScreening.findMany({
      where: { firstReviewedAt: { gte: weekAgo } },
      select: { firstReviewedAt: true },
    });
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const perDay = new Array(7).fill(0) as number[];
    for (const r of recent) {
      // JS weeks start on Sunday; the chart starts on Monday.
      const idx = (r.firstReviewedAt!.getDay() + 6) % 7;
      perDay[idx] += 1;
    }

    // Profile-completion distribution across every registration.
    const registrations = await this.db.subscriberRegistration.findMany({
      select: { subscriberID: true },
      take: 500,
      orderBy: { subscriberID: 'desc' },
    });
    const buckets = { full: 0, high: 0, mid: 0, low: 0 };
    for (const r of registrations) {
      const pct = completenessOf(await this.factsOf(Number(r.subscriberID)));
      if (pct >= 100) buckets.full += 1;
      else if (pct >= 75) buckets.high += 1;
      else if (pct >= 50) buckets.mid += 1;
      else buckets.low += 1;
    }
    const sampled = registrations.length || 1;
    const pct = (n: number) => Math.round((n / sampled) * 100);

    // Funnel, last 30 days.
    const [signedUp, reviewed, contacted] = await Promise.all([
      this.db.subscriberRegistration.count({
        where: { registrationDateTime: { gte: monthAgo } },
      }),
      this.db.subscriberScreening.count({ where: { firstReviewedAt: { gte: monthAgo } } }),
      this.db.screeningContactLog
        .findMany({
          where: { contactedAt: { gte: monthAgo } },
          select: { subscriberID: true },
          distinct: ['subscriberID'],
        })
        .then((r) => r.length),
    ]);
    const funnelVerified = await this.db.subscriberScreening.count({
      where: { verifiedAt: { gte: monthAgo } },
    });
    const share = (n: number) => (signedUp ? Math.round((n / signedUp) * 100) : 0);

    return {
      kpis: {
        candidatesScreened: screened,
        screenedThisWeek,
        // Of everyone screened, how many reached Verified. Both sides count the same rows,
        // so this cannot exceed 100.
        verificationRate: screened ? Math.round((verifiedOfScreened / screened) * 100) : 0,
        avgScreeningMinutes: avgMinutes,
        cvAvailability: totalRegistrations
          ? Math.round((withCv / totalRegistrations) * 100)
          : 0,
      },
      screeningsThisWeek: { labels, values: perDay, total: recent.length },
      profileCompletion: [
        { label: '100% complete', percent: pct(buckets.full) },
        { label: '75–99%', percent: pct(buckets.high) },
        { label: '50–74%', percent: pct(buckets.mid) },
        { label: '< 50%', percent: pct(buckets.low) },
      ],
      byStatus: [
        { label: 'New', count: count(ScreeningStatus.NEW) + Math.max(0, totalRegistrations - tracked) },
        { label: 'Screening', count: count(ScreeningStatus.SCREENING) },
        { label: 'Incomplete', count: count(ScreeningStatus.INCOMPLETE) },
        { label: 'Follow-up', count: count(ScreeningStatus.FOLLOW_UP) },
        { label: 'No Response', count: count(ScreeningStatus.NO_RESPONSE) },
        { label: 'Verified', count: verified },
        { label: 'Not Interested', count: count(ScreeningStatus.NOT_INTERESTED) },
      ],
      funnel: [
        { label: 'Signed up', count: signedUp, percent: signedUp ? 100 : 0 },
        { label: 'Reviewed', count: reviewed, percent: share(reviewed) },
        { label: 'Contacted', count: contacted, percent: share(contacted) },
        { label: 'Verified', count: funnelVerified, percent: share(funnelVerified) },
      ],
    };
  }

  /**
   * Completeness inputs for the distribution chart. Q1Service keeps `factsFor` private
   * because every other caller goes through a method that also needs the screening row; the
   * chart needs only the facts, so it reaches them through the public profile-free path.
   */
  private async factsOf(subscriberId: number) {
    const [cv, extra, uploaded, education, application] = await Promise.all([
      this.db.subscriberCVDetails.findUnique({
        where: { subscriberID: subscriberId },
        select: { dOB: true, cityID: true, currentCityID: true, noticePeriod: true },
      }),
      this.db.subscriberProfileExtra.findUnique({
        where: { subscriberID: subscriberId },
        select: { preferredSalary: true, keySkills: true },
      }),
      this.db.subscriberCVUploaded.findUnique({ where: { subscriberID: subscriberId } }),
      this.db.subscriberEducation.count({ where: { subscriberID: subscriberId } }),
      this.db.jobApplicationDetail.findFirst({
        where: { mapping: { subscriberID: BigInt(subscriberId) } },
        orderBy: { jobSubscriberMapID: 'desc' },
        select: { linkedInUrl: true },
      }),
    ]);
    const skillCount = extra?.keySkills
      ? extra.keySkills.split(',').filter((s) => s.trim()).length
      : await this.db.subscriberTags.count({ where: { subscriberID: subscriberId } });
    return {
      hasCv: !!uploaded,
      expectedSalary: extra?.preferredSalary != null ? Number(extra.preferredSalary) : null,
      noticePeriod: cv?.noticePeriod ?? null,
      linkedInUrl: application?.linkedInUrl ?? null,
      dateOfBirth: cv?.dOB ?? null,
      cityId: cv?.currentCityID ?? cv?.cityID ?? null,
      educationCount: education,
      skillCount,
    };
  }
}
