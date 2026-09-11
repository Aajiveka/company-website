import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { ScoringService } from '@/modules/recruitment/scoring.service';
import { CvReferralService } from '@/modules/recruitment/cv-referral.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { StorageService } from '@/modules/storage/storage.service';
import { JOB_STATUS_ACTIVE, JobMapStatus } from '@/shared/status';
import { ScreeningStatus } from '@/shared/screening';
import {
  MATCH_CRITERIA,
  MatchReviewStatus,
  criterionColumn,
  isRelevant,
  weightedScore,
  type MatchCriterionKey,
  type MatchReviewStatusValue,
} from '@/shared/matching';
import { completenessOf, type ScreeningProfileFacts } from '@/modules/q1/q1.service';
import { pdfPageCount } from '@/shared/pdf';
import type {
  ApplicantBucket,
  ApplicantTab,
  ApplicantsQueryDto,
  DecisionDto,
  JobApplicantsQueryDto,
  JobsQueryDto,
  UpdateCriterionDto,
} from './dto/q2.dto';

/** The seven sub-scores as `weightedScore` wants them. */
type SubScores = Record<MatchCriterionKey, number>;

/**
 * How many previously unscored applications one list read will score before giving up for
 * that request. Bounds the first load on an existing backlog; later loads pick up the rest.
 */
const SCORE_BACKFILL_LIMIT = 25;

const EMPTY_SCORES: SubScores = {
  skill: 0,
  experience: 0,
  jobRole: 0,
  education: 0,
  location: 0,
  salary: 0,
  noticePeriod: 0,
};

/**
 * Q2's job-matching workspace (Figma "Q2" page).
 *
 * Everything is keyed by JobSubscriberMapID — an *application*, not a candidate — because Q2
 * ranks the same candidate differently against different jobs. The Figma's All Applicants
 * table shows Nishu Kumar twice for exactly that reason.
 *
 * Scoring is not reimplemented here: ScoringService already computes and persists the seven
 * sub-scores with the Figma's weights, and CvReferralService already moves a CV from Q2 to Q3.
 * This service reads those, adds Q2's own review state, and shapes the five screens.
 */
@Injectable()
export class Q2Service {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly scoring: ScoringService,
    private readonly referrals: CvReferralService,
    private readonly applications: JobApplicationsService,
    private readonly storage: StorageService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Review row + scores
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The review row, created on first touch. Applications predate this table, so no read path
   * may assume one exists.
   */
  private async ensureReview(mapId: number) {
    const existing = await this.db.applicationMatchReview.findUnique({
      where: { jobSubscriberMapID: BigInt(mapId) },
    });
    if (existing) return existing;
    return this.db.applicationMatchReview.create({
      data: { jobSubscriberMapID: BigInt(mapId), status: MatchReviewStatus.NEW },
    });
  }

  /**
   * The persisted score, computed on demand if it is missing.
   *
   * An application that arrived before Q2 existed has no tblCandidateJobScore row, and the
   * Figma has no "not scored yet" state anywhere — every row shows a percentage. So a missing
   * score is computed rather than rendered as a blank.
   */
  private async ensureScore(mapId: number, scoredBy?: number) {
    const existing = await this.db.candidateJobScore.findUnique({
      where: { jobSubscriberMapID: BigInt(mapId) },
    });
    if (existing) return existing;
    await this.scoring.scoreApplication(mapId, scoredBy);
    return this.db.candidateJobScore.findUnique({
      where: { jobSubscriberMapID: BigInt(mapId) },
    });
  }

  private static subScores(row: {
    skillScore: number;
    experienceScore: number;
    jobRoleScore: number;
    educationScore: number;
    locationScore: number;
    salaryScore: number;
    noticePeriodScore: number;
  } | null): SubScores {
    if (!row) return { ...EMPTY_SCORES };
    return {
      skill: row.skillScore,
      experience: row.experienceScore,
      jobRole: row.jobRoleScore,
      education: row.educationScore,
      location: row.locationScore,
      salary: row.salaryScore,
      noticePeriod: row.noticePeriodScore,
    };
  }

  /**
   * Size and page count for the resume card, backfilled once if the row predates them.
   *
   * Uploads record both from the multipart buffer, so only CVs stored before those columns
   * existed need this. The object is read once and the result persisted, so a candidate's
   * detail screen pulls from storage at most one time ever. A read that fails — a key that no
   * longer exists, a driver outage — leaves both null and the card renders what it knows,
   * which is why this never throws into the request.
   */
  private async resumeFacts(
    subscriberId: number,
    uploaded: { latestCVPath: string; sizeBytes: number | null; pageCount: number | null } | null | undefined,
  ): Promise<{ sizeBytes: number | null; pageCount: number | null }> {
    if (!uploaded) return { sizeBytes: null, pageCount: null };
    if (uploaded.sizeBytes != null) {
      return { sizeBytes: uploaded.sizeBytes, pageCount: uploaded.pageCount };
    }

    try {
      const bytes = await this.storage.read(uploaded.latestCVPath);
      const sizeBytes = bytes.length;
      const pageCount = pdfPageCount(bytes);
      await this.db.subscriberCVUploaded.update({
        where: { subscriberID: BigInt(subscriberId) },
        data: { sizeBytes, pageCount },
      });
      return { sizeBytes, pageCount };
    } catch {
      return { sizeBytes: null, pageCount: null };
    }
  }

  /**
   * The "Why they match" list on Resume × JD Coverage.
   *
   * The design shows three plain-language reasons ("8 yrs relevant design experience",
   * "Strong design-system & Figma depth", "Location matches Chandigarh"). They are derived
   * from the sub-scores that earned them rather than stored, so a reason can never contradict
   * the bar beside it. Only criteria that actually scored well are listed — an applicant with
   * nothing above the bar gets an empty list, and the panel says so.
   */
  private static matchReasons(
    scores: SubScores,
    ctx: { totalExp: number | null; location: string; matchedSkills: string[]; requiredSkills: string[] },
  ): string[] {
    const out: string[] = [];
    if (scores.experience >= 70 && ctx.totalExp) {
      // The design writes "8 yrs relevant design experience". "Relevant" is only earned when
      // the role matches too — totalExp on its own is years worked, not years worked at this
      // job, so claiming relevance off the experience score alone overstates the candidate.
      const relevant = scores.jobRole >= 70;
      out.push(`${ctx.totalExp} yrs ${relevant ? 'relevant ' : ''}experience`);
    }
    if (scores.skill >= 70 && ctx.matchedSkills.length) {
      const top = ctx.matchedSkills.slice(0, 2).join(' & ');
      out.push(`Strong ${top} depth`);
    } else if (ctx.matchedSkills.length && ctx.requiredSkills.length) {
      out.push(`Matches ${ctx.matchedSkills.length} of ${ctx.requiredSkills.length} required skills`);
    }
    if (scores.location >= 80 && ctx.location) {
      out.push(`Location matches ${ctx.location}`);
    }
    if (scores.education >= 80) out.push('Meets the qualification requirement');
    if (scores.noticePeriod >= 80) out.push('Short notice period');
    if (scores.salary >= 80) out.push('Salary expectation within range');
    return out.slice(0, 4);
  }

  /**
   * The Figma prints Education as "B.Des (HCI)" — the course's short form with the
   * specialization in brackets. A row with no course falls back to the education *level*
   * (tblMstrEducationType.Descr), which is the only qualification such a row records.
   */
  private static educationLabel(
    row?: {
      specialization: string | null;
      course: { shortForm: string; degreeName: string } | null;
      degree: { descr: string } | null;
    } | null,
  ): string {
    if (!row) return '';
    const base = row.course?.shortForm || row.course?.degreeName || row.degree?.descr || '';
    if (!base) return '';
    const spec = row.specialization?.trim();
    return spec ? `${base} (${spec})` : base;
  }

  private static inclusions(review: Record<string, unknown> | null) {
    const out: Partial<Record<MatchCriterionKey, boolean>> = {};
    for (const c of MATCH_CRITERIA) out[c.key] = !!review?.[criterionColumn(c.key)];
    return out;
  }

  /**
   * Completeness inputs for many candidates at once.
   *
   * Q1 loads these one candidate at a time, which is fine for a profile page but would be
   * five queries per row here — the All Applicants table is ten rows and the dashboard counts
   * every application. Same eight requirements and therefore the same percentages.
   */
  private async factsFor(subscriberIds: number[]): Promise<Map<number, ScreeningProfileFacts>> {
    const ids = [...new Set(subscriberIds)].filter((id) => Number.isFinite(id));
    if (!ids.length) return new Map();
    const bigIds = ids.map((id) => BigInt(id));

    const [cvs, extras, uploaded, education, tags, applications] = await Promise.all([
      this.db.subscriberCVDetails.findMany({
        where: { subscriberID: { in: bigIds } },
        select: {
          subscriberID: true,
          dOB: true,
          cityID: true,
          currentCityID: true,
          noticePeriod: true,
        },
      }),
      this.db.subscriberProfileExtra.findMany({
        where: { subscriberID: { in: bigIds } },
        select: { subscriberID: true, preferredSalary: true, keySkills: true },
      }),
      this.db.subscriberCVUploaded.findMany({
        where: { subscriberID: { in: bigIds } },
        select: { subscriberID: true },
      }),
      this.db.subscriberEducation.groupBy({
        by: ['subscriberID'],
        where: { subscriberID: { in: bigIds } },
        _count: { subscriberID: true },
      }),
      this.db.subscriberTags.groupBy({
        by: ['subscriberID'],
        where: { subscriberID: { in: bigIds } },
        _count: { subscriberID: true },
      }),
      this.db.jobApplicationDetail.findMany({
        where: { mapping: { subscriberID: { in: bigIds } } },
        orderBy: { jobSubscriberMapID: 'desc' },
        select: { linkedInUrl: true, mapping: { select: { subscriberID: true } } },
      }),
    ]);

    const byId = <T extends { subscriberID: bigint }>(rows: T[]) =>
      new Map(rows.map((r) => [Number(r.subscriberID), r]));
    const cvMap = byId(cvs);
    const extraMap = byId(extras);
    const cvUploadedIds = new Set(uploaded.map((u) => Number(u.subscriberID)));
    const eduMap = new Map(
      education.map((e) => [Number(e.subscriberID), e._count.subscriberID]),
    );
    const tagMap = new Map(tags.map((t) => [Number(t.subscriberID), t._count.subscriberID]));

    // findMany came back newest-first, so the first LinkedIn seen per candidate is the newest.
    const linkedIn = new Map<number, string | null>();
    for (const a of applications) {
      const sid = a.mapping?.subscriberID == null ? null : Number(a.mapping.subscriberID);
      if (sid != null && !linkedIn.has(sid)) linkedIn.set(sid, a.linkedInUrl ?? null);
    }

    const out = new Map<number, ScreeningProfileFacts>();
    for (const id of ids) {
      const cv = cvMap.get(id);
      const extra = extraMap.get(id);
      const keySkills = extra?.keySkills?.split(',').filter((s) => s.trim()).length;
      out.set(id, {
        hasCv: cvUploadedIds.has(id),
        expectedSalary:
          extra?.preferredSalary != null ? Number(extra.preferredSalary) : null,
        noticePeriod: cv?.noticePeriod ?? null,
        linkedInUrl: linkedIn.get(id) ?? null,
        dateOfBirth: cv?.dOB ?? null,
        cityId: cv?.currentCityID ?? cv?.cityID ?? null,
        educationCount: eduMap.get(id) ?? 0,
        skillCount: keySkills || tagMap.get(id) || 0,
      });
    }
    return out;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Dashboard
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The five dashboard cards. Their subtitles in the Figma define them exactly: Active Jobs
   * "Posted by employers", Total Applicants "Across all jobs", Relevant Matches "Match ≥ 60%",
   * Forwarded to Q3 and Sent back to Q1.
   */
  async stats() {
    const [activeJobs, totalApplicants, relevantMatches, forwarded, sentBack] =
      await Promise.all([
        this.db.clientJobs.count({ where: { statusID: JOB_STATUS_ACTIVE } }),
        this.db.jobSubscriberMapping.count({ where: this.activeJobWhere() }),
        this.db.candidateJobScore.count({
          where: {
            totalScore: { gte: 60 },
            mapping: this.activeJobWhere(),
          },
        }),
        this.db.applicationMatchReview.count({
          where: { status: MatchReviewStatus.FORWARDED },
        }),
        this.db.applicationMatchReview.count({
          where: { status: MatchReviewStatus.SENT_BACK },
        }),
      ]);

    return { activeJobs, totalApplicants, relevantMatches, forwardedToQ3: forwarded, sentBackToQ1: sentBack };
  }

  /** Sidebar badges: Employer Jobs and All Applicants. */
  async navCounts() {
    const [employerJobs, allApplicants] = await Promise.all([
      this.db.clientJobs.count({ where: { statusID: JOB_STATUS_ACTIVE } }),
      this.db.jobSubscriberMapping.count({ where: this.activeJobWhere() }),
    ]);
    return { employerJobs, allApplicants };
  }

  /**
   * The "Matching SLA" card pinned to the bottom of the sidebar: "7 of 10 applicants matched
   * today. 3 awaiting review." Matched = has a decision; awaiting = still New.
   */
  async sla() {
    const [total, decided] = await Promise.all([
      this.db.jobSubscriberMapping.count({ where: this.activeJobWhere() }),
      this.db.applicationMatchReview.count({
        where: { status: { in: [MatchReviewStatus.FORWARDED, MatchReviewStatus.SENT_BACK, MatchReviewStatus.REJECTED] } },
      }),
    ]);
    return { total, matched: decided, awaiting: Math.max(0, total - decided) };
  }

  /** Applications only count when their job is one an employer still has open. */
  private activeJobWhere() {
    return { job: { statusID: JOB_STATUS_ACTIVE } } as const;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Employer Jobs
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The Employer Jobs table: one row per active job with its applicant count, how many of
   * those clear the relevance cut, and the best score among them.
   */
  async jobs(q: JobsQueryDto, userId?: number) {
    const search = q.search?.trim();
    const jobs = await this.db.clientJobs.findMany({
      where: {
        statusID: JOB_STATUS_ACTIVE,
        ...(search
          ? {
              OR: [
                { designation: { descr: { contains: search, mode: 'insensitive' as const } } },
                { client: { clientName: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      },
      orderBy: { timestampIns: 'desc' },
      select: {
        jobID: true,
        minExp: true,
        maxExp: true,
        designation: { select: { descr: true } },
        client: { select: { clientName: true } },
        workMode: { select: { descr: true } },
        jobCity: { select: { descr: true } },
      },
    });

    const jobIds = jobs.map((j) => j.jobID);
    const mappings = jobIds.length
      ? await this.db.jobSubscriberMapping.findMany({
          where: { jobID: { in: jobIds } },
          select: { jobSubscriberMapID: true, jobID: true },
        })
      : [];

    // Goes through scoresFor so an unscored application is scored here too — otherwise the
    // Relevant and Top Match columns would undercount exactly the rows the drill-down scores.
    const scores = await this.scoresFor(
      mappings.map((m) => Number(m.jobSubscriberMapID)),
      userId,
    );

    const applicants = new Map<string, number>();
    const relevant = new Map<string, number>();
    const topMatch = new Map<string, number>();
    for (const m of mappings) {
      const k = String(m.jobID);
      applicants.set(k, (applicants.get(k) ?? 0) + 1);
      const total = scores.get(Number(m.jobSubscriberMapID))?.totalScore ?? 0;
      if (isRelevant(total)) relevant.set(k, (relevant.get(k) ?? 0) + 1);
      topMatch.set(k, Math.max(topMatch.get(k) ?? 0, total));
    }

    return {
      total: jobs.length,
      rows: jobs.map((j) => {
        const k = String(j.jobID);
        return {
          jobId: Number(j.jobID),
          title: j.designation?.descr ?? '',
          company: j.client?.clientName ?? '',
          location: j.jobCity?.descr ?? '',
          minExp: j.minExp ?? null,
          maxExp: j.maxExp ?? null,
          workMode: j.workMode?.descr ?? '',
          applicants: applicants.get(k) ?? 0,
          relevant: relevant.get(k) ?? 0,
          topMatch: topMatch.get(k) ?? 0,
        };
      }),
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Job Applicants (one job, ranked)
  // ──────────────────────────────────────────────────────────────────────────

  /** The Job Applicants screen: the job header, the Job Information rail, and the ranking. */
  async jobApplicants(jobId: number, q: JobApplicantsQueryDto, userId?: number) {
    const job = await this.db.clientJobs.findUnique({
      where: { jobID: BigInt(jobId) },
      select: {
        jobID: true,
        jobDescr: true,
        minExp: true,
        maxExp: true,
        minCTC: true,
        maxCTC: true,
        educationDetail: true,
        timestampIns: true,
        designation: { select: { descr: true } },
        client: { select: { clientName: true } },
        workMode: { select: { descr: true } },
        employeeType: { select: { descr: true } },
        jobCity: { select: { descr: true } },
        ClientJobSkill: { select: { skill: { select: { descr: true } } } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');

    const mappings = await this.db.jobSubscriberMapping.findMany({
      where: { jobID: BigInt(jobId) },
      select: {
        jobSubscriberMapID: true,
        subscriberID: true,
        subscriber: {
          select: {
            SubscriberCVDetails: {
              select: { fullName: true, totalExp: true, subFunction: { select: { descr: true } } },
            },
          },
        },
      },
    });

    const mapIds = mappings.map((m) => Number(m.jobSubscriberMapID));
    const [scores, facts] = await Promise.all([
      this.scoresFor(mapIds, userId),
      this.factsFor(mappings.map((m) => Number(m.subscriberID)).filter((n) => Number.isFinite(n))),
    ]);

    let applicants = mappings.map((m) => {
      const mapId = Number(m.jobSubscriberMapID);
      const cv = m.subscriber?.SubscriberCVDetails;
      const f = facts.get(Number(m.subscriberID));
      const total = scores.get(mapId)?.totalScore ?? 0;
      return {
        mapId,
        subscriberId: Number(m.subscriberID),
        name: cv?.fullName ?? '',
        designation: cv?.subFunction?.descr ?? '',
        totalExp: cv?.totalExp ?? null,
        totalScore: total,
        relevant: isRelevant(total),
        profileCompleteness: f ? completenessOf(f) : 0,
        hasCv: f?.hasCv ?? false,
      };
    });

    // Rank before filtering, so "Relevant only" hides row 2 without renumbering row 1.
    applicants.sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name));
    applicants = applicants.map((a, i) => ({ ...a, rank: i + 1 }));
    const totalApplicants = applicants.length;
    if (q.relevantOnly) applicants = applicants.filter((a) => a.relevant);

    return {
      job: {
        jobId: Number(job.jobID),
        title: job.designation?.descr ?? '',
        company: job.client?.clientName ?? '',
        location: job.jobCity?.descr ?? '',
        description: job.jobDescr ?? '',
        jobType: job.employeeType?.descr ?? '',
        workMode: job.workMode?.descr ?? '',
        minExp: job.minExp ?? null,
        maxExp: job.maxExp ?? null,
        minCTC: job.minCTC ?? 0,
        maxCTC: job.maxCTC ?? 0,
        qualification: job.educationDetail ?? '',
        postedOn: job.timestampIns?.toISOString() ?? null,
        requiredSkills: job.ClientJobSkill.map((s) => s.skill?.descr ?? '').filter(Boolean),
      },
      totalApplicants,
      applicants,
    };
  }

  /**
   * Scores for a page of applications, computing any that are missing first.
   *
   * Applications created before Q2 existed have no tblCandidateJobScore row, and nothing in
   * the intake path scores them — so without this the Employer Jobs and All Applicants tables
   * would show 0% for them. The Figma shows a real percentage on every row and has no
   * "unscored" state at all, so a missing score is computed rather than rendered as a zero.
   *
   * The write happens once per application: ScoringService persists the result, so the next
   * read finds it. SCORE_BACKFILL_LIMIT keeps a first load on a large backlog bounded — the
   * remainder is picked up by later page loads rather than stalling this one.
   */
  private async scoresFor(mapIds: number[], scoredBy?: number) {
    if (!mapIds.length) return new Map<number, { totalScore: number }>();
    const bigIds = mapIds.map((id) => BigInt(id));

    let rows = await this.db.candidateJobScore.findMany({
      where: { jobSubscriberMapID: { in: bigIds } },
      select: { jobSubscriberMapID: true, totalScore: true },
    });

    const scored = new Set(rows.map((r) => Number(r.jobSubscriberMapID)));
    const missing = mapIds.filter((id) => !scored.has(id)).slice(0, SCORE_BACKFILL_LIMIT);
    if (missing.length) {
      // Sequential on purpose: ScoringService issues several queries per application, and a
      // parallel fan-out over a full page would spike the connection pool for no gain.
      for (const id of missing) {
        try {
          await this.scoring.scoreApplication(id, scoredBy);
        } catch {
          // A single unscorable application (a deleted job, a candidate with no CV row) must
          // not take the whole table down with it — it simply stays unscored.
        }
      }
      rows = await this.db.candidateJobScore.findMany({
        where: { jobSubscriberMapID: { in: bigIds } },
        select: { jobSubscriberMapID: true, totalScore: true },
      });
    }

    return new Map(rows.map((r) => [Number(r.jobSubscriberMapID), { totalScore: r.totalScore }]));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // All Applicants
  // ──────────────────────────────────────────────────────────────────────────

  /** All Applicants, plus the Forwarded to Q3 / Sent back to Q1 buckets. */
  async applicants(q: ApplicantsQueryDto, userId?: number) {
    const search = q.search?.trim();
    const statusFilter = Q2Service.bucketStatus(q.bucket);

    const mappings = await this.db.jobSubscriberMapping.findMany({
      where: {
        ...this.activeJobWhere(),
        ...(statusFilter
          ? { ApplicationMatchReview: { status: statusFilter } }
          : {}),
        ...(search
          ? {
              OR: [
                {
                  subscriber: {
                    SubscriberCVDetails: {
                      fullName: { contains: search, mode: 'insensitive' as const },
                    },
                  },
                },
                {
                  job: {
                    designation: { descr: { contains: search, mode: 'insensitive' as const } },
                  },
                },
                {
                  job: {
                    client: { clientName: { contains: search, mode: 'insensitive' as const } },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        jobSubscriberMapID: true,
        subscriberID: true,
        subscriber: {
          select: {
            SubscriberCVDetails: {
              select: { fullName: true, subFunction: { select: { descr: true } } },
            },
          },
        },
        job: {
          select: {
            jobID: true,
            designation: { select: { descr: true } },
            client: { select: { clientName: true } },
          },
        },
        ApplicationMatchReview: { select: { status: true } },
      },
    });

    const mapIds = mappings.map((m) => Number(m.jobSubscriberMapID));
    const [scores, facts] = await Promise.all([
      this.scoresFor(mapIds, userId),
      this.factsFor(mappings.map((m) => Number(m.subscriberID)).filter((n) => Number.isFinite(n))),
    ]);

    let rows = mappings.map((m) => {
      const mapId = Number(m.jobSubscriberMapID);
      const cv = m.subscriber?.SubscriberCVDetails;
      const f = facts.get(Number(m.subscriberID));
      const total = scores.get(mapId)?.totalScore ?? 0;
      return {
        mapId,
        subscriberId: Number(m.subscriberID),
        jobId: Number(m.job?.jobID ?? 0),
        name: cv?.fullName ?? '',
        currentDesignation: cv?.subFunction?.descr ?? '',
        jobTitle: m.job?.designation?.descr ?? '',
        company: m.job?.client?.clientName ?? '',
        totalScore: total,
        relevant: isRelevant(total),
        profileCompleteness: f ? completenessOf(f) : 0,
        status: (m.ApplicationMatchReview?.status ?? MatchReviewStatus.NEW) as MatchReviewStatusValue,
      };
    });

    // Counts are taken over the bucket BEFORE the tab filter, so the segmented control shows
    // the same three numbers whichever tab is active. Counting after the filter made "All"
    // read 0 while the Not Relevant tab was selected.
    const counts = {
      all: rows.length,
      relevant: rows.filter((r) => r.relevant).length,
      notRelevant: rows.filter((r) => !r.relevant).length,
    };

    rows = Q2Service.applyTab(rows, q.tab);
    rows.sort((a, b) => b.totalScore - a.totalScore || a.name.localeCompare(b.name));

    const total = rows.length;
    const start = (q.page - 1) * q.pageSize;
    return {
      total,
      page: q.page,
      pageSize: q.pageSize,
      /** Tab counts, so the segmented control can label itself without three round trips. */
      counts,
      rows: rows.slice(start, start + q.pageSize),
    };
  }

  private static bucketStatus(bucket: ApplicantBucket): MatchReviewStatusValue | null {
    switch (bucket) {
      case 'forwarded':
        return MatchReviewStatus.FORWARDED;
      case 'sentBack':
        return MatchReviewStatus.SENT_BACK;
      case 'rejected':
        return MatchReviewStatus.REJECTED;
      default:
        return null;
    }
  }

  private static applyTab<T extends { relevant: boolean }>(rows: T[], tab: ApplicantTab): T[] {
    if (tab === 'relevant') return rows.filter((r) => r.relevant);
    if (tab === 'notRelevant') return rows.filter((r) => !r.relevant);
    return rows;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Applicant detail
  // ──────────────────────────────────────────────────────────────────────────

  /** The applicant detail screen: candidate, job description, scoring and JD coverage. */
  async application(mapId: number, userId?: number) {
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: BigInt(mapId) },
      select: {
        jobSubscriberMapID: true,
        subscriberID: true,
        subscriber: {
          select: {
            subscriberID: true,
            SubscriberCVDetails: {
              select: {
                fullName: true,
                emailID: true,
                mobileNo1: true,
                totalExp: true,
                noticePeriod: true,
                subFunction: { select: { descr: true } },
                city: { select: { descr: true } },
                currentCity: { select: { descr: true } },
              },
            },
            SubscriberCVUploaded: {
              select: { cVName: true, latestCVPath: true, sizeBytes: true, pageCount: true },
            },
            SubscriberEducation: {
              select: {
                specialization: true,
                course: { select: { shortForm: true, degreeName: true } },
                degree: { select: { descr: true } },
              },
              orderBy: { subscriberEducationID: 'desc' },
              take: 1,
            },
          },
        },
        job: {
          select: {
            jobID: true,
            jobDescr: true,
            minExp: true,
            maxExp: true,
            minCTC: true,
            maxCTC: true,
            educationDetail: true,
            designation: { select: { descr: true } },
            client: { select: { clientName: true } },
            workMode: { select: { descr: true } },
            employeeType: { select: { descr: true } },
            jobCity: { select: { descr: true } },
            ClientJobSkill: { select: { skill: { select: { descr: true } } } },
          },
        },
      },
    });
    if (!mapping) throw new NotFoundException('Application not found');

    const subscriberId = Number(mapping.subscriberID);
    const [review, score, facts, skills] = await Promise.all([
      this.ensureReview(mapId),
      this.ensureScore(mapId, userId),
      this.factsFor([subscriberId]),
      this.db.subscriberITSkill.findMany({
        where: { subscriberID: subscriberId },
        select: { skillName: true },
      }),
    ]);

    // Opening an application starts the review clock, mirroring Q1's "opening a New candidate
    // starts screening". Only the first open is recorded.
    if (!review.firstViewedAt) {
      await this.db.applicationMatchReview.update({
        where: { jobSubscriberMapID: BigInt(mapId) },
        data: { firstViewedAt: new Date(), timestampUpd: new Date(), loginIDUpd: userId ? BigInt(userId) : null },
      });
    }

    const cv = mapping.subscriber?.SubscriberCVDetails;
    const f = facts.get(subscriberId);
    const sub = Q2Service.subScores(score);
    const included = Q2Service.inclusions(review as unknown as Record<string, unknown>);
    const selectedCount = MATCH_CRITERIA.filter((c) => included[c.key]).length;

    const candidateSkills = skills.map((s) => s.skillName.trim()).filter(Boolean);
    const requiredSkills = (mapping.job?.ClientJobSkill ?? [])
      .map((s) => s.skill?.descr ?? '')
      .filter(Boolean);
    const candidateLower = new Set(candidateSkills.map((s) => s.toLowerCase()));
    const matched = requiredSkills.filter((s) => candidateLower.has(s.toLowerCase()));
    const missing = requiredSkills.filter((s) => !candidateLower.has(s.toLowerCase()));

    const uploaded = mapping.subscriber?.SubscriberCVUploaded;
    const resumeFacts = await this.resumeFacts(subscriberId, uploaded);
    const location = cv?.currentCity?.descr ?? cv?.city?.descr ?? '';

    return {
      mapId,
      subscriberId,
      status: review.status as MatchReviewStatusValue,
      /** The header's "Overall JD match" — the full seven-criteria total. */
      overallScore: score?.totalScore ?? weightedScore(sub),
      candidate: {
        name: cv?.fullName ?? '',
        designation: cv?.subFunction?.descr ?? '',
        email: cv?.emailID ?? '',
        phone: cv?.mobileNo1 ?? '',
        location,
        totalExp: cv?.totalExp ?? null,
        education: Q2Service.educationLabel(mapping.subscriber?.SubscriberEducation?.[0]),
        noticePeriod: cv?.noticePeriod ?? null,
        profileCompleteness: f ? completenessOf(f) : 0,
        skills: candidateSkills,
        resume: uploaded
          ? {
              name: uploaded.cVName,
              path: uploaded.latestCVPath,
              sizeBytes: resumeFacts.sizeBytes,
              pageCount: resumeFacts.pageCount,
            }
          : null,
      },
      job: {
        jobId: Number(mapping.job?.jobID ?? 0),
        title: mapping.job?.designation?.descr ?? '',
        company: mapping.job?.client?.clientName ?? '',
        location: mapping.job?.jobCity?.descr ?? '',
        description: mapping.job?.jobDescr ?? '',
        jobType: mapping.job?.employeeType?.descr ?? '',
        workMode: mapping.job?.workMode?.descr ?? '',
        minExp: mapping.job?.minExp ?? null,
        maxExp: mapping.job?.maxExp ?? null,
        minCTC: mapping.job?.minCTC ?? 0,
        maxCTC: mapping.job?.maxCTC ?? 0,
        qualification: mapping.job?.educationDetail ?? '',
        requiredSkills,
      },
      scoring: {
        criteria: MATCH_CRITERIA.map((c) => ({
          key: c.key,
          label: c.label,
          weight: c.weight,
          score: sub[c.key],
          included: !!included[c.key],
        })),
        /** Recomputed over the ticked subset — the design's "Total Match Score / n/7 criteria". */
        totalScore: weightedScore(sub, included),
        selectedCount,
        criteriaCount: MATCH_CRITERIA.length,
      },
      coverage: {
        matched,
        missing,
        requiredSkills,
        reasons: Q2Service.matchReasons(sub, {
          totalExp: cv?.totalExp ?? null,
          location,
          matchedSkills: matched,
          requiredSkills,
        }),
      },
    };
  }

  /** One checkbox on the Candidate Scoring panel. */
  async setCriterion(mapId: number, dto: UpdateCriterionDto, userId?: number) {
    await this.ensureReview(mapId);
    await this.db.applicationMatchReview.update({
      where: { jobSubscriberMapID: BigInt(mapId) },
      data: {
        [criterionColumn(dto.criterion)]: dto.included,
        timestampUpd: new Date(),
        loginIDUpd: userId ? BigInt(userId) : null,
      },
    });
    return this.application(mapId, userId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Decisions
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * "Forward to Q3".
   *
   * Delegates to the existing CvReferralService, which creates the tblCvReferral row and
   * transitions the application to REFERRED_TO_Q3 — so Q3's screens pick it up exactly as
   * they do when a referral is made from /recruitment. Q2's own status is recorded alongside.
   */
  async forward(mapId: number, dto: DecisionDto, userId: number) {
    await this.assertPending(mapId);
    await this.referrals.referToQ3([mapId], userId);
    return this.recordDecision(mapId, MatchReviewStatus.FORWARDED, dto.note, userId, 'q2.forwarded_to_q3');
  }

  /**
   * "Send back to Q1".
   *
   * Puts the *candidate* back on Q1's queue by resetting their screening status to Incomplete
   * — the state Q1's own service assigns a profile with gaps — and parks the application at
   * NEED_MORE_INFO so it leaves Q2's queue without being rejected.
   */
  async sendBack(mapId: number, dto: DecisionDto, userId: number) {
    const mapping = await this.assertPending(mapId);
    await this.applications.transitionStatus(
      mapId,
      JobMapStatus.NEED_MORE_INFO,
      userId,
      undefined,
      dto.note,
    );
    if (mapping.subscriberID != null) {
      const subscriberId = mapping.subscriberID;
      await this.db.subscriberScreening.upsert({
        where: { subscriberID: subscriberId },
        create: { subscriberID: subscriberId, status: ScreeningStatus.INCOMPLETE },
        update: { status: ScreeningStatus.INCOMPLETE, timestampUpd: new Date(), loginIDUpd: BigInt(userId) },
      });
    }
    return this.recordDecision(mapId, MatchReviewStatus.SENT_BACK, dto.note, userId, 'q2.sent_back_to_q1');
  }

  /** "Reject" — ends the application in the shared pipeline as well as in Q2's space. */
  async reject(mapId: number, dto: DecisionDto, userId: number) {
    await this.assertPending(mapId);
    await this.applications.transitionStatus(
      mapId,
      JobMapStatus.REJECTED,
      userId,
      undefined,
      dto.note,
    );
    return this.recordDecision(mapId, MatchReviewStatus.REJECTED, dto.note, userId, 'q2.rejected');
  }

  /**
   * A decision is only valid on an application still awaiting one. Without this the three
   * header buttons stay live after a decision and a double click would create a second
   * referral or re-reject a rejected application.
   */
  private async assertPending(mapId: number) {
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: BigInt(mapId) },
      select: { jobSubscriberMapID: true, subscriberID: true },
    });
    if (!mapping) throw new NotFoundException('Application not found');
    const review = await this.ensureReview(mapId);
    if (review.status !== MatchReviewStatus.NEW) {
      // 409, not 404: the application exists, it has simply already been decided. A 404 here
      // read as "no such application" in the client's error handling.
      throw new ConflictException(`This application is already ${review.status}`);
    }
    return mapping;
  }

  private async recordDecision(
    mapId: number,
    status: MatchReviewStatusValue,
    note: string | undefined,
    userId: number,
    action: string,
  ) {
    const now = new Date();
    await this.db.applicationMatchReview.update({
      where: { jobSubscriberMapID: BigInt(mapId) },
      data: {
        status,
        decisionNote: note ?? null,
        decidedAt: now,
        decidedBy: BigInt(userId),
        timestampUpd: now,
        loginIDUpd: BigInt(userId),
      },
    });
    await this.audit.record({
      userId,
      action,
      entity: 'ApplicationMatchReview',
      entityId: mapId,
      detail: { note: note ?? null },
    });
    return { mapId, status };
  }
}
