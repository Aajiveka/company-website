import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { StorageService } from '@/modules/storage/storage.service';
import { avatarUrl } from '@/modules/files/avatar-url';
import {
  InterviewRoundService,
  roundNameFor,
  roundNumberFor,
  type RoundDetails,
} from '@/modules/recruitment/interview-round.service';
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
  InterviewResultDto,
  InterviewRoundDto,
  InterviewScheduleDetailsDto,
  ListApplicantsQueryDto,
  ScheduleInterviewDto,
  ListJobsQueryDto,
  UpdateBrandingDto,
  UpdateCompanyProfileDto,
  UpdateJobDto,
} from './dto/employers.dto';

type PipelineStatus =
  | 'New'
  | 'Shortlisted'
  | 'Interview'
  | 'Hired'
  | 'Rejected'
  | 'SentToCompany'
  | 'Referred'
  | 'Expired'
  | 'Offer'
  | 'Joined'
  | 'OnHold';

const INTERVIEW_MAP_STATUSES: number[] = [
  JobMapStatus.INTERVIEW_SCHEDULED,
  JobMapStatus.INTERVIEW_ATTENDED,
  JobMapStatus.RESCHEDULE_REQUESTED,
  JobMapStatus.RESCHEDULED,
  JobMapStatus.INTERVIEW_R1,
  JobMapStatus.INTERVIEW_R2,
  JobMapStatus.INTERVIEW_R3,
  JobMapStatus.FINAL_ROUND,
];

function pipelineStatus(statusId: number | null | undefined): PipelineStatus {
  if (statusId === JobMapStatus.SHORTLISTED) return 'Shortlisted';
  if (statusId === JobMapStatus.REFERRED_TO_Q3) return 'Referred';
  if (statusId === JobMapStatus.SENT_TO_COMPANY) return 'SentToCompany';
  if (statusId === JobMapStatus.CV_EXPIRED) return 'Expired';
  if (statusId === JobMapStatus.ON_HOLD) return 'OnHold';
  if (statusId === JobMapStatus.OFFER_SENT || statusId === JobMapStatus.OFFER_ACCEPTED) return 'Offer';
  if (statusId === JobMapStatus.JOINED) return 'Joined';
  if (statusId != null && INTERVIEW_MAP_STATUSES.includes(statusId)) return 'Interview';
  if (statusId === JobMapStatus.SELECTED) return 'Hired';
  if (statusId === JobMapStatus.REJECTED) return 'Rejected';
  return 'New';
}

type RoundSummary = {
  roundNumber: number;
  roundName: string | null;
  status: string;
  result: string;
  scheduledAt: Date | null;
};

/** Master rows the platform uses for its own files, not things an employer would ask for. */
const SYSTEM_DOCUMENT_TYPES = new Set(['cv', 'companylogo', 'candidatephoto']);

/** Selected, and everything after it — an offer or joining does not undo a hire. */
const HIRED_MAP_STATUSES: number[] = [
  JobMapStatus.SELECTED,
  JobMapStatus.OFFER_SENT,
  JobMapStatus.OFFER_ACCEPTED,
  JobMapStatus.JOINED,
];

const CLOSED_MAP_STATUSES: number[] = [
  JobMapStatus.REJECTED,
  JobMapStatus.SELECTED,
  JobMapStatus.OFFER_SENT,
  JobMapStatus.OFFER_ACCEPTED,
  JobMapStatus.JOINED,
  JobMapStatus.CV_EXPIRED,
  JobMapStatus.WITHDRAWN,
];

/**
 * Where the candidate stands in this employer's process. The status id alone cannot tell a
 * screening rejection from a rejection after Round 2, so the interview rounds decide it.
 */
function applicationStage(statusId: number | null | undefined, rounds: RoundSummary[]): string {
  const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const name = (r: RoundSummary) => r.roundName ?? roundNameFor(r.roundNumber);
  const lastWith = (result: string) => [...sorted].reverse().find((r) => r.result === result);
  const latest = sorted[sorted.length - 1];

  if (statusId === JobMapStatus.REJECTED) {
    const failed = lastWith('Failed');
    return failed ? `Rejected after ${name(failed)}` : 'Rejected at screening';
  }
  if (statusId === JobMapStatus.SELECTED) {
    const passed = lastWith('Passed');
    return passed ? `Selected after ${name(passed)}` : 'Selected without interview';
  }
  if (statusId === JobMapStatus.SHORTLISTED && !latest) return 'Shortlisted at screening';
  if (statusId === JobMapStatus.ON_HOLD) {
    const held = lastWith('Hold');
    return held ? `On hold after ${name(held)}` : 'On hold';
  }
  if (statusId === JobMapStatus.SHORTLISTED || (statusId != null && INTERVIEW_MAP_STATUSES.includes(statusId))) {
    if (!latest) return 'Interview · not scheduled yet';
    if (latest.status === 'Pending') return `${name(latest)} · awaiting Q3 scheduling`;
    if (latest.status === 'Scheduled' && latest.scheduledAt && latest.scheduledAt > new Date()) {
      return `${name(latest)} scheduled`;
    }
    if (latest.status === 'Scheduled') return `${name(latest)} · awaiting your feedback`;
    return name(latest);
  }
  if (statusId === JobMapStatus.SENT_TO_COMPANY) return 'Awaiting your review';
  if (statusId === JobMapStatus.OFFER_SENT) return 'Offer sent';
  if (statusId === JobMapStatus.OFFER_ACCEPTED) return 'Offer accepted';
  if (statusId === JobMapStatus.JOINED) return 'Joined';
  if (statusId === JobMapStatus.CV_EXPIRED) return 'Review window expired';
  return 'New';
}

function timelineLabel(statusId: number | null | undefined): string {
  if (statusId === JobMapStatus.MAPPED) return 'Applied';
  if (statusId === JobMapStatus.REFERRED_TO_Q3) return 'Referred to Q3';
  if (statusId === JobMapStatus.SENT_TO_COMPANY) return 'Sent to you for review';
  if (statusId === JobMapStatus.SELECTED) return 'Selected';
  if (statusId === JobMapStatus.ON_HOLD) return 'On hold';
  if (statusId === JobMapStatus.CV_EXPIRED) return 'Review window expired';
  if (statusId === JobMapStatus.OFFER_SENT) return 'Offer sent';
  if (statusId === JobMapStatus.OFFER_ACCEPTED) return 'Offer accepted';
  return pipelineStatus(statusId);
}

/** Public img-friendly URL — browser <img> cannot send Authorization headers. */
function companyLogoApiPath(clientId: number, key: string | null | undefined): string | null {
  if (!key?.trim()) return null;
  // Include /api so <img src> works through the Vite/nginx proxy without a bearer token.
  return `/api/clients/${clientId}/logo`;
}

function jobMapIdsForPipeline(status: PipelineStatus): number[] {
  if (status === 'Shortlisted') return [JobMapStatus.SHORTLISTED];
  if (status === 'Interview') return INTERVIEW_MAP_STATUSES;
  if (status === 'Hired') return [JobMapStatus.SELECTED];
  if (status === 'Rejected') return [JobMapStatus.REJECTED];
  if (status === 'SentToCompany') return [JobMapStatus.SENT_TO_COMPANY];
  if (status === 'Referred') return [JobMapStatus.REFERRED_TO_Q3];
  if (status === 'Expired') return [JobMapStatus.CV_EXPIRED];
  if (status === 'Offer') return [JobMapStatus.OFFER_SENT, JobMapStatus.OFFER_ACCEPTED];
  if (status === 'Joined') return [JobMapStatus.JOINED];
  if (status === 'OnHold') return [JobMapStatus.ON_HOLD];
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
  return JSON.stringify(
    rounds.map((r) => ({
      round: r.round,
      process: r.process ?? '',
      ...(r.mode ? { mode: r.mode } : {}),
    })),
  );
}

function decodeInterviewProcess(raw: string | null | undefined): InterviewRoundDto[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as InterviewRoundDto[];
    if (Array.isArray(parsed)) {
      return parsed.map((r, i) => ({
        round: Number(r.round) || i + 1,
        process: String(r.process ?? ''),
        ...(r.mode ? { mode: String(r.mode) } : {}),
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
  const s = label
    .normalize('NFKC')
    .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (['full time', 'fulltime', 'full time employment', 'permanent'].includes(s)) return 'full time';
  if (['part time', 'parttime'].includes(s)) return 'part time';
  if (['internship', 'intern'].includes(s)) return 'internship';
  if (['contract', 'contractual', 'contractor'].includes(s)) return 'contract';

  if (['in office', 'onsite', 'on site', 'work from office', 'wfo'].includes(s)) return 'in office';
  if (['remote', 'work from home', 'wfh'].includes(s)) return 'remote';
  if (['hybrid'].includes(s)) return 'hybrid';
  // City aliases used in CSVs / Naukri-style dumps (district names from legacy seed too)
  if (
    s === 'bangalore' ||
    s === 'bengaluru' ||
    s === 'bengalooru' ||
    s === 'bangalore urban' ||
    s === 'bangalore rural' ||
    s.startsWith('bangalore ') ||
    s.startsWith('bengaluru ')
  ) {
    return 'bengaluru';
  }
  if (s === 'noida' || s === 'gautam buddha nagar' || s === 'gautam budh nagar') return 'noida';
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

function normalizeInterviewMode(raw: string): 'Telephonic' | 'Face to face' | 'Video call' | undefined {
  const s = raw
    .toLowerCase()
    .replace(/[-_/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!s) return undefined;
  if (['telephonic', 'telephone', 'phone', 'call'].includes(s)) return 'Telephonic';
  if (['face to face', 'in person', 'f2f', 'onsite interview'].includes(s)) return 'Face to face';
  if (['video call', 'video', 'meet', 'google meet', 'zoom', 'teams'].includes(s)) return 'Video call';
  return undefined;
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
    private readonly storage: StorageService,
    private readonly rounds: InterviewRoundService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Match skill labels case-insensitively; create missing rows in tblMstrSkills (max 100 chars). */
  private async resolveSkillIds(
    tx: Prisma.TransactionClient,
    skillIds?: number[],
    skillNames?: string[],
  ): Promise<number[]> {
    const ids = new Set<number>();
    for (const id of skillIds ?? []) {
      if (Number.isInteger(id) && id > 0) ids.add(id);
    }
    for (const raw of skillNames ?? []) {
      const name = raw.trim().slice(0, 100);
      if (!name) continue;
      let row = await tx.mstrSkills.findFirst({
        where: { descr: { equals: name, mode: 'insensitive' } },
      });
      if (!row) {
        row = await tx.mstrSkills.create({ data: { descr: name } });
      }
      ids.add(row.skillID);
    }
    return [...ids];
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
        ClientContacts: {
          where: { contactPersonRole: { equals: 'HR', mode: 'insensitive' } },
          take: 1,
          orderBy: { clientContactsID: 'desc' },
        },
      },
    });
    if (!c) throw new NotFoundException('Company not found');

    const hr = c.ClientContacts[0];

    return {
      clientId: Number(c.clientID),
      clientName: c.clientName ?? '',
      industry: c.industryType?.industryType ?? '',
      industryTypeId: c.industryTypeID,
      email: c.emailID ?? '',
      contactNo: c.contactNo ?? '',
      hrEmail: hr?.emailID ?? '',
      hrContactNo: hr?.mobile?.trim() || hr?.phoneNo?.trim() || '',
      hrContactName: hr?.contactPerName ?? '',
      website: c.companyWebsite ?? '',
      city: c.city?.descr ?? '',
      cityId: c.cityID,
      address: c.clientAddress ?? '',
      logoUrl: companyLogoApiPath(Number(c.clientID), c.companyLogo),
      companyLogo: c.companyLogo ?? '',
      description: c.companyDescr ?? '',
    };
  }

  /** Stream company logo for <img src> (no bearer token — logos are public branding). */
  async streamCompanyLogo(clientId: number) {
    const c = await this.db.clientMstr.findUnique({
      where: { clientID: clientId },
      select: { companyLogo: true },
    });
    const key = c?.companyLogo?.trim();
    if (!key) throw new NotFoundException('Logo not found');

    const body = await this.storage.read(key);
    const lower = key.toLowerCase();
    const contentType = lower.endsWith('.png')
      ? 'image/png'
      : lower.endsWith('.jpg') || lower.endsWith('.jpeg')
        ? 'image/jpeg'
        : lower.endsWith('.webp')
          ? 'image/webp'
          : 'application/octet-stream';
    const fileName = key.split('/').pop() || 'logo';
    return { body, contentType, fileName };
  }

  /** Update owned company profile fields on tblClientMstr (+ HR contact row). */
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

    if (
      dto.hrEmail !== undefined ||
      dto.hrContactNo !== undefined ||
      dto.hrContactName !== undefined
    ) {
      await this.upsertHrContact(clientId, {
        name: dto.hrContactName,
        phone: dto.hrContactNo,
        email: dto.hrEmail,
      });
    }

    await this.audit.record({
      userId,
      action: 'company.profile.update',
      entity: 'ClientMstr',
      entityId: Number(clientId),
    });
    return this.profile(userId);
  }

  private async upsertHrContact(
    clientId: bigint,
    input: { name?: string; phone?: string; email?: string },
  ) {
    const existing = await this.db.clientContacts.findFirst({
      where: { clientID: clientId, contactPersonRole: { equals: 'HR', mode: 'insensitive' } },
      orderBy: { clientContactsID: 'desc' },
    });
    const phone = input.phone?.trim() || null;
    const email = input.email?.trim() || null;
    const name = input.name?.trim() || existing?.contactPerName || 'HR Contact';

    if (existing) {
      await this.db.clientContacts.update({
        where: { clientContactsID: existing.clientContactsID },
        data: {
          contactPerName: name,
          ...(input.phone !== undefined && { phoneNo: phone, mobile: phone }),
          ...(input.email !== undefined && { emailID: email }),
          contactPersonRole: 'HR',
        },
      });
      return;
    }

    if (!phone && !email) return;

    await this.db.clientContacts.create({
      data: {
        clientID: clientId,
        contactPerName: name,
        phoneNo: phone,
        mobile: phone,
        emailID: email,
        roleID: 4,
        contactPersonRole: 'HR',
      },
    });
  }

  /** Upload company logo image and persist path on tblClientMstr.CompanyLogo. */
  async uploadLogo(userId: number, file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('No file uploaded');
    if (!['image/jpeg', 'image/png'].includes(file.mimetype)) {
      throw new BadRequestException('Logo must be a JPEG or PNG image');
    }

    const photoDocType = await this.db.mstrDocuments.findFirst({
      where: {
        OR: [
          { documentName: { contains: 'Logo', mode: 'insensitive' } },
          { documentName: { contains: 'Photo', mode: 'insensitive' } },
        ],
      },
      select: { documentID: true },
    });
    const docTypeId = photoDocType ? Number(photoDocType.documentID) : 1;
    const stored = await this.storage.upload(docTypeId, userId, file);

    const clientId = await this.clientIdFor(userId);
    await this.db.clientMstr.update({
      where: { clientID: clientId },
      data: {
        companyLogo: stored.key,
        timestampUpd: new Date(),
        loginIDUpd: userId,
      },
    });

    await this.audit.record({
      userId,
      action: 'company.logo_uploaded',
      entity: 'ClientMstr',
      entityId: Number(clientId),
      detail: { key: stored.key },
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
      keyResponsibilities: j.keyResponsibilities ?? '',
      preferredQualifications: j.preferredQualifications ?? '',
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
          keyResponsibilities: dto.keyResponsibilities ?? null,
          preferredQualifications: dto.preferredQualifications ?? null,
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

      const resolvedSkills = await this.resolveSkillIds(tx, dto.skillIds, dto.skills);
      if (resolvedSkills.length) {
        // tblClientJobSkill is just (JobSkillID, JobID, SkillID) — it carries no audit columns.
        await tx.clientJobSkill.createMany({
          data: resolvedSkills.map((skillID) => ({ jobID: job.jobID, skillID })),
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
    const jobId = query.jobId && query.jobId > 0 ? query.jobId : undefined;
    const cityFilter = query.city?.trim() ?? '';
    const minExp = query.minExp != null && query.minExp >= 0 ? query.minExp : undefined;
    const maxNotice = query.maxNotice != null && query.maxNotice >= 0 ? query.maxNotice : undefined;

    const where: Record<string, unknown> = {
      job: {
        clientID: clientId,
        ...(jobId ? { jobID: jobId } : {}),
      },
    };
    if (statusFilter) {
      where.jobMapStatusID = { in: jobMapIdsForPipeline(statusFilter) };
    }

    const rows = await this.db.jobSubscriberMapping.findMany({
      where,
      orderBy: { mapDate: 'desc' },
      include: {
        jobMapStatus: { select: { descr: true } },
        job: {
          include: {
            designation: { select: { descr: true } },
            jobCity: { select: { descr: true } },
          },
        },
        InterviewRound: {
          select: { roundNumber: true, roundName: true, status: true, result: true, scheduledAt: true },
        },
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
            SubscriberTags: {
              include: { tag: { select: { tagName: true } } },
            },
          },
        },
      },
    });

    let mapped = rows.map((r) => {
      const cv = r.subscriber?.SubscriberCVDetails;
      const current = r.subscriber?.SubscriberEmployer?.[0];
      const status = pipelineStatus(r.jobMapStatusID);
      const primary = cv?.skill?.descr?.trim();
      const tagSkills = (r.subscriber?.SubscriberTags ?? [])
        .map((t) => t.tag?.tagName?.trim())
        .filter(Boolean) as string[];
      const skills = [...new Set([...(primary ? [primary] : []), ...tagSkills])];
      const noticeDays = cv?.noticePeriod ?? current?.noticePeriodDays ?? null;
      const latestRound = [...r.InterviewRound].sort((a, b) => b.roundNumber - a.roundNumber)[0];
      return {
        jobSubscriberMapId: Number(r.jobSubscriberMapID),
        subscriberId: Number(r.subscriberID ?? 0),
        jobId: Number(r.jobID ?? 0),
        fullName: cv?.fullName?.trim() || cv?.mobileNo1 || '',
        designation: r.job?.designation?.descr ?? '',
        jobCity: r.job?.jobCity?.descr ?? '',
        city: cv?.city?.descr ?? '',
        experience: cv?.totalExp != null ? `${cv.totalExp} yrs` : '',
        totalExp: cv?.totalExp ?? null,
        jobStatus: r.jobMapStatus?.descr ?? 'Applied',
        status,
        stage: applicationStage(r.jobMapStatusID, r.InterviewRound),
        roundCount: r.InterviewRound.length,
        interviewAt:
          latestRound?.status === 'Scheduled' && latestRound.scheduledAt ? latestRound.scheduledAt.toISOString() : null,
        skills,
        company: current?.employer ?? '',
        notice: noticeDays != null ? `${noticeDays} days` : '',
        noticePeriodDays: noticeDays,
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
          a.jobCity.toLowerCase().includes(needle) ||
          a.company.toLowerCase().includes(needle) ||
          a.skills.some((s) => s.toLowerCase().includes(needle)) ||
          (a.email ?? '').toLowerCase().includes(needle),
      );
    }

    if (cityFilter) {
      const needle = cityFilter.toLowerCase();
      mapped = mapped.filter(
        (a) => a.city.toLowerCase().includes(needle) || a.jobCity.toLowerCase().includes(needle),
      );
    }

    if (minExp != null) {
      mapped = mapped.filter((a) => (a.totalExp ?? -1) >= minExp);
    }

    if (maxNotice != null) {
      mapped = mapped.filter((a) => a.noticePeriodDays != null && a.noticePeriodDays <= maxNotice);
    }

    const page = query.page && query.page > 0 ? query.page : 1;
    const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 100) : 10;
    const total = mapped.length;
    const pageCount = Math.ceil(total / pageSize) || 0;
    const start = (page - 1) * pageSize;
    const items = mapped.slice(start, start + pageSize);

    return {
      items,
      total,
      page,
      pageSize,
      pageCount,
    };
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
        CvReferral: {
          orderBy: { referredByQ2At: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            companyReviewStatus: true,
          },
        },
        InterviewRound: {
          select: { roundNumber: true, roundName: true, status: true, result: true, scheduledAt: true },
        },
        JobSubscriberStatus: {
          orderBy: { statusID: 'desc' },
          take: 30,
          select: { jobMapStatusID: true, comments: true, timestampIns: true },
        },
        subscriber: {
          include: {
            SubscriberCVDetails: {
              include: {
                city: { select: { descr: true } },
                currentCity: { select: { descr: true } },
                skill: { select: { descr: true } },
                industryType: { select: { industryType: true } },
                subFunction: { select: { descr: true } },
              },
            },
            SubscriberCVUploaded: true,
            SubscriberProfileExtra: true,
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
            SubscriberITSkill: { orderBy: { timestampIns: 'desc' } },
            SubscriberCertificate: { orderBy: { timestampIns: 'desc' } },
            SubscriberProject: { orderBy: { timestampIns: 'desc' } },
            SubscriberAccomplishment: { orderBy: { timestampIns: 'desc' } },
            SubscriberPrefferedLocations: {
              include: { city: { select: { descr: true } } },
            },
            SubscriberTags: {
              include: { tag: { select: { tagName: true } } },
            },
          },
        },
      },
    });
    if (!r || Number(r.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const cv = r.subscriber?.SubscriberCVDetails;
    const uploaded = r.subscriber?.SubscriberCVUploaded;
    const extra = r.subscriber?.SubscriberProfileExtra;
    const status = pipelineStatus(r.jobMapStatusID);
    const latestReferral = r.CvReferral?.[0];
    const tagSkills = (r.subscriber?.SubscriberTags ?? [])
      .map((t) => t.tag?.tagName?.trim())
      .filter(Boolean) as string[];
    const primarySkill = cv?.skill?.descr?.trim();
    const skills = [...new Set([...(primarySkill ? [primarySkill] : []), ...tagSkills])];
    const hasResume = Boolean(uploaded?.latestCVPath?.trim() || cv?.cVPath?.trim());
    const genderRaw = cv?.gender?.trim() ?? '';
    const gender =
      genderRaw.toUpperCase() === 'M'
        ? 'Male'
        : genderRaw.toUpperCase() === 'F'
          ? 'Female'
          : genderRaw || '';

    return {
      jobSubscriberMapId: Number(r.jobSubscriberMapID),
      subscriberId: Number(r.subscriberID ?? 0),
      fullName: cv?.fullName?.trim() || cv?.mobileNo1 || '',
      email: cv?.emailID ?? '',
      mobile: cv?.mobileNo1 ?? '',
      gender,
      dateOfBirth: cv?.dOB?.toISOString().slice(0, 10) ?? null,
      address: cv?.addressLine1?.trim() ?? '',
      designation: r.job?.designation?.descr ?? cv?.subFunction?.descr ?? '',
      currentDesignation: cv?.subFunction?.descr ?? '',
      jobCity: r.job?.jobCity?.descr ?? '',
      city: cv?.city?.descr ?? cv?.currentCity?.descr ?? '',
      currentCity: cv?.currentCity?.descr ?? '',
      experience: cv?.totalExp != null ? `${cv.totalExp} yrs` : '',
      totalExp: cv?.totalExp ?? null,
      currentCtc: cv?.currentCTC != null ? Number(cv.currentCTC) : null,
      notice: cv?.noticePeriod != null ? `${cv.noticePeriod} days` : '',
      noticePeriodDays: cv?.noticePeriod ?? null,
      readyToRelocate: cv?.flgReadyToRelocate === 1,
      skills,
      industry: cv?.industryType?.industryType ?? '',
      status,
      jobStatus: r.jobMapStatus?.descr ?? 'Applied',
      appliedOn: r.mapDate?.toISOString().slice(0, 10) ?? '',
      hasResume,
      resumeFileName: uploaded?.cVName?.trim() || (hasResume ? 'Resume.pdf' : null),
      resumeUploadedAt: uploaded
        ? (uploaded.tImestampUpd ?? uploaded.timestampIns)?.toISOString() ?? null
        : null,
      resumeUrl: hasResume ? `/clients/me/applicants/${jobSubscriberMapId}/resume` : null,
      cvPath: hasResume ? `/clients/me/applicants/${jobSubscriberMapId}/resume` : null,
      photoUrl: avatarUrl(r.subscriberID, cv?.photoName),
      resumeHeadline: extra?.resumeHeadline?.trim() ?? '',
      profileSummary: extra?.profileSummary?.trim() ?? '',
      department: extra?.department?.trim() ?? '',
      roleCategory: extra?.roleCategory?.trim() ?? '',
      jobRole: extra?.jobRole?.trim() ?? '',
      desiredJobType: extra?.desiredJobType?.trim() ?? '',
      desiredEmploymentType: extra?.desiredEmploymentType?.trim() ?? '',
      preferredShift: extra?.preferredShift?.trim() ?? '',
      preferredWorkModes: extra?.preferredWorkModes?.trim() ?? '',
      preferredSalary: extra?.preferredSalary != null ? Number(extra.preferredSalary) : null,
      preferredJobRoles: extra?.preferredJobRoles?.trim() ?? '',
      maritalStatus: extra?.maritalStatus?.trim() ?? '',
      preferredLocations: (r.subscriber?.SubscriberPrefferedLocations ?? [])
        .map((p) => p.city?.descr?.trim())
        .filter(Boolean) as string[],
      itSkills: (r.subscriber?.SubscriberITSkill ?? []).map((s) => ({
        name: s.skillName,
        version: s.version ?? '',
        lastUsedYear: s.lastUsedYear,
        expYears: s.expYears,
        expMonths: s.expMonths,
      })),
      certificates: (r.subscriber?.SubscriberCertificate ?? []).map((c) => ({
        name: c.certificateName,
        url: c.certificateUrl ?? '',
        certificationId: c.certificationID ?? '',
        validFrom:
          c.validFromMonth && c.validFromYear ? `${c.validFromMonth}/${c.validFromYear}` : '',
        validTill: c.flgNeverExpires
          ? 'Does not expire'
          : c.validTillMonth && c.validTillYear
            ? `${c.validTillMonth}/${c.validTillYear}`
            : '',
      })),
      projects: (r.subscriber?.SubscriberProject ?? []).map((p) => ({
        title: p.title,
        clientName: p.clientName ?? '',
        status: p.projectStatus ?? '',
        from:
          p.workedFromMonth && p.workedFromYear
            ? `${p.workedFromMonth}/${p.workedFromYear}`
            : '',
        to:
          p.workedTillMonth && p.workedTillYear
            ? `${p.workedTillMonth}/${p.workedTillYear}`
            : '',
        role: p.roleDescr ?? '',
        skillsUsed: p.skillsUsed ?? '',
        details: p.details ?? '',
        teamSize: p.teamSize,
      })),
      accomplishments: (r.subscriber?.SubscriberAccomplishment ?? []).map((a) => ({
        kind: a.kind,
        title: a.title,
        url: a.url ?? '',
        description: a.descr ?? '',
        when: a.eventMonth && a.eventYear ? `${a.eventMonth}/${a.eventYear}` : '',
      })),
      employment: (r.subscriber?.SubscriberEmployer ?? []).map((e) => ({
        employer: e.employer,
        designation: e.designation?.descr ?? '',
        from: e.joiningDate?.toISOString().slice(0, 10) ?? '',
        to: e.releavingDate?.toISOString().slice(0, 10) ?? '',
        salary: e.salary,
        description: e.jobDescr ?? '',
        current: e.flgCurrent === 1 || e.releavingDate == null,
      })),
      education: (r.subscriber?.SubscriberEducation ?? []).map((ed) => ({
        degree: ed.degree?.descr ?? '',
        course: ed.course?.degreeName ?? '',
        institute: ed.instituteName ?? '',
        year: ed.passingYear,
        mode: ed.courseMode ?? '',
        marks: ed.marks ?? '',
      })),
      stage: applicationStage(r.jobMapStatusID, r.InterviewRound),
      timeline: r.JobSubscriberStatus.map((h) => ({
        status: h.comments?.trim() || timelineLabel(h.jobMapStatusID),
        at: h.timestampIns?.toISOString() ?? '',
        comments: '',
      })),
      company: r.subscriber?.SubscriberEmployer?.[0]?.employer ?? '',
      referralId: latestReferral ? Number(latestReferral.id) : null,
      referralStatus: latestReferral?.status ?? null,
      companyReviewStatus: latestReferral?.companyReviewStatus ?? null,
    };
  }

  /** Stream an applicant's uploaded resume when the application belongs to this employer. */
  async getApplicantResume(userId: number, jobSubscriberMapId: number) {
    const clientId = await this.clientIdFor(userId);
    const r = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: {
        job: { select: { clientID: true } },
        subscriber: {
          include: {
            SubscriberCVUploaded: true,
            SubscriberCVDetails: { select: { cVPath: true, fullName: true } },
          },
        },
      },
    });
    if (!r || Number(r.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const uploaded = r.subscriber?.SubscriberCVUploaded;
    const key = uploaded?.latestCVPath?.trim() || r.subscriber?.SubscriberCVDetails?.cVPath?.trim();
    if (!key) throw new NotFoundException('No resume uploaded');

    const body = await this.storage.read(key);
    const fallbackName = `${(r.subscriber?.SubscriberCVDetails?.fullName ?? 'resume').trim().replace(/\s+/g, '_') || 'resume'}.pdf`;
    return {
      body,
      fileName: uploaded?.cVName?.trim() || fallbackName,
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
          ...(dto.keyResponsibilities !== undefined && { keyResponsibilities: dto.keyResponsibilities ?? null }),
          ...(dto.preferredQualifications !== undefined && {
            preferredQualifications: dto.preferredQualifications ?? null,
          }),
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

      if (dto.skillIds !== undefined || dto.skills !== undefined) {
        const resolvedSkills = await this.resolveSkillIds(tx, dto.skillIds, dto.skills);
        await tx.clientJobSkill.deleteMany({ where: { jobID: jobId } });
        if (resolvedSkills.length) {
          await tx.clientJobSkill.createMany({
            data: resolvedSkills.map((skillID) => ({ jobID: jobId, skillID })),
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
      keyResponsibilities: j.keyResponsibilities ?? '',
      preferredQualifications: j.preferredQualifications ?? '',
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
      include: {
        job: { select: { clientID: true } },
        CvReferral: {
          orderBy: { referredByQ2At: 'desc' },
          take: 1,
          select: { id: true, status: true, companyReviewStatus: true },
        },
      },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const current = Number(mapping.jobMapStatusID);
    const roundCount = await this.db.interviewRound.count({
      where: { jobSubscriberMapID: BigInt(jobSubscriberMapId) },
    });
    if (roundCount > 0) {
      throw new BadRequestException(
        'The interview process has started — record the result on the current interview round instead.',
      );
    }
    if (CLOSED_MAP_STATUSES.includes(current) && current !== JobMapStatus.REJECTED) {
      throw new BadRequestException(`This application is already ${timelineLabel(current).toLowerCase()}.`);
    }

    const map: Record<
      ApplicantDecisionDto['decision'],
      { jobMapStatusId: number; historyStatusId: number; comments: string }
    > = {
      Shortlisted: {
        jobMapStatusId: JobMapStatus.SHORTLISTED,
        historyStatusId: SubscriberStatus.SHORTLISTED,
        comments: 'Shortlisted at screening',
      },
      Hired: {
        jobMapStatusId: JobMapStatus.SELECTED,
        historyStatusId: SubscriberStatus.SELECTED,
        comments: 'Selected without interview',
      },
      Rejected: {
        jobMapStatusId: JobMapStatus.REJECTED,
        historyStatusId: SubscriberStatus.REJECTED,
        comments: 'Rejected at screening',
      },
    };
    const next = map[dto.decision];
    await this.applications.transitionStatus(
      jobSubscriberMapId,
      next.jobMapStatusId,
      userId,
      next.historyStatusId,
      next.comments,
    );

    // Any decision ends a referred CV's 14-day review; undo reopens it.
    const referral = mapping.CvReferral?.[0];
    if (referral?.status === 'SentToCompany' && referral.companyReviewStatus === 'Pending') {
      await this.db.cvReferral.update({
        where: { id: referral.id },
        data:
          dto.decision === 'Rejected'
            ? { companyReviewStatus: 'Rejected', status: 'Returned', expiresAt: null }
            : { companyReviewStatus: 'Selected', expiresAt: null },
      });
    }
    await this.audit.record({
      userId,
      action: 'applicant.decision',
      entity: 'JobSubscriberMapping',
      entityId: jobSubscriberMapId,
      detail: { decision: dto.decision },
    });
    return { ok: true, status: dto.decision };
  }

  /**
   * Undo a shortlist or rejection made by mistake: the application returns to its last status
   * that was neither, read from its status history.
   */
  async undoApplicantDecision(userId: number, jobSubscriberMapId: number) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: {
        job: { select: { clientID: true } },
        CvReferral: {
          orderBy: { referredByQ2At: 'desc' },
          take: 1,
          select: { id: true, companyReviewStatus: true, sentToCompanyAt: true },
        },
      },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const current = Number(mapping.jobMapStatusID);
    if (current !== JobMapStatus.SHORTLISTED && current !== JobMapStatus.REJECTED) {
      throw new BadRequestException('Only a shortlist or a rejection can be undone');
    }

    const history = await this.db.jobSubscriberStatus.findMany({
      where: { jobSubscriberMapID: BigInt(jobSubscriberMapId) },
      orderBy: { statusID: 'desc' },
      take: 50,
      select: { jobMapStatusID: true },
    });
    // Newest first. Skipping both marks means undo clears the decision rather than flipping a
    // reject-then-shortlist back to Rejected.
    const marks: number[] = [JobMapStatus.SHORTLISTED, JobMapStatus.REJECTED];
    const previous =
      history.map((h) => Number(h.jobMapStatusID)).find((s) => s && !marks.includes(s)) ??
      JobMapStatus.MAPPED;

    const undone = current === JobMapStatus.SHORTLISTED ? 'shortlist' : 'rejection';
    await this.applications.transitionStatus(
      jobSubscriberMapId,
      previous,
      userId,
      undefined,
      `Undo ${undone}`,
    );

    // The decision also closed the referral's review; reopen its 14-day window.
    const referral = mapping.CvReferral?.[0];
    if (
      previous === JobMapStatus.SENT_TO_COMPANY &&
      (referral?.companyReviewStatus === 'Rejected' || referral?.companyReviewStatus === 'Selected')
    ) {
      const start = referral.sentToCompanyAt ?? new Date();
      await this.db.cvReferral.update({
        where: { id: referral.id },
        data: {
          status: 'SentToCompany',
          companyReviewStatus: 'Pending',
          expiresAt: new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000),
        },
      });
    }

    // A failed interview round put the candidate in Rejected; reopen that round's result.
    const fromInterview = INTERVIEW_MAP_STATUSES.includes(previous) || previous === JobMapStatus.ON_HOLD;
    if (current === JobMapStatus.REJECTED && fromInterview) {
      const failed = await this.db.interviewRound.findFirst({
        where: { jobSubscriberMapID: BigInt(jobSubscriberMapId), result: 'Failed' },
        orderBy: { roundNumber: 'desc' },
        select: { id: true, scheduledAt: true },
      });
      if (failed) {
        await this.db.interviewRound.update({
          where: { id: failed.id },
          data: {
            result: previous === JobMapStatus.ON_HOLD ? 'Hold' : 'Pending',
            status: failed.scheduledAt ? 'Scheduled' : 'Pending',
            updatedAt: new Date(),
          },
        });
      }
    }

    await this.audit.record({
      userId,
      action: 'applicant.decision_undone',
      entity: 'JobSubscriberMapping',
      entityId: jobSubscriberMapId,
      detail: { undone, from: current, to: previous },
    });
    return { ok: true, jobMapStatusId: previous };
  }

  private async ownedApplication(userId: number, jobSubscriberMapId: number) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: {
        job: { select: { clientID: true } },
        CvReferral: {
          orderBy: { referredByQ2At: 'desc' },
          take: 1,
          select: { id: true, status: true, companyReviewStatus: true },
        },
        InterviewRound: { orderBy: { roundNumber: 'asc' } },
      },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }
    return mapping;
  }

  /** Rejects details Q3 could not schedule from; returns them in the shape rounds are stored. */
  private scheduleDetails(dto: InterviewScheduleDetailsDto): RoundDetails {
    const guestName = dto.guestName?.trim();
    const guestEmail = dto.guestEmail?.trim();
    if (Boolean(guestName) !== Boolean(guestEmail)) {
      throw new BadRequestException('Give both the guest’s name and email, or leave both empty');
    }
    if (dto.mode === 'Face to face' && !dto.location?.trim()) {
      throw new BadRequestException('Add the interview venue for a face-to-face round');
    }
    const times = dto.slots.map((s) => new Date(s).getTime());
    if (times.some((t) => Number.isNaN(t) || t <= Date.now())) {
      throw new BadRequestException('All 3 slots must be in the future');
    }
    if (new Set(times).size !== times.length) {
      throw new BadRequestException('The 3 slots must be different times');
    }
    return {
      hrName: dto.hrName.trim(),
      hrEmail: dto.hrEmail.trim(),
      interviewerName: dto.interviewerName.trim(),
      interviewerEmail: dto.interviewerEmail.trim(),
      guestName,
      guestEmail,
      interviewMode: dto.mode,
      meetingLink: dto.mode === 'Video call' ? dto.meetingLink?.trim() : undefined,
      location: dto.mode === 'Face to face' ? dto.location?.trim() : undefined,
      slots: [...times].sort((a, b) => a - b).map((t) => new Date(t).toISOString()),
    };
  }

  async listApplicantInterviewRounds(userId: number, jobSubscriberMapId: number) {
    await this.ownedApplication(userId, jobSubscriberMapId);
    return this.rounds.listRounds(jobSubscriberMapId);
  }

  /** Starts the interview process: the first round goes to Q3, who books one of the 3 slots. */
  async scheduleInterview(userId: number, jobSubscriberMapId: number, dto: ScheduleInterviewDto) {
    const mapping = await this.ownedApplication(userId, jobSubscriberMapId);
    const current = Number(mapping.jobMapStatusID);
    if (CLOSED_MAP_STATUSES.includes(current)) {
      throw new BadRequestException(
        `This application is ${timelineLabel(current).toLowerCase()} — undo that before scheduling an interview.`,
      );
    }
    if (mapping.InterviewRound.length) {
      throw new BadRequestException(
        'The interview process has already started — schedule the next round from the current round’s result.',
      );
    }
    const details = this.scheduleDetails(dto);

    const referral = mapping.CvReferral?.[0];
    if (referral?.status === 'SentToCompany' && referral.companyReviewStatus === 'Pending') {
      await this.db.cvReferral.update({
        where: { id: referral.id },
        data: { companyReviewStatus: 'Selected', expiresAt: null },
      });
    }

    const roundNumber = roundNumberFor(dto.round ?? 'Round1');
    const roundName = roundNameFor(roundNumber);
    const created = await this.rounds.createRound({
      ...details,
      jobSubscriberMapId,
      roundNumber,
      roundName,
      userId,
    });
    await this.audit.record({
      userId,
      action: 'applicant.interview_requested',
      entity: 'JobSubscriberMapping',
      entityId: jobSubscriberMapId,
      detail: { roundNumber, interviewRoundId: created.interviewRoundId },
    });
    return { ok: true, ...created, roundName };
  }

  /**
   * After the interview: reject, hold, or select — and a selection either hires the candidate
   * or sends the next round (with its own details and slots) to Q3.
   */
  async recordInterviewResult(
    userId: number,
    jobSubscriberMapId: number,
    roundId: number,
    dto: InterviewResultDto,
  ) {
    const mapping = await this.ownedApplication(userId, jobSubscriberMapId);
    const round = mapping.InterviewRound.find((r) => Number(r.id) === roundId);
    if (!round) throw new NotFoundException('Interview round not found');
    const roundName = round.roundName ?? roundNameFor(round.roundNumber);

    if (round.status === 'Pending') {
      throw new BadRequestException(`Q3 has not scheduled ${roundName} yet`);
    }
    if (round.status !== 'Scheduled' || !['Pending', 'Hold'].includes(round.result)) {
      throw new BadRequestException(`${roundName} already has a result`);
    }
    if (mapping.InterviewRound.some((r) => r.roundNumber > round.roundNumber)) {
      throw new BadRequestException(`A later round already exists after ${roundName}`);
    }
    if (dto.decision === 'Hold' && round.result === 'Hold') {
      throw new BadRequestException(`${roundName} is already on hold`);
    }

    let nextRound: RoundDetails | undefined;
    if (dto.decision === 'Select' && dto.next && dto.next !== 'Hire') {
      if (round.roundNumber >= 4) {
        throw new BadRequestException('The final round is the last one — hire or reject');
      }
      const nextNumber = roundNumberFor(dto.next);
      if (nextNumber <= round.roundNumber) {
        throw new BadRequestException(`${roundNameFor(nextNumber)} must come after ${roundName}`);
      }
      if (!dto.nextRound) {
        throw new BadRequestException(`Add the ${roundNameFor(nextNumber)} details and 3 slots for Q3`);
      }
      nextRound = this.scheduleDetails(dto.nextRound);
    }

    const result = dto.decision === 'Select' ? 'Passed' : dto.decision === 'Reject' ? 'Failed' : 'Hold';
    const next =
      dto.decision !== 'Select' ? undefined : dto.next === 'Hire' || !dto.next ? 'Select' : dto.next;
    return this.rounds.submitResult(roundId, result, userId, dto.feedback, next, nextRound);
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

  /** Make sure CSV labels like "Full Time" / "Bengaluru" exist (migrate-before-seed gap). */
  private async ensureBulkImportMasters() {
    const empTypes = ['Full Time', 'Part Time', 'Internship', 'Contract'];
    for (const descr of empTypes) {
      await this.db.$executeRaw`
        INSERT INTO "tblMstrEmpType" ("Descr")
        SELECT ${descr}
        WHERE NOT EXISTS (
          SELECT 1 FROM "tblMstrEmpType" e WHERE lower(trim(e."Descr")) = lower(trim(${descr}))
        )
      `;
    }

    const cities: { descr: string; stateId: number }[] = [
      { descr: 'Bengaluru', stateId: 16 },
      { descr: 'Bangalore', stateId: 16 },
      { descr: 'Noida', stateId: 34 },
      { descr: 'Mumbai', stateId: 21 },
      { descr: 'Delhi', stateId: 9 },
    ];
    for (const { descr, stateId } of cities) {
      await this.db.$executeRaw`
        INSERT INTO "tblMstrCily" ("Descr", "StateID")
        SELECT ${descr}, ${stateId}
        WHERE EXISTS (SELECT 1 FROM "tblMstrState" st WHERE st."StateID" = ${stateId})
          AND NOT EXISTS (
            SELECT 1 FROM "tblMstrCily" c WHERE lower(trim(c."Descr")) = lower(trim(${descr}))
          )
      `;
    }
  }

  /** Bulk-upload jobs from a CSV. `commit=false` validates/previews only — no jobs are written. */
  async bulkUploadJobs(userId: number, file: Express.Multer.File, commit = false) {
    if (!file || !file.buffer) throw new BadRequestException('No file provided');

    const clientId = await this.clientIdFor(userId);
    const content = file.buffer.toString('utf-8').replace(/^\uFEFF/, '');
    const lines = content.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) throw new BadRequestException('CSV must have a header row and at least one data row');

    const headers = parseCsvLine(lines[0]).map(headerKey);
    const dataLines = lines.slice(1);

    await this.ensureBulkImportMasters();

    const [designations, cities, workModes, empTypes, industries] = await Promise.all([
      this.db.mstrDesignation.findMany(),
      this.db.mstrCily.findMany(),
      this.db.mstrWorkMode.findMany(),
      this.db.mstrEmpType.findMany(),
      this.db.mstrIndustryType.findMany(),
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
    let valid = 0;
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
      const interviewModeRaw = col(row, 'interview mode');

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

      if (description.length > 1000) {
        errors.push({ row: rowNum, reason: 'Job Description exceeds 1000 characters' });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'Description too long' });
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
      const modes = interviewModeRaw
        ? interviewModeRaw.split('|').map((m) => m.trim())
        : [];
      const interviewProcess =
        rounds.length || processes.length || modes.length
          ? encodeInterviewProcess(
              (rounds.length
                ? rounds
                : (processes.length ? processes : modes).map((_, idx) => String(idx + 1))
              ).map((r, idx) => {
                const mode = normalizeInterviewMode(modes[idx] ?? '');
                return {
                  round: parseInt(r, 10) || idx + 1,
                  process: processes[idx] ?? '',
                  ...(mode ? { mode } : {}),
                };
              }),
            )
          : null;

      const skillNames = skillsRaw
        .split(/[,;]/)
        .map((s) => s.trim().slice(0, 100))
        .filter(Boolean);
      if (!skillNames.length) {
        errors.push({ row: rowNum, reason: `No Skills provided` });
        preview.push({ row: rowNum, position, location, status: 'Error', error: 'No Skills' });
        continue;
      }

      try {
        if (commit) {
          await this.db.$transaction(async (tx) => {
            const skillIds = await this.resolveSkillIds(tx, undefined, skillNames);

            const job = await tx.clientJobs.create({
              data: {
                clientID: clientId,
                designationID: designation.designationID,
                employeeTypeID: emp.employeeTypeID,
                workModeID: mode.workModeID,
                jobCityID: city.cityID,
                industryTypeID: industry.industryTypeID,
                jobDescr: description.slice(0, 1000),
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
        }

        valid++;
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
      valid,
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
        jobCity: { select: { descr: true } },
        JobSubscriberMapping: {
          select: {
            jobMapStatusID: true,
            mapDate: true,
            InterviewRound: { select: { result: true } },
          },
        },
      },
    });

    const totalJobs = jobs.length;
    const activeJobs = jobs.filter((j) => j.statusID === JOB_STATUS_ACTIVE).length;
    const closedJobs = jobs.filter((j) => j.statusID === JOB_STATUS_CLOSED).length;
    const draftJobs = jobs.filter((j) => j.statusID === JOB_STATUS_DRAFT).length;
    const archivedJobs = jobs.filter((j) => j.statusID === JOB_STATUS_ARCHIVED).length;

    // Every application sits in exactly one current-stage bucket, so the buckets add up to the
    // total. The funnel counts how far each one got, which a current status alone cannot say.
    const totals = {
      applications: 0,
      mapped: 0,
      inReview: 0,
      shortlisted: 0,
      inInterview: 0,
      onHold: 0,
      hired: 0,
      rejectedAtScreening: 0,
      rejectedAfterInterview: 0,
      closedOther: 0,
      passedScreening: 0,
      interviewed: 0,
      hiredAfterInterview: 0,
    };
    type Totals = typeof totals;
    const classify = (a: { jobMapStatusID: number | null; InterviewRound: { result: string }[] }) => {
      const s = a.jobMapStatusID;
      const hadRounds = a.InterviewRound.length > 0;
      const hired = s != null && HIRED_MAP_STATUSES.includes(s);
      const rejected = s === JobMapStatus.REJECTED;
      const interviewed = hadRounds || (s != null && INTERVIEW_MAP_STATUSES.includes(s));
      let bucket: keyof Totals;
      if (hired) bucket = 'hired';
      else if (rejected) {
        bucket = a.InterviewRound.some((r) => r.result === 'Failed') ? 'rejectedAfterInterview' : 'rejectedAtScreening';
      } else if (interviewed) bucket = s === JobMapStatus.ON_HOLD ? 'onHold' : 'inInterview';
      else if (s === JobMapStatus.SHORTLISTED) bucket = 'shortlisted';
      else if (s === JobMapStatus.ON_HOLD) bucket = 'onHold';
      else if (s === JobMapStatus.SENT_TO_COMPANY || s === JobMapStatus.REFERRED_TO_Q3) bucket = 'inReview';
      else if (s == null || s === JobMapStatus.MAPPED) bucket = 'mapped';
      else bucket = 'closedOther';
      return {
        bucket,
        passedScreening: hired || interviewed || s === JobMapStatus.SHORTLISTED,
        interviewed,
        hired,
        hiredAfterInterview: hired && interviewed,
      };
    };

    const monthBuckets = new Map<string, number>();
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets.set(key, 0);
    }

    const pct = (n: number, d: number) => (d ? Math.round((n / d) * 1000) / 10 : 0);

    const jobPerformance = jobs.map((j) => {
      const apps = j.JobSubscriberMapping;
      let jPassed = 0;
      let jInterviewed = 0;
      let jHired = 0;
      let jRejected = 0;
      let jMapped = 0;

      for (const a of apps) {
        const c = classify(a);
        totals.applications += 1;
        totals[c.bucket] += 1;
        if (c.passedScreening) totals.passedScreening += 1;
        if (c.interviewed) totals.interviewed += 1;
        if (c.hiredAfterInterview) totals.hiredAfterInterview += 1;

        if (c.passedScreening) jPassed += 1;
        if (c.interviewed) jInterviewed += 1;
        if (c.hired) jHired += 1;
        if (c.bucket === 'rejectedAtScreening' || c.bucket === 'rejectedAfterInterview') jRejected += 1;
        if (c.bucket === 'mapped') jMapped += 1;

        if (!a.mapDate) continue;
        const key = `${a.mapDate.getFullYear()}-${String(a.mapDate.getMonth() + 1).padStart(2, '0')}`;
        if (monthBuckets.has(key)) monthBuckets.set(key, (monthBuckets.get(key) ?? 0) + 1);
      }

      return {
        jobId: Number(j.jobID),
        designation: j.designation?.descr ?? '',
        city: j.jobCity?.descr ?? '',
        status: jobStatus(j.statusID),
        applications: apps.length,
        mapped: jMapped,
        /** Reached at least this far — shortlisted, interviewed or hired. */
        shortlisted: jPassed,
        interviewScheduled: jInterviewed,
        selected: jHired,
        rejected: jRejected,
        shortlistRate: pct(jPassed, apps.length),
        hireRate: pct(jHired, apps.length),
      };
    });

    jobPerformance.sort((a, b) => b.applications - a.applications);

    const totalApplications = totals.applications;
    const rejected = totals.rejectedAtScreening + totals.rejectedAfterInterview;

    const applicationsByMonth = [...monthBuckets.entries()].map(([month, count]) => ({
      month,
      label: new Date(`${month}-01`).toLocaleString('en', { month: 'short', year: '2-digit' }),
      count,
    }));

    return {
      totalJobs,
      activeJobs,
      closedJobs,
      draftJobs,
      archivedJobs,
      totalApplications,
      // Current stage — these add up to totalApplications.
      mapped: totals.mapped,
      inReview: totals.inReview,
      shortlisted: totals.shortlisted,
      interviewScheduled: totals.inInterview,
      onHold: totals.onHold,
      selected: totals.hired,
      rejected,
      rejectedAtScreening: totals.rejectedAtScreening,
      rejectedAfterInterview: totals.rejectedAfterInterview,
      closedOther: totals.closedOther,
      // How far applications got.
      funnel: {
        applied: totalApplications,
        passedScreening: totals.passedScreening,
        interviewed: totals.interviewed,
        hired: totals.hired,
      },
      rates: {
        shortlistRate: pct(totals.passedScreening, totalApplications),
        interviewRate: pct(totals.interviewed, totalApplications),
        hireRate: pct(totals.hired, totalApplications),
        rejectRate: pct(rejected, totalApplications),
        interviewFromShortlist: pct(totals.interviewed, totals.passedScreening),
        hireFromInterview: pct(totals.hiredAfterInterview, totals.interviewed),
      },
      applicationsByMonth,
      jobPerformance,
    };
  }

  /**
   * Full analytics audit CSV: summary + funnel + job performance + every applicant row.
   * Used by employers for internal audit / sharing with leadership.
   */
  async exportAnalyticsCsv(userId: number) {
    const clientId = await this.clientIdFor(userId);
    const analytics = await this.analytics(userId);

    const applicants = await this.db.jobSubscriberMapping.findMany({
      where: { job: { clientID: clientId } },
      orderBy: { mapDate: 'desc' },
      include: {
        jobMapStatus: { select: { descr: true } },
        InterviewRound: {
          select: { roundNumber: true, roundName: true, status: true, result: true, scheduledAt: true },
        },
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
                skill: { select: { descr: true } },
              },
            },
            SubscriberEmployer: {
              orderBy: { timestampIns: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const esc = (v: string | number | null | undefined) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const line = (cells: Array<string | number | null | undefined>) => cells.map(esc).join(',');

    const sections: string[] = [];
    const generatedAt = new Date().toISOString();

    sections.push('AAJIVEKA ANALYTICS AUDIT EXPORT');
    sections.push(line(['GeneratedAt', generatedAt]));
    sections.push('');

    sections.push('SUMMARY');
    sections.push(line(['Metric', 'Value']));
    sections.push(line(['TotalJobs', analytics.totalJobs]));
    sections.push(line(['ActiveJobs', analytics.activeJobs]));
    sections.push(line(['ClosedJobs', analytics.closedJobs]));
    sections.push(line(['DraftJobs', analytics.draftJobs]));
    sections.push(line(['ArchivedJobs', analytics.archivedJobs]));
    sections.push(line(['TotalApplications', analytics.totalApplications]));
    sections.push(line(['New', analytics.mapped]));
    sections.push(line(['AwaitingReview', analytics.inReview]));
    sections.push(line(['Shortlisted', analytics.shortlisted]));
    sections.push(line(['InInterview', analytics.interviewScheduled]));
    sections.push(line(['OnHold', analytics.onHold]));
    sections.push(line(['Hired', analytics.selected]));
    sections.push(line(['RejectedAtScreening', analytics.rejectedAtScreening]));
    sections.push(line(['RejectedAfterInterview', analytics.rejectedAfterInterview]));
    sections.push(line(['ExpiredOrWithdrawn', analytics.closedOther]));
    sections.push(line(['ShortlistRatePct', analytics.rates.shortlistRate]));
    sections.push(line(['InterviewRatePct', analytics.rates.interviewRate]));
    sections.push(line(['HireRatePct', analytics.rates.hireRate]));
    sections.push(line(['RejectRatePct', analytics.rates.rejectRate]));
    sections.push(line(['InterviewFromShortlistPct', analytics.rates.interviewFromShortlist]));
    sections.push(line(['HireFromInterviewPct', analytics.rates.hireFromInterview]));
    sections.push('');

    sections.push('FUNNEL');
    sections.push(line(['Step', 'Reached']));
    sections.push(line(['Applied', analytics.funnel.applied]));
    sections.push(line(['PassedScreening', analytics.funnel.passedScreening]));
    sections.push(line(['Interviewed', analytics.funnel.interviewed]));
    sections.push(line(['Hired', analytics.funnel.hired]));
    sections.push('');

    sections.push('APPLICATIONS_BY_MONTH');
    sections.push(line(['Month', 'Applications']));
    for (const m of analytics.applicationsByMonth) {
      sections.push(line([m.month, m.count]));
    }
    sections.push('');

    sections.push('JOB_PERFORMANCE');
    sections.push(
      line([
        'JobId',
        'Designation',
        'City',
        'Status',
        'Applications',
        'New',
        'PassedScreening',
        'Interviewed',
        'Hired',
        'Rejected',
        'ShortlistRatePct',
        'HireRatePct',
      ]),
    );
    for (const j of analytics.jobPerformance) {
      sections.push(
        line([
          j.jobId,
          j.designation,
          j.city,
          j.status,
          j.applications,
          j.mapped,
          j.shortlisted,
          j.interviewScheduled,
          j.selected,
          j.rejected,
          j.shortlistRate,
          j.hireRate,
        ]),
      );
    }
    sections.push('');

    sections.push('APPLICANTS_FULL');
    sections.push(
      line([
        'ApplicationId',
        'AppliedOn',
        'CandidateName',
        'Email',
        'Mobile',
        'City',
        'ExperienceYrs',
        'CurrentCompany',
        'NoticeDays',
        'PrimarySkill',
        'JobId',
        'JobTitle',
        'JobCity',
        'PipelineStatus',
        'Stage',
        'InterviewRounds',
        'JobMapStatus',
      ]),
    );
    for (const r of applicants) {
      const cv = r.subscriber?.SubscriberCVDetails;
      const emp = r.subscriber?.SubscriberEmployer?.[0];
      const status = pipelineStatus(r.jobMapStatusID);
      sections.push(
        line([
          Number(r.jobSubscriberMapID),
          r.mapDate?.toISOString().slice(0, 10) ?? '',
          cv?.fullName?.trim() || '',
          cv?.emailID ?? '',
          cv?.mobileNo1 ?? '',
          cv?.city?.descr ?? '',
          cv?.totalExp ?? '',
          emp?.employer ?? '',
          cv?.noticePeriod ?? emp?.noticePeriodDays ?? '',
          cv?.skill?.descr ?? '',
          Number(r.jobID ?? 0),
          r.job?.designation?.descr ?? '',
          r.job?.jobCity?.descr ?? '',
          status,
          applicationStage(r.jobMapStatusID, r.InterviewRound),
          r.InterviewRound.length,
          r.jobMapStatus?.descr ?? '',
        ]),
      );
    }

    const stamp = generatedAt.slice(0, 10);
    return {
      fileName: `aajiveka-analytics-audit-${stamp}.csv`,
      body: sections.join('\n'),
    };
  }

  /** Invoices the Aajiveka admin has raised to this company — nothing is billed until one exists. */
  async billing(userId: number) {
    const clientId = await this.clientIdFor(userId);
    const rows = await this.db.clientInvoice.findMany({
      where: { clientID: clientId },
      orderBy: [{ invoiceDate: 'desc' }, { id: 'desc' }],
    });

    const invoices = rows.map((r) => ({
      invoiceId: Number(r.id),
      invoiceNo: r.invoiceNo,
      invoiceDate: r.invoiceDate.toISOString().slice(0, 10),
      dueDate: r.dueDate?.toISOString().slice(0, 10) ?? null,
      description: r.description ?? '',
      amount: Number(r.amount),
      tax: Number(r.tax),
      total: Number(r.total),
      status: r.status,
      paidAt: r.paidAt?.toISOString() ?? null,
    }));
    const live = invoices.filter((i) => i.status !== 'Cancelled');
    const sum = (list: typeof invoices) => list.reduce((acc, i) => acc + i.total, 0);

    return {
      currency: 'INR',
      invoiceCount: live.length,
      totalBilled: sum(live),
      totalPaid: sum(live.filter((i) => i.status === 'Paid')),
      outstanding: sum(live.filter((i) => i.status !== 'Paid')),
      invoices,
    };
  }

  /** CSV export of the company's invoices for accounts / audit. */
  async exportBillingCsv(userId: number) {
    const data = await this.billing(userId);
    const esc = (v: string | number | null | undefined) => {
      const s = v == null ? '' : String(v);
      return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const line = (cells: Array<string | number | null | undefined>) => cells.map(esc).join(',');
    const stamp = new Date().toISOString();
    const lines: string[] = [
      'AAJIVEKA INVOICES',
      line(['GeneratedAt', stamp]),
      line(['Currency', data.currency]),
      line(['TotalBilled', data.totalBilled]),
      line(['TotalPaid', data.totalPaid]),
      line(['Outstanding', data.outstanding]),
      '',
      line(['InvoiceNo', 'InvoiceDate', 'DueDate', 'Description', 'Amount', 'Tax', 'Total', 'Status', 'PaidAt']),
      ...data.invoices.map((i) =>
        line([i.invoiceNo, i.invoiceDate, i.dueDate, i.description, i.amount, i.tax, i.total, i.status, i.paidAt]),
      ),
    ];

    return {
      fileName: `aajiveka-invoices-${stamp.slice(0, 10)}.csv`,
      body: lines.join('\n'),
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

  /** List uploaded documents for an applicant (forwarded by Q3). */
  async getApplicantDocuments(userId: number, jobSubscriberMapId: number) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: { job: { select: { clientID: true } } },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const docs = await this.db.candidateDocumentUploaded.findMany({
      where: { subscriberID: mapping.subscriberID },
      include: {
        documentType: { select: { documentType: true } },
      },
      orderBy: { timestampIns: 'desc' },
    });

    const uploaded = docs.map((d) => ({
      docUploadId: Number(d.docUploadID) as number | null,
      documentType: d.documentType?.documentType ?? '',
      documentPath: d.documentPath,
      status: d.flgStatus === 1 ? 'Verified' : d.flgStatus === 2 ? 'Rejected' : 'Pending',
      uploadedAt: d.timestampIns?.toISOString() ?? null,
    }));

    // Asked for but not uploaded yet — shown so the employer can see what Q3 is chasing.
    const uploadedTypes = new Set(docs.map((d) => d.documentTypeID));
    const requested = await this.db.candidateDocumentMap.findMany({
      where: { subscriberID: mapping.subscriberID },
      include: { documentType: { select: { documentType: true } } },
      orderBy: { timestampIns: 'asc' },
    });
    const awaiting = requested
      .filter((r) => !uploadedTypes.has(r.documentTypeID))
      .map((r) => ({
        docUploadId: null,
        documentType: r.documentType?.documentType ?? '',
        documentPath: null,
        status: 'Requested',
        uploadedAt: null,
      }));

    return [...awaiting, ...uploaded];
  }

  /** Company reviews an applicant's document (approve or request corrections). */
  async reviewApplicantDocument(
    userId: number,
    jobSubscriberMapId: number,
    input: { docUploadId: number; status: 'Approved' | 'NeedsCorrection'; comments?: string },
  ) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: { job: { select: { clientID: true } } },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const statusId = input.status === 'Approved' ? 1 : 3; // 1=Verified, 3=NeedsCorrection
    await this.db.candidateDocumentStatus.create({
      data: {
        docUploadID: BigInt(input.docUploadId),
        statusID: statusId,
        comments: input.comments ?? null,
        userID: BigInt(userId),
        timestampIns: new Date(),
        loginIDIns: userId,
      },
    });

    // Update the uploaded doc's flag status
    await this.db.candidateDocumentUploaded.update({
      where: { docUploadID: BigInt(input.docUploadId) },
      data: { flgStatus: statusId, timestampUpd: new Date(), loginIDUpd: userId },
    });

    return { ok: true };
  }

  async requestableDocumentTypes() {
    const rows = await this.db.mstrDocumentType.findMany({ orderBy: { documentTypeID: 'asc' } });
    return rows
      .filter((r) => r.documentType?.trim() && !SYSTEM_DOCUMENT_TYPES.has(r.documentType.trim().toLowerCase()))
      .map((r) => ({ documentTypeId: r.documentTypeID, name: r.documentType!.trim() }));
  }

  /** Case-insensitive match against tblMstrDocumentType; unknown names are added to it. */
  private async documentTypeIdsForNames(names: string[]): Promise<number[]> {
    const wanted = [...new Map(names.map((n) => n.trim()).filter(Boolean).map((n) => [n.toLowerCase(), n])).values()];
    if (!wanted.length) return [];
    const master = await this.db.mstrDocumentType.findMany();
    const ids: number[] = [];
    for (const name of wanted) {
      const hit = master.find((m) => m.documentType?.trim().toLowerCase() === name.toLowerCase());
      if (hit) {
        ids.push(hit.documentTypeID);
        continue;
      }
      const created = await this.db.mstrDocumentType.create({ data: { documentType: name } });
      ids.push(created.documentTypeID);
    }
    return ids;
  }

  /** Company asks Q3 to collect specific document types from the selected candidate. */
  async requestApplicantDocuments(
    userId: number,
    jobSubscriberMapId: number,
    documentTypeIds: number[],
    documentNames: string[] = [],
  ) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: { job: { select: { clientID: true } } },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }
    if (Number(mapping.jobMapStatusID) !== JobMapStatus.SELECTED) {
      throw new BadRequestException('Documents can only be requested after selection');
    }

    const requestedIds = [
      ...new Set([...documentTypeIds, ...(await this.documentTypeIdsForNames(documentNames))]),
    ];
    if (!requestedIds.length) {
      throw new BadRequestException('Name at least one document');
    }

    const existing = await this.db.candidateDocumentMap.findMany({
      where: { subscriberID: mapping.subscriberID },
      select: { documentTypeID: true },
    });
    const already = new Set(existing.map((e) => e.documentTypeID));
    const toCreate = requestedIds.filter((id) => !already.has(id));
    if (toCreate.length) {
      const now = new Date();
      await this.db.candidateDocumentMap.createMany({
        data: toCreate.map((documentTypeID) => ({
          subscriberID: mapping.subscriberID,
          jobSubscriberMapID: BigInt(jobSubscriberMapId),
          documentTypeID,
          flgStatus: 0,
          timestampIns: now,
          loginIDIns: userId,
        })),
      });
    }

    await this.audit.record({
      userId,
      action: 'applicant.documents_requested',
      entity: 'JobSubscriberMapping',
      entityId: jobSubscriberMapId,
      detail: { documentTypeIds: requestedIds },
    });

    return { ok: true, requested: toCreate.length, alreadyRequested: requestedIds.length - toCreate.length };
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
      logoUrl: companyLogoApiPath(Number(c.clientID), c.companyLogo),
      description: c.companyDescr ?? '',
    };
  }
}
