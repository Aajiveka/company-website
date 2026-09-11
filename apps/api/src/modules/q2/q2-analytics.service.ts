import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { JOB_STATUS_ACTIVE } from '@/shared/status';
import { MATCH_CRITERIA, MatchReviewStatus, RELEVANT_THRESHOLD } from '@/shared/matching';

/**
 * Match Analytics.
 *
 * The Q2 designs list "Match Analytics" in the sidebar but the page itself has no frame, so
 * this reports the quantities the other five screens already name — the relevance cut, the
 * three decision buckets, and the seven weighted criteria — rather than inventing metrics the
 * design never asked for. Mirrors Q1AnalyticsService's shape so the page can reuse its layout.
 */
@Injectable()
export class Q2AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  async overview() {
    const activeJob = { job: { statusID: JOB_STATUS_ACTIVE } } as const;

    const [totalApplications, scored, decisions, perCriterion, jobs] = await Promise.all([
      this.db.jobSubscriberMapping.count({ where: activeJob }),
      this.db.candidateJobScore.findMany({
        where: { mapping: activeJob },
        select: { totalScore: true },
      }),
      this.db.applicationMatchReview.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.db.candidateJobScore.aggregate({
        where: { mapping: activeJob },
        _avg: {
          skillScore: true,
          experienceScore: true,
          jobRoleScore: true,
          educationScore: true,
          locationScore: true,
          salaryScore: true,
          noticePeriodScore: true,
        },
      }),
      this.db.clientJobs.count({ where: { statusID: JOB_STATUS_ACTIVE } }),
    ]);

    const totals = scored.map((s) => s.totalScore);
    const relevant = totals.filter((t) => t >= RELEVANT_THRESHOLD).length;
    const byStatus = new Map(decisions.map((d) => [d.status, d._count.status]));

    const avg = perCriterion._avg;
    const criterionAverages: Record<string, number | null> = {
      skill: avg.skillScore,
      experience: avg.experienceScore,
      jobRole: avg.jobRoleScore,
      education: avg.educationScore,
      location: avg.locationScore,
      salary: avg.salaryScore,
      noticePeriod: avg.noticePeriodScore,
    };

    return {
      activeJobs: jobs,
      totalApplications,
      scoredApplications: totals.length,
      relevantMatches: relevant,
      relevantThreshold: RELEVANT_THRESHOLD,
      averageMatch: totals.length
        ? Math.round(totals.reduce((a, b) => a + b, 0) / totals.length)
        : 0,
      /** The bands the match ring uses on every table. */
      distribution: [
        { band: '90–100', count: totals.filter((t) => t >= 90).length },
        { band: '60–89', count: totals.filter((t) => t >= 60 && t < 90).length },
        { band: '50–59', count: totals.filter((t) => t >= 50 && t < 60).length },
        { band: 'Below 50', count: totals.filter((t) => t < 50).length },
      ],
      decisions: {
        awaiting: Math.max(
          0,
          totalApplications -
            (byStatus.get(MatchReviewStatus.FORWARDED) ?? 0) -
            (byStatus.get(MatchReviewStatus.SENT_BACK) ?? 0) -
            (byStatus.get(MatchReviewStatus.REJECTED) ?? 0),
        ),
        forwardedToQ3: byStatus.get(MatchReviewStatus.FORWARDED) ?? 0,
        sentBackToQ1: byStatus.get(MatchReviewStatus.SENT_BACK) ?? 0,
        rejected: byStatus.get(MatchReviewStatus.REJECTED) ?? 0,
      },
      criteria: MATCH_CRITERIA.map((c) => ({
        key: c.key,
        label: c.label,
        weight: c.weight,
        average: Math.round(criterionAverages[c.key] ?? 0),
      })),
    };
  }
}
