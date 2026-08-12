import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import {
  JOB_STATUS_ACTIVE,
  JOB_STATUS_ARCHIVED,
  JOB_STATUS_CLOSED,
  JOB_STATUS_DRAFT,
  JobMapStatus,
  SubscriberStatus,
} from '@/shared/status';
import type {
  ApplicantDecisionDto,
  ApplicantNoteDto,
  CreateJobDto,
  InterviewRoundDto,
  ListApplicantsQueryDto,
  ListJobsQueryDto,
  UpdateBrandingDto,
  UpdateCompanyProfileDto,
  UpdateJobDto,
} from './dto/employers.dto';

type PipelineStatus = 'New' | 'Shortlisted' | 'Interview' | 'Hired' | 'Rejected';

const INTERVIEW_MAP_STATUSES: number[] = [
  JobMapStatus.INTERVIEW_SCHEDULED,
  JobMapStatus.INTERVIEW_ATTENDED,
  JobMapStatus.RESCHEDULE_REQUESTED,
  JobMapStatus.RESCHEDULED,
];

function pipelineStatus(statusId: number | null | undefined): PipelineStatus {
  if (statusId === JobMapStatus.SHORTLISTED) return 'Shortlisted';
  if (statusId != null && INTERVIEW_MAP_STATUSES.includes(statusId)) return 'Interview';
  if (statusId === JobMapStatus.SELECTED) return 'Hired';
  if (statusId === JobMapStatus.REJECTED) return 'Rejected';
  return 'New';
}

function jobMapIdsForPipeline(status: PipelineStatus): number[] {
  if (status === 'Shortlisted') return [JobMapStatus.SHORTLISTED];
  if (status === 'Interview') return INTERVIEW_MAP_STATUSES;
  if (status === 'Hired') return [JobMapStatus.SELECTED];
  if (status === 'Rejected') return [JobMapStatus.REJECTED];
  return [JobMapStatus.MAPPED];
}

const jobStatus = (statusId: number | null) => {
  if (statusId === JOB_STATUS_ACTIVE) return 'Active';
  if (statusId === JOB_STATUS_DRAFT) return 'Draft';
  if (statusId === JOB_STATUS_ARCHIVED) return 'Archived';
  return 'Closed';
};

function encodeInterviewProcess(rounds?: InterviewRoundDto[] | null): string | null {
  if (!rounds?.length) return null;
  return JSON.stringify(rounds.map((r) => ({ round: r.round, process: r.process ?? '' })));
}

function decodeInterviewProcess(raw: string | null | undefined): InterviewRoundDto[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as InterviewRoundDto[];
    if (Array.isArray(parsed)) {
      return parsed.map((r, i) => ({
        round: Number(r.round) || i + 1,
        process: String(r.process ?? ''),
      }));
    }
  } catch {
    // Legacy pipe-joined process-only strings
  }
  return raw
    .split('|')
    .map((p, i) => ({ round: i + 1, process: p.trim() }))
    .filter((r) => r.process);
}

/** Normalize labels so "Full time" ≈ "Full Time", "In-office" ≈ "Work From Office", etc. */
function normalizeMasterLabel(label: string): string {
  const s = label.toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (['full time', 'fulltime'].includes(s)) return 'full time';
  if (['part time', 'parttime'].includes(s)) return 'part time';
  if (['internship', 'intern'].includes(s)) return 'internship';
  if (['contract', 'contractual'].includes(s)) return 'contract';
  if (['in office', 'onsite', 'on site', 'work from office', 'wfo'].includes(s)) return 'in office';
  if (['remote', 'work from home', 'wfh'].includes(s)) return 'remote';
  if (['hybrid'].includes(s)) return 'hybrid';
  // City aliases used in CSVs / Naukri-style dumps
  if (['bangalore', 'bengaluru', 'bengalooru'].includes(s)) return 'bengaluru';
  if (['gurgaon', 'gurugram'].includes(s)) return 'gurugram';
  if (['bombay', 'mumbai'].includes(s)) return 'mumbai';
  if (['calcutta', 'kolkata'].includes(s)) return 'kolkata';
  if (['madras', 'chennai'].includes(s)) return 'chennai';
  if (['new delhi', 'delhi ncr', 'delhi'].includes(s)) return 'delhi';
  if (['db admin', 'dba', 'database admin', 'database administrator', 'data base administrator'].includes(s)) {
    return 'database admin';
  }
  return s;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === ',' && !inQuotes) {
      cells.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

function headerKey(h: string): string {
  return h
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The employer (client) side — tblClientMstr and the jobs it owns. */
@Injectable()
export class EmployersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly applications: JobApplicationsService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /**
   * A login reaches its company through the person node, exactly as spClientGetCompanyInfo
   * joins it:
   *
   *   tblSecUser.NodeID -> tblMstrPerson.PersonNodeID -> tblMstrPerson.ClientID
   *
   * tblClientMstr also HAS a UserID column, which looks like the obvious link — but it is
   * NULL on every row in the data, so it is not the one the app uses.
   */
  private async clientIdFor(userId: number) {
    const user = await this.db.secUser.findUnique({
      where: { userID: userId },
      select: { nodeID: true },
    });
    const person = user?.nodeID
      ? await this.db.mstrPerson.findUnique({
          where: { personNodeID: user.nodeID },
          select: { clientID: true },
        })
      : null;
    if (!person?.clientID) throw new NotFoundException('No company is linked to this login');
    return person.clientID;
  }

  /** Port of spClientGetCompanyInfo. */
  async profile(userId: number) {
    const clientId = await this.clientIdFor(userId);
    const c = await this.db.clientMstr.findUnique({
      where: { clientID: clientId },
      include: {
        city: { select: { descr: true } },
        industryType: { select: { industryType: true } },
      },
    });
    if (!c) throw new NotFoundException('Company not found');

    return {
      clientId: Number(c.clientID),
      clientName: c.clientName ?? '',
      industry: c.industryType?.industryType ?? '',
      industryTypeId: c.industryTypeID,
      email: c.emailID ?? '',
      contactNo: c.contactNo ?? '',
      website: c.companyWebsite ?? '',
      city: c.city?.descr ?? '',
      cityId: c.cityID,
      address: c.clientAddress ?? '',
      logoUrl: c.companyLogo?.trim() ? `/files/${c.companyLogo}` : null,
      description: c.companyDescr ?? '',
    };
  }

  /** Update owned company profile fields on tblClientMstr. */
  async updateProfile(userId: number, dto: UpdateCompanyProfileDto) {
    const clientId = await this.clientIdFor(userId);
    await this.db.clientMstr.update({
      where: { clientID: clientId },
      data: {
        ...(dto.clientName !== undefined && { clientName: dto.clientName.trim() }),
        ...(dto.email !== undefined && { emailID: dto.email.trim() || null }),
        ...(dto.contactNo !== undefined && { contactNo: dto.contactNo.trim() || null }),
        ...(dto.website !== undefined && { companyWebsite: dto.website.trim() || null }),
        ...(dto.address !== undefined && { clientAddress: dto.address.trim() || null }),
        ...(dto.description !== undefined && { companyDescr: dto.description.trim() || null }),
        ...(dto.cityId !== undefined && { cityID: dto.cityId }),
        ...(dto.industryTypeId !== undefined && { industryTypeID: dto.industryTypeId }),
        ...(dto.companyLogo !== undefined && { companyLogo: dto.companyLogo.trim() || null }),
        timestampUpd: new Date(),
        loginIDUpd: userId,
      },
    });
    await this.audit.record({
      userId,
      action: 'company.profile.update',
      entity: 'ClientMstr',
      entityId: Number(clientId),
    });
    return this.profile(userId);
  }

  /** Port of spClientGetJoblisting — paginated company openings with search/filters. */
  async jobs(userId: number, query: ListJobsQueryDto = {}) {
    const clientId = await this.clientIdFor(userId);
    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 10;
    const q = query.q?.trim() ?? '';
    const city = query.city?.trim() ?? '';
    const status = query.status;

    const where: Record<string, unknown> = { clientID: clientId };
    if (status === 'Active') where.statusID = JOB_STATUS_ACTIVE;
    if (status === 'Closed') where.statusID = JOB_STATUS_CLOSED;
    if (status === 'Draft') where.statusID = JOB_STATUS_DRAFT;
    if (status === 'Archived') where.statusID = JOB_STATUS_ARCHIVED;
    // Default list (All) hides drafts + archived so they only appear under their tabs
    if (!status) where.statusID = { notIn: [JOB_STATUS_ARCHIVED, JOB_STATUS_DRAFT] };

    if (city) {
      where.jobCity = { descr: { equals: city, mode: 'insensitive' } };
    }

    if (q) {
      where.OR = [
        { designation: { descr: { contains: q, mode: 'insensitive' } } },
        { department: { contains: q, mode: 'insensitive' } },
        { subDepartment: { contains: q, mode: 'insensitive' } },
        { jobDescr: { contains: q, mode: 'insensitive' } },
        { jobCity: { descr: { contains: q, mode: 'insensitive' } } },
        { employeeType: { descr: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const [total, rows, statusCounts, cities] = await Promise.all([
      this.db.clientJobs.count({ where }),
      this.db.clientJobs.findMany({
        where,
        orderBy: { timestampIns: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          jobCity: { select: { descr: true } },
          designation: { select: { descr: true } },
          employeeType: { select: { descr: true } },
          workMode: { select: { descr: true } },
          ClientJobSkill: { select: { skillID: true } },
          _count: { select: { JobSubscriberMapping: true } },
        },
      }),
      this.jobStatusCounts(clientId),
      this.jobCities(clientId),
    ]);

    const items = rows.map((j) => ({
      jobId: Number(j.jobID),
      designation: j.designation?.descr ?? '',
      designationId: j.designationID,
      city: j.jobCity?.descr ?? '',
      cityId: j.jobCityID,
      workMode: j.workMode?.descr ?? '',
      workModeId: j.workModeID,
      employmentType: j.employeeType?.descr ?? '',
      employmentTypeId: j.employeeTypeID,
      industryTypeId: j.industryTypeID,
      description: j.jobDescr ?? '',
      candidateProfile: j.jobCandidateProfile ?? '',
      openings: j.maxEmp,
      skillIds: j.ClientJobSkill.map((s) => s.skillID),
      minExp: j.minExp ?? 0,
      maxExp: j.maxExp ?? null,
      minCtc: j.minCTC,
      maxCtc: j.maxCTC,
      educationDetail: j.educationDetail ?? '',
      reportTo: j.reportTo ?? '',
      teamSize: j.teamSize ?? null,
      department: j.department ?? '',
      subDepartment: j.subDepartment ?? '',
      interviewProcess: decodeInterviewProcess(j.interviewProcess),
      status: jobStatus(j.statusID),
      applicants: j._count.JobSubscriberMapping,
      postedOn: j.timestampIns.toISOString().slice(0, 10),
    }));

    return {
      items,
      total,
      page,
      pageSize,
      pageCount: Math.ceil(total / pageSize) || 0,
      counts: statusCounts,
      cities,
    };
  }

  private async jobStatusCounts(clientId: bigint) {
    const [all, active, closed, draft, archived] = await Promise.all([
      this.db.clientJobs.count({
        where: {
          clientID: clientId,
          statusID: { notIn: [JOB_STATUS_ARCHIVED, JOB_STATUS_DRAFT] },
        },
      }),
      this.db.clientJobs.count({ where: { clientID: clientId, statusID: JOB_STATUS_ACTIVE } }),
      this.db.clientJobs.count({ where: { clientID: clientId, statusID: JOB_STATUS_CLOSED } }),
      this.db.clientJobs.count({ where: { clientID: clientId, statusID: JOB_STATUS_DRAFT } }),
      this.db.clientJobs.count({ where: { clientID: clientId, statusID: JOB_STATUS_ARCHIVED } }),
    ]);
    return { all, active, closed, draft, archived };
  }

  private async jobCities(clientId: bigint) {
    const rows = await this.db.clientJobs.findMany({
      where: { clientID: clientId },
      select: { jobCity: { select: { descr: true } } },
      distinct: ['jobCityID'],
    });
    return rows
      .map((r) => r.jobCity?.descr ?? '')
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }

  /**
   * Port of spClientManageJob (insert path). The legacy proc writes several rows with NO
   * transaction — there is not a single BEGIN TRAN in the 97 procs — so a half-written job
   * was possible. This wraps the writes.
   */
  async createJob(userId: number, dto: CreateJobDto, draft?: boolean) {
    const clientId = await this.clientIdFor(userId);

    return this.db.$transaction(async (tx) => {
      const job = await tx.clientJobs.create({
        data: {
          clientID: clientId,
          designationID: dto.designationId,
          employeeTypeID: dto.employmentTypeId,
          workModeID: dto.workModeId,
          jobCityID: dto.cityId,
          industryTypeID: dto.industryTypeId ?? null,
          jobDescr: dto.description ?? null,
          jobCandidateProfile: dto.candidateProfile ?? null,
          minExp: dto.minExp ?? null,
          maxExp: dto.maxExp ?? null,
          minCTC: dto.minCtc,
          maxCTC: dto.maxCtc,
          maxEmp: dto.openings ?? null,
          educationDetail: dto.educationDetail?.trim() || null,
          reportTo: dto.reportTo?.trim() || null,
          teamSize: dto.teamSize ?? null,
          department: dto.department?.trim() || null,
          subDepartment: dto.subDepartment?.trim() || null,
          interviewProcess: encodeInterviewProcess(dto.interviewProcess),
          statusID: draft ? JOB_STATUS_DRAFT : JOB_STATUS_ACTIVE,
          timestampIns: new Date(),
          loginIDIns: userId,
        },
      });

      if (dto.skillIds?.length) {
        // tblClientJobSkill is just (JobSkillID, JobID, SkillID) — it carries no audit columns.
        await tx.clientJobSkill.createMany({
          data: dto.skillIds.map((skillID) => ({ jobID: job.jobID, skillID })),
        });
      }

      return { jobId: Number(job.jobID) };
    });
  }

  /** Candidates who applied to any of this company's jobs (spClientGetJobSubscribers). */
  async applicants(userId: number, query: ListApplicantsQueryDto = {}) {
    const clientId = await this.clientIdFor(userId);
    const statusFilter = query.status;
    const q = query.q?.trim() ?? '';

    const where: Record<string, unknown> = { job: { clientID: clientId } };
    if (statusFilter) {
      where.jobMapStatusID = { in: jobMapIdsForPipeline(statusFilter) };
    }

    const rows = await this.db.jobSubscriberMapping.findMany({
      where,
      orderBy: { mapDate: 'desc' },
      include: {
        jobMapStatus: { select: { descr: true } },
        job: { include: { designation: { select: { descr: true } } } },
        subscriber: {
          include: {
            SubscriberCVDetails: {
              include: {
                city: { select: { descr: true } },
                skill: { select: { descr: true } },
              },
            },
            SubscriberEmployer: {
              orderBy: { timestampIns: 'desc' },
              take: 1,
              include: { designation: { select: { descr: true } } },
            },
          },
        },
      },
    });

    let mapped = rows.map((r) => {
      const cv = r.subscriber?.SubscriberCVDetails;
      const current = r.subscriber?.SubscriberEmployer?.[0];
      const status = pipelineStatus(r.jobMapStatusID);
      const skills = [cv?.skill?.descr].filter(Boolean) as string[];
      return {
        jobSubscriberMapId: Number(r.jobSubscriberMapID),
        subscriberId: Number(r.subscriberID ?? 0),
        fullName: cv?.fullName?.trim() || cv?.mobileNo1 || '',
        designation: r.job?.designation?.descr ?? '',
        city: cv?.city?.descr ?? '',
        experience: cv?.totalExp != null ? `${cv.totalExp} yrs` : '',
        jobStatus: r.jobMapStatus?.descr ?? 'Applied',
        status,
        skills,
        company: current?.employer ?? '',
        notice: cv?.noticePeriod != null ? `${cv.noticePeriod} days` : current?.noticePeriodDays != null ? `${current.noticePeriodDays} days` : '',
        appliedOn: r.mapDate?.toISOString().slice(0, 10) ?? '',
        email: cv?.emailID ?? '',
        mobile: cv?.mobileNo1 ?? '',
      };
    });

    if (q) {
      const needle = q.toLowerCase();
      mapped = mapped.filter(
        (a) =>
          a.fullName.toLowerCase().includes(needle) ||
          a.designation.toLowerCase().includes(needle) ||
          a.city.toLowerCase().includes(needle) ||
          a.company.toLowerCase().includes(needle),
      );
    }

    return mapped;
  }

  /** Single owned applicant application + CV summary. */
  async getApplicant(userId: number, jobSubscriberMapId: number) {
    const clientId = await this.clientIdFor(userId);
    const r = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: {
        jobMapStatus: { select: { descr: true } },
        job: {
          include: {
            designation: { select: { descr: true } },
            jobCity: { select: { descr: true } },
          },
        },
        subscriber: {
          include: {
            SubscriberCVDetails: {
              include: {
                city: { select: { descr: true } },
                currentCity: { select: { descr: true } },
                skill: { select: { descr: true } },
                industryType: { select: { industryType: true } },
              },
            },
            SubscriberEducation: {
              orderBy: { timestampIns: 'desc' },
              include: {
                course: { select: { degreeName: true } },
                degree: { select: { descr: true } },
              },
            },
            SubscriberEmployer: {
              orderBy: { timestampIns: 'desc' },
              include: { designation: { select: { descr: true } } },
            },
            SubscriberStatusHistory: {
              where: { clientID: clientId },
              orderBy: { timestampIns: 'desc' },
              take: 20,
              include: { status: { select: { descr: true } } },
            },
          },
        },
      },
    });
    if (!r || Number(r.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const cv = r.subscriber?.SubscriberCVDetails;
    const status = pipelineStatus(r.jobMapStatusID);

    return {
      jobSubscriberMapId: Number(r.jobSubscriberMapID),
      subscriberId: Number(r.subscriberID ?? 0),
      fullName: cv?.fullName?.trim() || cv?.mobileNo1 || '',
      email: cv?.emailID ?? '',
      mobile: cv?.mobileNo1 ?? '',
      designation: r.job?.designation?.descr ?? '',
      jobCity: r.job?.jobCity?.descr ?? '',
      city: cv?.city?.descr ?? cv?.currentCity?.descr ?? '',
      experience: cv?.totalExp != null ? `${cv.totalExp} yrs` : '',
      totalExp: cv?.totalExp ?? null,
      currentCtc: cv?.currentCTC != null ? Number(cv.currentCTC) : null,
      notice: cv?.noticePeriod != null ? `${cv.noticePeriod} days` : '',
      skills: [cv?.skill?.descr].filter(Boolean) as string[],
      industry: cv?.industryType?.industryType ?? '',
      status,
      jobStatus: r.jobMapStatus?.descr ?? 'Applied',
      appliedOn: r.mapDate?.toISOString().slice(0, 10) ?? '',
      cvPath: cv?.cVPath?.trim() ? `/files/${cv.cVPath}` : null,
      photoUrl: cv?.photoName?.trim() ? `/files/${cv.photoName}` : null,
      employment: (r.subscriber?.SubscriberEmployer ?? []).map((e) => ({
        employer: e.employer,
        designation: e.designation?.descr ?? '',
        from: e.joiningDate?.toISOString().slice(0, 10) ?? '',
        to: e.releavingDate?.toISOString().slice(0, 10) ?? '',
        salary: e.salary,
        description: e.jobDescr ?? '',
        current: e.flgCurrent === 1,
      })),
      education: (r.subscriber?.SubscriberEducation ?? []).map((ed) => ({
        degree: ed.degree?.descr ?? '',
        course: ed.course?.degreeName ?? '',
        institute: ed.instituteName ?? '',
        year: ed.passingYear,
        mode: ed.courseMode ?? '',
        marks: ed.marks ?? '',
      })),
      timeline: (r.subscriber?.SubscriberStatusHistory ?? []).map((h) => ({
        status: h.status?.descr ?? '',
        at: h.timestampIns?.toISOString() ?? '',
        comments: h.comments ?? '',
      })),
      company: r.subscriber?.SubscriberEmployer?.[0]?.employer ?? '',
    };
  }

  /** id-backed lookup lists for the job post/edit form (fixes free-text fields that never matched CreateJobDto's ints). */
  async masters() {
    const [designations, states, cities, workModes, employmentTypes, industryTypes, skills] = await Promise.all([
      this.db.mstrDesignation.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrState.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrCily.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrWorkMode.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrEmpType.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrIndustryType.findMany({ orderBy: { industryType: 'asc' } }),
      this.db.mstrSkills.findMany({ orderBy: { descr: 'asc' } }),
    ]);
    const opt = (id: number, label: string | null) => ({ id, label: label ?? '' });
    return {
      designations: designations.map((d) => opt(d.designationID, d.descr)),
      states: states.map((s) => opt(s.stateID, s.descr)),
      cities: cities.map((c) => ({ id: c.cityID, label: c.descr ?? '', stateId: c.stateID })),
      workModes: workModes.map((w) => opt(w.workModeID, w.descr)),
      employmentTypes: employmentTypes.map((e) => opt(e.employeeTypeID, e.descr)),
      industryTypes: industryTypes.map((i) => opt(i.industryTypeID, i.industryType)),
      skills: skills.map((s) => opt(s.skillID, s.descr)),
    };
  }

  /** Confirms a job belongs to the caller's company before it can be edited/deactivated. */
  private async ownedJob(userId: number, jobId: number) {
    const clientId = await this.clientIdFor(userId);
    const job = await this.db.clientJobs.findUnique({ where: { jobID: jobId } });
    if (!job || Number(job.clientID) !== Number(clientId)) throw new NotFoundException('Job not found');
    return job;
  }

  /** Edit an existing job posting. `draft`: true → Draft, false → Active, omit → leave status. */
  async updateJob(userId: number, jobId: number, dto: UpdateJobDto, draft?: boolean) {
    await this.ownedJob(userId, jobId);

    return this.db.$transaction(async (tx) => {
      await tx.clientJobs.update({
        where: { jobID: jobId },
        data: {
          ...(dto.designationId != null && { designationID: dto.designationId }),
          ...(dto.employmentTypeId != null && { employeeTypeID: dto.employmentTypeId }),
          ...(dto.workModeId != null && { workModeID: dto.workModeId }),
          ...(dto.cityId != null && { jobCityID: dto.cityId }),
          ...(dto.industryTypeId !== undefined && { industryTypeID: dto.industryTypeId ?? null }),
          ...(dto.description !== undefined && { jobDescr: dto.description ?? null }),
          ...(dto.candidateProfile !== undefined && { jobCandidateProfile: dto.candidateProfile ?? null }),
          ...(dto.minExp !== undefined && { minExp: dto.minExp ?? null }),
          ...(dto.maxExp !== undefined && { maxExp: dto.maxExp ?? null }),
          ...(dto.openings !== undefined && { maxEmp: dto.openings ?? null }),
          ...(dto.minCtc != null && { minCTC: dto.minCtc }),
          ...(dto.maxCtc != null && { maxCTC: dto.maxCtc }),
          ...(dto.educationDetail !== undefined && { educationDetail: dto.educationDetail?.trim() || null }),
          ...(dto.reportTo !== undefined && { reportTo: dto.reportTo?.trim() || null }),
          ...(dto.teamSize !== undefined && { teamSize: dto.teamSize ?? null }),
          ...(dto.department !== undefined && { department: dto.department?.trim() || null }),
          ...(dto.subDepartment !== undefined && { subDepartment: dto.subDepartment?.trim() || null }),
          ...(dto.interviewProcess !== undefined && {
            interviewProcess: encodeInterviewProcess(dto.interviewProcess),
          }),
          ...(draft === true && { statusID: JOB_STATUS_DRAFT }),
          ...(draft === false && { statusID: JOB_STATUS_ACTIVE }),
          timestampUpd: new Date(),
          loginIDUpd: userId,
        },
      });

      if (dto.skillIds) {
        await tx.clientJobSkill.deleteMany({ where: { jobID: jobId } });
        if (dto.skillIds.length) {
          await tx.clientJobSkill.createMany({
            data: dto.skillIds.map((skillID) => ({ jobID: jobId, skillID })),
          });
        }
      }

      return { jobId };
    });
  }

  /** Port of spClientMarkJobInactive. */
  async deactivateJob(userId: number, jobId: number) {
    return this.setJobStatus(userId, jobId, 'Closed');
  }

  /** Get a single owned job (for View modal). */
  async getJob(userId: number, jobId: number) {
    const clientId = await this.clientIdFor(userId);
    const j = await this.db.clientJobs.findFirst({
      where: { jobID: jobId, clientID: clientId },
      include: {
        jobCity: { select: { descr: true } },
        designation: { select: { descr: true } },
        employeeType: { select: { descr: true } },
        workMode: { select: { descr: true } },
        industryType: { select: { industryType: true } },
        ClientJobSkill: { include: { skill: { select: { descr: true } } } },
        _count: { select: { JobSubscriberMapping: true } },
      },
    });
    if (!j) throw new NotFoundException('Job not found');

    return {
      jobId: Number(j.jobID),
      designation: j.designation?.descr ?? '',
      designationId: j.designationID,
      city: j.jobCity?.descr ?? '',
      cityId: j.jobCityID,
      workMode: j.workMode?.descr ?? '',
      workModeId: j.workModeID,
      employmentType: j.employeeType?.descr ?? '',
      employmentTypeId: j.employeeTypeID,
      industryTypeId: j.industryTypeID,
      industryType: j.industryType?.industryType ?? '',
      description: j.jobDescr ?? '',
      candidateProfile: j.jobCandidateProfile ?? '',
      openings: j.maxEmp,
      skillIds: j.ClientJobSkill.map((s) => s.skillID),
      skills: j.ClientJobSkill.map((s) => s.skill?.descr ?? '').filter(Boolean),
      minExp: j.minExp ?? 0,
      maxExp: j.maxExp ?? null,
      minCtc: j.minCTC,
      maxCtc: j.maxCTC,
      educationDetail: j.educationDetail ?? '',
      reportTo: j.reportTo ?? '',
      teamSize: j.teamSize ?? null,
      department: j.department ?? '',
      subDepartment: j.subDepartment ?? '',
      interviewProcess: decodeInterviewProcess(j.interviewProcess),
      status: jobStatus(j.statusID),
      applicants: j._count.JobSubscriberMapping,
      postedOn: j.timestampIns.toISOString().slice(0, 10),
    };
  }

  /** Toggle / set Active | Closed | Archived. */
  async setJobStatus(userId: number, jobId: number, status: 'Active' | 'Closed' | 'Archived') {
    await this.ownedJob(userId, jobId);
    const statusID =
      status === 'Active' ? JOB_STATUS_ACTIVE : status === 'Archived' ? JOB_STATUS_ARCHIVED : JOB_STATUS_CLOSED;
    await this.db.clientJobs.update({
      where: { jobID: jobId },
      data: { statusID, timestampUpd: new Date(), loginIDUpd: userId },
    });
    await this.audit.record({
      userId,
      action: 'job.status',
      entity: 'ClientJobs',
      entityId: jobId,
      detail: { status },
    });
    return { ok: true, status };
  }

  async archiveJob(userId: number, jobId: number) {
    return this.setJobStatus(userId, jobId, 'Archived');
  }

  async activateJob(userId: number, jobId: number) {
    return this.setJobStatus(userId, jobId, 'Active');
  }

  /**
   * Hard-delete a job. Fails with 400 if applicants exist — archive instead.
   */
  async deleteJob(userId: number, jobId: number) {
    await this.ownedJob(userId, jobId);
    const applicants = await this.db.jobSubscriberMapping.count({ where: { jobID: jobId } });
    if (applicants > 0) {
      throw new BadRequestException(
        `This job has ${applicants} applicant(s). Archive it instead of deleting.`,
      );
    }

    await this.db.$transaction(async (tx) => {
      await tx.clientJobSkill.deleteMany({ where: { jobID: jobId } });
      await tx.clientJobs_EducationType.deleteMany({ where: { jobID: jobId } });
      await tx.clientJobs_Gendermapping.deleteMany({ where: { jobID: jobId } });
      await tx.savedJob.deleteMany({ where: { jobID: jobId } });
      await tx.clientJobs.delete({ where: { jobID: jobId } });
    });

    await this.audit.record({ userId, action: 'job.deleted', entity: 'ClientJobs', entityId: jobId });
    return { ok: true };
  }

  /** Client-side pipeline decision on an applicant. */
  async decideApplicant(userId: number, jobSubscriberMapId: number, dto: ApplicantDecisionDto) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: { job: { select: { clientID: true } } },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const map: Record<
      ApplicantDecisionDto['decision'],
      { jobMapStatusId: number; historyStatusId: number }
    > = {
      Shortlisted: { jobMapStatusId: JobMapStatus.SHORTLISTED, historyStatusId: SubscriberStatus.SHORTLISTED },
      Interview: {
        jobMapStatusId: JobMapStatus.INTERVIEW_SCHEDULED,
        historyStatusId: SubscriberStatus.INTERVIEW_SCHEDULED,
      },
      Hired: { jobMapStatusId: JobMapStatus.SELECTED, historyStatusId: SubscriberStatus.SELECTED },
      Rejected: { jobMapStatusId: JobMapStatus.REJECTED, historyStatusId: SubscriberStatus.REJECTED },
    };
    const next = map[dto.decision];
    await this.applications.transitionStatus(jobSubscriberMapId, next.jobMapStatusId, userId, next.historyStatusId);
    await this.audit.record({
      userId,
      action: 'applicant.decision',
      entity: 'JobSubscriberMapping',
      entityId: jobSubscriberMapId,
      detail: { decision: dto.decision },
    });
    return { ok: true, status: dto.decision };
  }

  // ---------------------------------------------------------------------------
  // New endpoints
  // ---------------------------------------------------------------------------

  /** Duplicate an existing job posting — creates a new active copy with the same fields and skills. */
  async duplicateJob(userId: number, jobId: number) {
    const job = await this.ownedJob(userId, jobId);

    return this.db.$transaction(async (tx) => {
      const skills = await tx.clientJobSkill.findMany({
        where: { jobID: job.jobID },
        select: { skillID: true },
      });

      const newJob = await tx.clientJobs.create({
        data: {
          clientID: job.clientID,
          designationID: job.designationID,
          employeeTypeID: job.employeeTypeID,
          workModeID: job.workModeID,
          jobCityID: job.jobCityID,
          industryTypeID: job.industryTypeID,
          jobDescr: job.jobDescr,
          jobCandidateProfile: job.jobCandidateProfile,
          minExp: job.minExp,
          maxExp: job.maxExp,
          minCTC: job.minCTC,
          maxCTC: job.maxCTC,
          maxEmp: job.maxEmp,
          educationDetail: job.educationDetail,
          reportTo: job.reportTo,
          teamSize: job.teamSize,
          department: job.department,
          subDepartment: job.subDepartment,
          interviewProcess: job.interviewProcess,
          statusID: JOB_STATUS_ACTIVE,
          timestampIns: new Date(),
          loginIDIns: userId,
        },
      });

      if (skills.length) {
        await tx.clientJobSkill.createMany({
          data: skills.map((s) => ({ jobID: newJob.jobID, skillID: s.skillID })),
        });
      }

      return { jobId: Number(newJob.jobID) };
    });
  }

  /** Bulk-upload jobs from a CSV that matches employer jobFields columns. */
  async bulkUploadJobs(userId: number, file: Express.Multer.File) {
    if (!file || !file.buffer) throw new BadRequestException('No file provided');

    const clientId = await this.clientIdFor(userId);
    const content = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = parseCsvLine(lines[0]).map(headerKey);
    const dataLines = lines.slice(1);

    const [designations, cities, workModes, empTypes, industries, skills] = await Promise.all([
      this.db.mstrDesignation.findMany(),
      this.db.mstrCily.findMany(),
      this.db.mstrWorkMode.findMany(),
      this.db.mstrEmpType.findMany(),
      this.db.mstrIndustryType.findMany(),
      this.db.mstrSkills.findMany(),
    ]);

    const findByLabel = <T extends { descr?: string | null; industryType?: string | null }>(
      list: T[],
      name: string,
      getLabel: (item: T) => string | null | undefined,
    ): T | undefined => {
      const target = normalizeMasterLabel(name);
      if (!target) return undefined;
      return list.find((item) => normalizeMasterLabel(getLabel(item) ?? '') === target);
    };

    const col = (row: Record<string, string>, ...keys: string[]) => {
      for (const k of keys) {
        const v = row[k];
        if (v != null && String(v).trim() !== '') return String(v).trim();
      }
      return '';
    };

    let imported = 0;
    const errors: { row: number; reason: string }[] = [];
    const preview: Record<string, unknown>[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const rowNum = i + 2; // 1-based spreadsheet row (header = 1)
      const values = parseCsvLine(dataLines[i]);
      if (values.every((v) => !v.trim())) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] ?? '';
      });

      const position = col(row, 'position', 'designation', 'job title');
      const employmentType = col(row, 'employment type', 'employmenttype');
      const experienceRaw = col(row, 'experience', 'experience min');
      const experienceMaxRaw = col(row, 'experience max', 'max experience');
      const workMode = col(row, 'work mode', 'workmode');
      const ctcMinRaw = col(row, 'ctc min', 'ctc min', 'min ctc', 'minctc');
      const ctcMaxRaw = col(row, 'ctc max', 'max ctc', 'maxctc');
      const educationDetail = col(row, 'education detail', 'education');
      const reportTo = col(row, 'report to');
      const teamSizeRaw = col(row, 'team size');
      const industryType = col(row, 'industry type', 'industry');
      const department = col(row, 'department');
      const subDepartment = col(row, 'sub-department', 'sub department', 'subdepartment');
      const skillsRaw = col(row, 'skills');
      const description = col(row, 'job description', 'description');
      const location = col(row, 'location', 'city');
      const interviewRoundRaw = col(row, 'interview round');
      const interviewProcessRaw = col(row, 'interview process');

      const missing: string[] = [];
      if (!position) missing.push('Position');
      if (!employmentType) missing.push('Employment type');
      if (!experienceRaw && !col(row, 'experience min')) missing.push('Experience');
      if (!educationDetail) missing.push('Education Detail');
      if (!industryType) missing.push('Industry type');
      if (!department) missing.push('Department');
      if (!skillsRaw) missing.push('Skills');
      if (!description) missing.push('Job Description');
      if (!location) missing.push('Location');
      if (!workMode) missing.push('Work mode');

      if (missing.length) {
        errors.push({ row: rowNum, reason: `Missing required: ${missing.join(', ')}` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: missing.join(', ') });
        continue;
      }

      const designation = findByLabel(designations, position, (d) => d.descr);
      const city = findByLabel(cities, location, (c) => c.descr);
      const emp = findByLabel(empTypes, employmentType, (e) => e.descr);
      const mode = findByLabel(workModes, workMode, (w) => w.descr);
      const industry = findByLabel(industries, industryType, (x) => x.industryType);

      if (!designation) {
        errors.push({ row: rowNum, reason: `Unknown Position "${position}"` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'Unknown Position' });
        continue;
      }
      if (!city) {
        errors.push({ row: rowNum, reason: `Unknown Location "${location}"` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'Unknown Location' });
        continue;
      }
      if (!emp) {
        errors.push({ row: rowNum, reason: `Unknown Employment type "${employmentType}"` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'Unknown Employment type' });
        continue;
      }
      if (!mode) {
        errors.push({ row: rowNum, reason: `Unknown Work mode "${workMode}"` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'Unknown Work mode' });
        continue;
      }
      if (!industry) {
        errors.push({ row: rowNum, reason: `Unknown Industry type "${industryType}"` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'Unknown Industry type' });
        continue;
      }

      let minExp: number | null = null;
      let maxExp: number | null = null;
      const expMatch = experienceRaw.match(/(\d+)\s*[-–to]+\s*(\d+)/i);
      if (expMatch) {
        minExp = parseInt(expMatch[1], 10);
        maxExp = parseInt(expMatch[2], 10);
      } else if (experienceRaw) {
        const n = parseInt(experienceRaw, 10);
        if (!Number.isNaN(n)) minExp = n;
      }
      if (experienceMaxRaw) {
        const n = parseInt(experienceMaxRaw, 10);
        if (!Number.isNaN(n)) maxExp = n;
      }

      const minCtc = parseInt(ctcMinRaw || '0', 10);
      const maxCtc = parseInt(ctcMaxRaw || '0', 10);
      const teamSize = teamSizeRaw ? parseInt(teamSizeRaw, 10) : null;

      const rounds = interviewRoundRaw
        ? interviewRoundRaw.split('|').map((r) => r.trim()).filter(Boolean)
        : [];
      const processes = interviewProcessRaw
        ? interviewProcessRaw.split('|').map((p) => p.trim())
        : [];
      const interviewProcess =
        rounds.length || processes.length
          ? encodeInterviewProcess(
              (rounds.length ? rounds : processes.map((_, idx) => String(idx + 1))).map((r, idx) => ({
                round: parseInt(r, 10) || idx + 1,
                process: processes[idx] ?? '',
              })),
            )
          : null;

      const skillNames = skillsRaw
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const skillIds = skillNames
        .map((name) => findByLabel(skills, name, (s) => s.descr)?.skillID)
        .filter((id): id is number => id != null);

      if (!skillIds.length) {
        errors.push({ row: rowNum, reason: `No matching Skills for "${skillsRaw}"` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'Unknown Skills' });
        continue;
      }

      try {
        await this.db.$transaction(async (tx) => {
          const job = await tx.clientJobs.create({
            data: {
              clientID: clientId,
              designationID: designation.designationID,
              employeeTypeID: emp.employeeTypeID,
              workModeID: mode.workModeID,
              jobCityID: city.cityID,
              industryTypeID: industry.industryTypeID,
              jobDescr: description,
              minExp,
              maxExp,
              minCTC: Number.isNaN(minCtc) ? 0 : minCtc,
              maxCTC: Number.isNaN(maxCtc) ? 0 : maxCtc,
              educationDetail: educationDetail || null,
              reportTo: reportTo || null,
              teamSize: teamSize != null && !Number.isNaN(teamSize) ? teamSize : null,
              department: department || null,
              subDepartment: subDepartment || null,
              interviewProcess,
              statusID: JOB_STATUS_ACTIVE,
              timestampIns: new Date(),
              loginIDIns: userId,
            },
          });

          if (skillIds.length) {
            await tx.clientJobSkill.createMany({
              data: skillIds.map((skillID) => ({ jobID: job.jobID, skillID })),
            });
          }
        });

        imported++;
        preview.push({
          row: rowNum,
          position,
          employmentType,
          experience: experienceRaw || `${minExp ?? ''}-${maxExp ?? ''}`,
          workMode,
          ctcMin: Number.isNaN(minCtc) ? 0 : minCtc,
          ctcMax: Number.isNaN(maxCtc) ? 0 : maxCtc,
          department,
          location,
          skills: skillsRaw,
          status: 'Valid',
        });
      } catch (e) {
        const reason = e instanceof Error ? e.message : 'Insert failed';
        errors.push({ row: rowNum, reason });
        preview.push({ row: rowNum, position, location, status: 'Error', error: reason });
      }
    }

    return {
      imported,
      skipped: errors.length,
      errors,
      preview,
    };
  }

  /** Company analytics — job counts, application pipeline funnel, per-job performance. */
  async analytics(userId: number) {
    const clientId = await this.clientIdFor(userId);

    const jobs = await this.db.clientJobs.findMany({
      where: { clientID: clientId },
      select: {
        jobID: true,
        statusID: true,
        designation: { select: { descr: true } },
        JobSubscriberMapping: {
          select: { jobMapStatusID: true },
        },
      },
    });

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => j.statusID === JOB_STATUS_ACTIVE).length;
    const closedJobs = jobs.filter((j) => j.statusID === JOB_STATUS_CLOSED).length;
    const draftJobs = jobs.filter((j) => j.statusID === JOB_STATUS_DRAFT).length;
    const archivedJobs = jobs.filter((j) => j.statusID === JOB_STATUS_ARCHIVED).length;

    let totalApplications = 0;
    let shortlisted = 0;
    let interviewScheduled = 0;
    let selected = 0;
    let rejected = 0;
    let mapped = 0;

    const jobPerformance = jobs.map((j) => {
      const apps = j.JobSubscriberMapping;
      const jShortlisted = apps.filter((a) => a.jobMapStatusID === JobMapStatus.SHORTLISTED).length;
      const jInterviewScheduled = apps.filter(
        (a) => a.jobMapStatusID != null && INTERVIEW_MAP_STATUSES.includes(a.jobMapStatusID),
      ).length;
      const jSelected = apps.filter((a) => a.jobMapStatusID === JobMapStatus.SELECTED).length;
      const jRejected = apps.filter((a) => a.jobMapStatusID === JobMapStatus.REJECTED).length;
      const jMapped = apps.filter((a) => a.jobMapStatusID === JobMapStatus.MAPPED || a.jobMapStatusID == null).length;

      totalApplications += apps.length;
      shortlisted += jShortlisted;
      interviewScheduled += jInterviewScheduled;
      selected += jSelected;
      rejected += jRejected;
      mapped += jMapped;

      return {
        jobId: Number(j.jobID),
        designation: j.designation?.descr ?? '',
        applications: apps.length,
        shortlisted: jShortlisted,
        interviewScheduled: jInterviewScheduled,
        selected: jSelected,
        rejected: jRejected,
      };
    });

    return {
      totalJobs,
      activeJobs,
      closedJobs,
      draftJobs,
      archivedJobs,
      totalApplications,
      mapped,
      shortlisted,
      interviewScheduled,
      selected,
      rejected,
      jobPerformance,
    };
  }

  /** Get company branding data. */
  async getBranding(userId: number) {
    const clientId = await this.clientIdFor(userId);
    const branding = await this.db.companyBranding.findUnique({
      where: { clientID: clientId },
    });

    return {
      tagline: branding?.tagline ?? '',
      coverImageUrl: branding?.coverImageUrl ?? '',
      culture: branding?.culture ?? '',
      benefits: branding?.benefits ?? '[]',
    };
  }

  /** Upsert company branding data. */
  async updateBranding(userId: number, dto: UpdateBrandingDto) {
    const clientId = await this.clientIdFor(userId);

    await this.db.companyBranding.upsert({
      where: { clientID: clientId },
      create: {
        clientID: clientId,
        tagline: dto.tagline ?? null,
        coverImageUrl: dto.coverImageUrl ?? null,
        culture: dto.culture ?? null,
        benefits: dto.benefits ?? null,
      },
      update: {
        ...(dto.tagline !== undefined && { tagline: dto.tagline ?? null }),
        ...(dto.coverImageUrl !== undefined && { coverImageUrl: dto.coverImageUrl ?? null }),
        ...(dto.culture !== undefined && { culture: dto.culture ?? null }),
        ...(dto.benefits !== undefined && { benefits: dto.benefits ?? null }),
        updatedAt: new Date(),
      },
    });

    return { ok: true };
  }

  /** Get notes on an applicant. Verifies the applicant belongs to this company first. */
  async getApplicantNotes(userId: number, jobSubscriberMapId: number) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: { job: { select: { clientID: true } } },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const notes = await this.db.applicantNote.findMany({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      orderBy: { createdAt: 'desc' },
    });

    return {
      notes: notes.map((n) => ({
        noteId: Number(n.noteId),
        note: n.note,
        createdAt: n.createdAt.toISOString(),
        updatedBy: n.updatedBy != null ? Number(n.updatedBy) : null,
      })),
    };
  }

  /** Save a note on an applicant. */
  async saveApplicantNote(userId: number, jobSubscriberMapId: number, dto: ApplicantNoteDto) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: { job: { select: { clientID: true } } },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    await this.db.applicantNote.create({
      data: {
        jobSubscriberMapID: jobSubscriberMapId,
        note: dto.note,
        updatedBy: userId,
      },
    });

    return { ok: true };
  }

  /** Public company page — no auth required. */
  async publicCompanyInfo(clientId: number) {
    const c = await this.db.clientMstr.findUnique({
      where: { clientID: clientId },
      include: {
        city: { select: { descr: true } },
        industryType: { select: { industryType: true } },
      },
    });
    if (!c) throw new NotFoundException('Company not found');

    return {
      clientId: Number(c.clientID),
      clientName: c.clientName ?? '',
      industry: c.industryType?.industryType ?? '',
      city: c.city?.descr ?? '',
      website: c.companyWebsite ?? '',
      logoUrl: c.companyLogo?.trim() ? `/files/${c.companyLogo}` : null,
      description: c.companyDescr ?? '',
    };
  }
}
