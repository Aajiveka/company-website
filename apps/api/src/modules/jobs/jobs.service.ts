import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JOB_STATUS_ACTIVE } from '@/shared/status';
import { JobApplicationsService } from './job-application.service';
import type { JobSearchQueryDto } from './dto/jobs.dto';

/** A job as the public site shows it (tblClientJobs joined out to its lookups). */
export interface PublicJob {
  jobId: number;
  designation: string;
  company: string;
  industry: string;
  city: string;
  workMode: string;
  employmentType: string;
  minExp: number;
  minCtc: number;
  maxCtc: number;
  postedOn: string;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
    private readonly applications: JobApplicationsService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /**
   * Master lists for the public search.
   *
   * The home hero's first dropdown was labelled "Function / keyword", but a job HAS NO
   * FUNCTION in this schema: tblMstrDesignation is just (DesignationID, Descr), and the
   * SubFunction -> Function chain hangs off tblSubscriberCVDetails — the CANDIDATE side.
   * Nothing links tblClientJobs to tblMstrFunctions. (The legacy site never actually
   * searched: its button navigated straight to Pricing.aspx.)
   *
   * So the searchable axes of a job are its designation, its industry and its city, and
   * that is what this returns.
   */
  async filters() {
    const [designations, industries, states, cities] = await Promise.all([
      this.db.mstrDesignation.findMany({ select: { descr: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrIndustryType.findMany({
        select: { industryType: true },
        orderBy: { industryType: 'asc' },
      }),
      this.db.mstrState.findMany({ select: { stateID: true, descr: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrCily.findMany({ select: { descr: true, stateID: true }, orderBy: { descr: 'asc' } }),
    ]);
    const clean = (xs: (string | null)[]) => xs.filter((d): d is string => !!d?.trim());
    return {
      designations: clean(designations.map((d) => d.descr)),
      industries: clean(industries.map((i) => i.industryType)),
      states: clean(states.map((s) => s.descr)),
      locations: clean(cities.map((c) => c.descr)),
      cityByState: Object.fromEntries(
        states.map((s) => [s.descr ?? '', clean(cities.filter((c) => c.stateID === s.stateID).map((c) => c.descr))]),
      ),
    };
  }

  /** Public job search, filtered on the axes a job actually has. */
  async search(q: JobSearchQueryDto) {
    const eq = (value?: string) =>
      value ? { equals: value, mode: 'insensitive' as const } : undefined;

    const where = {
      statusID: JOB_STATUS_ACTIVE,
      ...(q.designation ? { designation: { descr: eq(q.designation) } } : {}),
      ...(q.industry ? { industryType: { industryType: eq(q.industry) } } : {}),
      ...(q.location ? { jobCity: { descr: eq(q.location) } } : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.clientJobs.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { timestampIns: 'desc' },
        include: {
          client: { select: { clientName: true } },
          jobCity: { select: { descr: true } },
          designation: { select: { descr: true } },
          industryType: { select: { industryType: true } },
          employeeType: { select: { descr: true } },
          workMode: { select: { descr: true } },
        },
      }),
      this.db.clientJobs.count({ where }),
    ]);

    return {
      rows: rows.map(
        (j): PublicJob => ({
          jobId: Number(j.jobID),
          designation: j.designation?.descr ?? '',
          company: j.client?.clientName ?? '',
          industry: j.industryType?.industryType ?? '',
          city: j.jobCity?.descr ?? '',
          workMode: j.workMode?.descr ?? '',
          employmentType: j.employeeType?.descr ?? '',
          minExp: j.minExp ?? 0,
          minCtc: j.minCTC,
          maxCtc: j.maxCTC,
          postedOn: j.timestampIns.toISOString().slice(0, 10),
        }),
      ),
      total,
    };
  }

  /** A single public job listing, for the job-detail page. */
  async byId(jobId: number): Promise<PublicJob> {
    const j = await this.db.clientJobs.findUnique({
      where: { jobID: jobId },
      include: {
        client: { select: { clientName: true } },
        jobCity: { select: { descr: true } },
        designation: { select: { descr: true } },
        industryType: { select: { industryType: true } },
        employeeType: { select: { descr: true } },
        workMode: { select: { descr: true } },
      },
    });
    if (!j) throw new NotFoundException('Job not found');
    return {
      jobId: Number(j.jobID),
      designation: j.designation?.descr ?? '',
      company: j.client?.clientName ?? '',
      industry: j.industryType?.industryType ?? '',
      city: j.jobCity?.descr ?? '',
      workMode: j.workMode?.descr ?? '',
      employmentType: j.employeeType?.descr ?? '',
      minExp: j.minExp ?? 0,
      minCtc: j.minCTC,
      maxCtc: j.maxCTC,
      postedOn: j.timestampIns.toISOString().slice(0, 10),
    };
  }

  /** Candidate self-apply (applyforjob.aspx's structured-application counterpart). */
  async apply(userId: number, jobId: number) {
    const subscriberId = await this.candidates.subscriberIdFor(userId);
    return this.applications.apply(subscriberId, jobId, userId);
  }
}
