import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { JOB_STATUS_ACTIVE } from '@/shared/status';
import { JobApplicationsService } from './job-application.service';
import type { JobSearchQueryDto, FullTextSearchQueryDto, SuggestionsQueryDto } from './dto/jobs.dto';

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

/** Extended search result includes a relevance rank. */
export interface PublicJobWithRank extends PublicJob {
  rank?: number;
}

/** Extended detail returned by the single-job endpoint. */
export interface JobDetail extends PublicJob {
  description: string | null;
  candidateProfile: string | null;
  maxExp: number | null;
  skills: string[];
  educationTypes: string[];
  companyLogo: string | null;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
    private readonly applications: JobApplicationsService,
  ) {}

  private filtersCache: { data: unknown; expiry: number } | null = null;
  private static readonly FILTERS_TTL = 5 * 60_000; // 5 minutes

  private get db() {
    return this.prisma.client;
  }

  /**
   * Master lists for the public search.
   */
  async filters() {
    if (this.filtersCache && Date.now() < this.filtersCache.expiry) {
      return this.filtersCache.data;
    }

    const [designations, industries, states, cities, workModes, empTypes, skills, functions] = await Promise.all([
      this.db.mstrDesignation.findMany({ select: { descr: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrIndustryType.findMany({
        select: { industryType: true },
        orderBy: { industryType: 'asc' },
      }),
      this.db.mstrState.findMany({ select: { stateID: true, descr: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrCily.findMany({ select: { descr: true, stateID: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrWorkMode.findMany({ select: { descr: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrEmpType.findMany({ select: { descr: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrSkills.findMany({ select: { descr: true }, orderBy: { descr: 'asc' } }),
      this.db.mstrFunctions.findMany({
        select: { descr: true, MstrSubFunctions: { select: { descr: true }, orderBy: { descr: 'asc' } } },
        orderBy: { descr: 'asc' },
      }),
    ]);
    const clean = (xs: (string | null)[]) => xs.filter((d): d is string => !!d?.trim());
    const result = {
      designations: clean(designations.map((d) => d.descr)),
      industries: clean(industries.map((i) => i.industryType)),
      states: clean(states.map((s) => s.descr)),
      locations: clean(cities.map((c) => c.descr)),
      cityByState: Object.fromEntries(
        states.map((s) => [s.descr ?? '', clean(cities.filter((c) => c.stateID === s.stateID).map((c) => c.descr))]),
      ),
      roleByFunction: Object.fromEntries(
        functions
          .filter((f) => f.descr?.trim())
          .map((f) => [f.descr!, clean(f.MstrSubFunctions.map((sf) => sf.descr))]),
      ),
      workModes: clean(workModes.map((w) => w.descr)),
      employmentTypes: clean(empTypes.map((e) => e.descr)),
      skills: clean(skills.map((s) => s.descr)),
    };
    this.filtersCache = { data: result, expiry: Date.now() + JobsService.FILTERS_TTL };
    return result;
  }

  /** Compute a date cutoff for "posted within" filter. */
  private postedWithinDate(postedWithin?: '24h' | '7d' | '30d'): Date | undefined {
    if (!postedWithin) return undefined;
    const now = new Date();
    switch (postedWithin) {
      case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  /** Public job search, filtered on the axes a job actually has. */
  async search(q: JobSearchQueryDto) {
    const eq = (value?: string) =>
      value ? { equals: value, mode: 'insensitive' as const } : undefined;

    const dateCutoff = this.postedWithinDate(q.postedWithin);

    const where: Prisma.ClientJobsWhereInput = {
      statusID: JOB_STATUS_ACTIVE,
      ...(q.designation ? { designation: { descr: eq(q.designation) } } : {}),
      ...(q.industry ? { industryType: { industryType: eq(q.industry) } } : {}),
      // Single location (backward compat)
      ...(q.location ? { jobCity: { descr: eq(q.location) } } : {}),
      // Single workMode (backward compat)
      ...(q.workMode ? { workMode: { descr: eq(q.workMode) } } : {}),
      // Single employmentType (backward compat)
      ...(q.employmentType ? { employeeType: { descr: eq(q.employmentType) } } : {}),
      // Multiple work modes
      ...(q.workModes?.length ? { workMode: { descr: { in: q.workModes, mode: 'insensitive' } } } : {}),
      // Multiple employment types
      ...(q.employmentTypes?.length ? { employeeType: { descr: { in: q.employmentTypes, mode: 'insensitive' } } } : {}),
      // Multiple locations (cities)
      ...(q.locations?.length ? { jobCity: { descr: { in: q.locations, mode: 'insensitive' } } } : {}),
      // Multiple states
      ...(q.states?.length ? { jobCity: { state: { descr: { in: q.states, mode: 'insensitive' } } } } : {}),
      // Experience range
      ...(q.minExp != null || q.maxExp != null
        ? {
            minExp: {
              ...(q.minExp != null ? { gte: q.minExp } : {}),
              ...(q.maxExp != null ? { lte: q.maxExp } : {}),
            },
          }
        : {}),
      // Salary range
      ...(q.minCtc != null ? { maxCTC: { gte: q.minCtc } } : {}),
      ...(q.maxCtc != null ? { minCTC: { lte: q.maxCtc } } : {}),
      // Skills filter
      ...(q.skills?.length
        ? { ClientJobSkill: { some: { skill: { descr: { in: q.skills, mode: 'insensitive' } } } } }
        : {}),
      // Posted within
      ...(dateCutoff ? { timestampIns: { gte: dateCutoff } } : {}),
    };

    const orderBy =
      q.sortBy === 'salary_high'
        ? { maxCTC: 'desc' as const }
        : q.sortBy === 'salary_low'
          ? { minCTC: 'asc' as const }
          : { timestampIns: 'desc' as const };

    const [rows, total] = await Promise.all([
      this.db.clientJobs.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy,
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

  /**
   * Full-text search across designation, company name, description, and skills
   * using PostgreSQL to_tsvector / to_tsquery with ts_rank for relevance.
   */
  async fullTextSearch(q: FullTextSearchQueryDto) {
    const searchTerm = (q.q ?? '').trim();
    if (!searchTerm) {
      // Fall back to a basic listing when no search query provided
      return this.search({
        page: q.page,
        pageSize: q.pageSize,
        minCtc: q.minCtc,
        maxCtc: q.maxCtc,
        workModes: q.workModes,
        employmentTypes: q.employmentTypes,
        locations: q.locations,
        skills: q.skills,
        minExp: q.minExp,
        maxExp: q.maxExp,
        postedWithin: q.postedWithin,
        sortBy: q.sortBy === 'relevance' ? 'newest' : q.sortBy,
      });
    }

    // Sanitize the search term for tsquery: split words and join with &
    const tsQueryTerms = searchTerm
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `${w}:*`)
      .join(' & ');

    if (!tsQueryTerms) {
      return { rows: [], total: 0 };
    }

    // Build filter clauses
    const filterClauses: string[] = [`j."StatusID" = ${JOB_STATUS_ACTIVE}`];
    const params: unknown[] = [tsQueryTerms];
    let paramIndex = 2;

    if (q.minCtc != null) {
      filterClauses.push(`j."MaxCTC" >= $${paramIndex}`);
      params.push(q.minCtc);
      paramIndex++;
    }
    if (q.maxCtc != null) {
      filterClauses.push(`j."MinCTC" <= $${paramIndex}`);
      params.push(q.maxCtc);
      paramIndex++;
    }
    if (q.minExp != null) {
      filterClauses.push(`j."MinExp" >= $${paramIndex}`);
      params.push(q.minExp);
      paramIndex++;
    }
    if (q.maxExp != null) {
      filterClauses.push(`j."MinExp" <= $${paramIndex}`);
      params.push(q.maxExp);
      paramIndex++;
    }
    if (q.workModes?.length) {
      filterClauses.push(`wm."Descr" = ANY($${paramIndex}::text[])`);
      params.push(q.workModes);
      paramIndex++;
    }
    if (q.employmentTypes?.length) {
      filterClauses.push(`et."Descr" = ANY($${paramIndex}::text[])`);
      params.push(q.employmentTypes);
      paramIndex++;
    }
    if (q.locations?.length) {
      filterClauses.push(`c."Descr" = ANY($${paramIndex}::text[])`);
      params.push(q.locations);
      paramIndex++;
    }
    if (q.skills?.length) {
      filterClauses.push(`EXISTS (
        SELECT 1 FROM "tblClientJobSkill" cjs
        JOIN "tblMstrSkills" ms ON ms."SkillID" = cjs."SkillID"
        WHERE cjs."JobID" = j."JobID" AND ms."Descr" = ANY($${paramIndex}::text[])
      )`);
      params.push(q.skills);
      paramIndex++;
    }
    const dateCutoff = this.postedWithinDate(q.postedWithin);
    if (dateCutoff) {
      filterClauses.push(`j."TimestampIns" >= $${paramIndex}::timestamp`);
      params.push(dateCutoff);
      paramIndex++;
    }

    const whereClause = filterClauses.join(' AND ');

    const orderClause = q.sortBy === 'salary_high'
      ? 'j."MaxCTC" DESC'
      : q.sortBy === 'salary_low'
        ? 'j."MinCTC" ASC'
        : q.sortBy === 'newest'
          ? 'j."TimestampIns" DESC'
          : 'rank DESC, j."TimestampIns" DESC';

    const offset = (q.page - 1) * q.pageSize;

    // Full-text search query with ts_rank
    const sql = `
      SELECT
        j."JobID" AS "jobId",
        d."Descr" AS "designation",
        cm."ClientName" AS "company",
        it."IndustryType" AS "industry",
        c."Descr" AS "city",
        wm."Descr" AS "workMode",
        et."Descr" AS "employmentType",
        COALESCE(j."MinExp", 0) AS "minExp",
        j."MinCTC" AS "minCtc",
        j."MaxCTC" AS "maxCtc",
        j."TimestampIns" AS "postedOn",
        ts_rank(
          to_tsvector('english',
            COALESCE(d."Descr", '') || ' ' ||
            COALESCE(cm."ClientName", '') || ' ' ||
            COALESCE(j."JobDescr", '') || ' ' ||
            COALESCE((
              SELECT string_agg(ms."Descr", ' ')
              FROM "tblClientJobSkill" cjs
              JOIN "tblMstrSkills" ms ON ms."SkillID" = cjs."SkillID"
              WHERE cjs."JobID" = j."JobID"
            ), '')
          ),
          to_tsquery('english', $1)
        ) AS rank
      FROM "tblClientJobs" j
      LEFT JOIN "tblMstrDesignation" d ON d."DesignationID" = j."DesignationID"
      LEFT JOIN "tblClientMstr" cm ON cm."ClientID" = j."ClientID"
      LEFT JOIN "tblMstrIndustryType" it ON it."IndustryTypeID" = j."IndustryTypeID"
      LEFT JOIN "tblMstrCily" c ON c."CityID" = j."JobCityID"
      LEFT JOIN "tblMstrWorkMode" wm ON wm."WorkModeID" = j."WorkModeID"
      LEFT JOIN "tblMstrEmpType" et ON et."EmployeeTypeID" = j."EmployeeTypeID"
      WHERE ${whereClause}
        AND to_tsvector('english',
          COALESCE(d."Descr", '') || ' ' ||
          COALESCE(cm."ClientName", '') || ' ' ||
          COALESCE(j."JobDescr", '') || ' ' ||
          COALESCE((
            SELECT string_agg(ms."Descr", ' ')
            FROM "tblClientJobSkill" cjs
            JOIN "tblMstrSkills" ms ON ms."SkillID" = cjs."SkillID"
            WHERE cjs."JobID" = j."JobID"
          ), '')
        ) @@ to_tsquery('english', $1)
      ORDER BY ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(q.pageSize, offset);

    // Count query
    const countSql = `
      SELECT COUNT(*)::int AS total
      FROM "tblClientJobs" j
      LEFT JOIN "tblMstrDesignation" d ON d."DesignationID" = j."DesignationID"
      LEFT JOIN "tblClientMstr" cm ON cm."ClientID" = j."ClientID"
      LEFT JOIN "tblMstrCily" c ON c."CityID" = j."JobCityID"
      LEFT JOIN "tblMstrWorkMode" wm ON wm."WorkModeID" = j."WorkModeID"
      LEFT JOIN "tblMstrEmpType" et ON et."EmployeeTypeID" = j."EmployeeTypeID"
      WHERE ${whereClause}
        AND to_tsvector('english',
          COALESCE(d."Descr", '') || ' ' ||
          COALESCE(cm."ClientName", '') || ' ' ||
          COALESCE(j."JobDescr", '') || ' ' ||
          COALESCE((
            SELECT string_agg(ms."Descr", ' ')
            FROM "tblClientJobSkill" cjs
            JOIN "tblMstrSkills" ms ON ms."SkillID" = cjs."SkillID"
            WHERE cjs."JobID" = j."JobID"
          ), '')
        ) @@ to_tsquery('english', $1)
    `;

    const countParams = params.slice(0, -2); // exclude LIMIT and OFFSET

    const [rows, countResult] = await Promise.all([
      this.db.$queryRawUnsafe<Array<{
        jobId: bigint;
        designation: string | null;
        company: string | null;
        industry: string | null;
        city: string | null;
        workMode: string | null;
        employmentType: string | null;
        minExp: number;
        minCtc: number;
        maxCtc: number;
        postedOn: Date;
        rank: number;
      }>>(sql, ...params),
      this.db.$queryRawUnsafe<Array<{ total: number }>>(countSql, ...countParams),
    ]);

    return {
      rows: rows.map(
        (r): PublicJobWithRank => ({
          jobId: Number(r.jobId),
          designation: r.designation ?? '',
          company: r.company ?? '',
          industry: r.industry ?? '',
          city: r.city ?? '',
          workMode: r.workMode ?? '',
          employmentType: r.employmentType ?? '',
          minExp: r.minExp ?? 0,
          minCtc: r.minCtc,
          maxCtc: r.maxCtc,
          postedOn: r.postedOn instanceof Date ? r.postedOn.toISOString().slice(0, 10) : String(r.postedOn).slice(0, 10),
          rank: Number(r.rank),
        }),
      ),
      total: countResult[0]?.total ?? 0,
    };
  }

  /**
   * Autocomplete suggestions: returns top 5 matching designations, company names,
   * and skills based on partial input.
   */
  async suggestions(q: SuggestionsQueryDto) {
    const term = (q.q ?? '').trim();
    if (!term) return { suggestions: [] };

    const [designations, companies, skillResults] = await Promise.all([
      this.db.mstrDesignation.findMany({
        where: { descr: { contains: term, mode: 'insensitive' } },
        select: { descr: true },
        take: 5,
        orderBy: { descr: 'asc' },
      }),
      this.db.clientMstr.findMany({
        where: {
          clientName: { contains: term, mode: 'insensitive' },
          ClientJobs: { some: { statusID: JOB_STATUS_ACTIVE } },
        },
        select: { clientName: true },
        take: 5,
        orderBy: { clientName: 'asc' },
        distinct: ['clientName'],
      }),
      this.db.mstrSkills.findMany({
        where: { descr: { contains: term, mode: 'insensitive' } },
        select: { descr: true },
        take: 5,
        orderBy: { descr: 'asc' },
      }),
    ]);

    // Merge unique suggestions, prioritize designations
    const seen = new Set<string>();
    const suggestions: Array<{ text: string; type: 'designation' | 'company' | 'skill' }> = [];

    for (const d of designations) {
      const text = d.descr?.trim();
      if (text && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        suggestions.push({ text, type: 'designation' });
      }
    }
    for (const c of companies) {
      const text = c.clientName?.trim();
      if (text && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        suggestions.push({ text, type: 'company' });
      }
    }
    for (const s of skillResults) {
      const text = s.descr?.trim();
      if (text && !seen.has(text.toLowerCase())) {
        seen.add(text.toLowerCase());
        suggestions.push({ text, type: 'skill' });
      }
    }

    return { suggestions: suggestions.slice(0, 5) };
  }

  /** A single public job listing, for the job-detail page. */
  async byId(jobId: number): Promise<JobDetail> {
    const j = await this.db.clientJobs.findUnique({
      where: { jobID: jobId },
      include: {
        client: { select: { clientID: true, clientName: true, companyLogo: true } },
        jobCity: { select: { descr: true } },
        designation: { select: { descr: true } },
        industryType: { select: { industryType: true } },
        employeeType: { select: { descr: true } },
        workMode: { select: { descr: true } },
        ClientJobSkill: { include: { skill: { select: { descr: true } } } },
        ClientJobs_EducationType: { include: { educationType: { select: { descr: true } } } },
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
      maxExp: j.maxEmp ?? null,
      minCtc: j.minCTC,
      maxCtc: j.maxCTC,
      postedOn: j.timestampIns.toISOString().slice(0, 10),
      description: j.jobDescr ?? null,
      candidateProfile: j.jobCandidateProfile ?? null,
      skills: j.ClientJobSkill.map((s) => s.skill?.descr).filter((s): s is string => !!s),
      educationTypes: j.ClientJobs_EducationType.map((e) => e.educationType?.descr).filter((e): e is string => !!e),
      companyLogo: j.client?.companyLogo?.trim()
        ? `/api/clients/${Number(j.clientID)}/logo`
        : null,
    };
  }

  /** Candidate self-apply (applyforjob.aspx's structured-application counterpart). */
  async apply(userId: number, jobId: number) {
    const subscriberId = await this.candidates.subscriberIdFor(userId);
    return this.applications.apply(subscriberId, jobId, userId);
  }

  /** Recommended jobs for the signed-in candidate, based on skills, city, and industry. */
  async recommended(userId: number) {
    const subscriberId = await this.candidates.subscriberIdFor(userId);
    return this.candidates.recommendations(subscriberId);
  }
}
