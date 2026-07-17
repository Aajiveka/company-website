import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { JOB_STATUS_ACTIVE, JobMapStatus, SubscriberStatus } from '@/shared/status';
import type { ApplicantDecisionDto, CreateJobDto, UpdateJobDto } from './dto/clients.dto';

const jobStatus = (statusId: number | null) =>
  statusId === JOB_STATUS_ACTIVE ? 'Active' : 'Closed';

/** The employer (client) side — tblClientMstr and the jobs it owns. */
@Injectable()
export class ClientsService {
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
      email: c.emailID ?? '',
      contactNo: c.contactNo ?? '',
      website: c.companyWebsite ?? '',
      city: c.city?.descr ?? '',
      address: c.clientAddress ?? '',
      logoUrl: c.companyLogo?.trim() ? `/files/${c.companyLogo}` : null,
      description: c.companyDescr ?? '',
    };
  }

  /** Port of spClientGetJoblisting — the company's own openings, with applicant counts. */
  async jobs(userId: number) {
    const clientId = await this.clientIdFor(userId);
    const rows = await this.db.clientJobs.findMany({
      where: { clientID: clientId },
      orderBy: { timestampIns: 'desc' },
      include: {
        jobCity: { select: { descr: true } },
        designation: { select: { descr: true } },
        employeeType: { select: { descr: true } },
        workMode: { select: { descr: true } },
        ClientJobSkill: { select: { skillID: true } },
        _count: { select: { JobSubscriberMapping: true } },
      },
    });

    return rows.map((j) => ({
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
      minCtc: j.minCTC,
      maxCtc: j.maxCTC,
      status: jobStatus(j.statusID),
      applicants: j._count.JobSubscriberMapping,
      postedOn: j.timestampIns.toISOString().slice(0, 10),
    }));
  }

  /**
   * Port of spClientManageJob (insert path). The legacy proc writes several rows with NO
   * transaction — there is not a single BEGIN TRAN in the 97 procs — so a half-written job
   * was possible. This wraps the writes.
   */
  async createJob(userId: number, dto: CreateJobDto) {
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
          minCTC: dto.minCtc,
          maxCTC: dto.maxCtc,
          maxEmp: dto.openings ?? null,
          statusID: JOB_STATUS_ACTIVE,
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
  async applicants(userId: number) {
    const clientId = await this.clientIdFor(userId);
    const rows = await this.db.jobSubscriberMapping.findMany({
      where: { job: { clientID: clientId } },
      orderBy: { mapDate: 'desc' },
      include: {
        jobMapStatus: { select: { descr: true } },
        job: { include: { designation: { select: { descr: true } } } },
        subscriber: {
          include: {
            SubscriberCVDetails: {
              include: { city: { select: { descr: true } } },
            },
          },
        },
      },
    });

    return rows.map((r) => {
      const cv = r.subscriber?.SubscriberCVDetails;
      return {
        subscriberId: Number(r.subscriberID ?? 0),
        fullName: cv?.fullName?.trim() || cv?.mobileNo1 || '',
        designation: r.job?.designation?.descr ?? '',
        city: cv?.city?.descr ?? '',
        experience: cv?.totalExp != null ? `${cv.totalExp} yrs` : '',
        jobStatus: r.jobMapStatus?.descr ?? 'Applied',
        appliedOn: r.mapDate?.toISOString().slice(0, 10) ?? '',
        jobSubscriberMapId: Number(r.jobSubscriberMapID),
      };
    });
  }

  /** id-backed lookup lists for the job post/edit form (fixes free-text fields that never matched CreateJobDto's ints). */
  async masters() {
    const [designations, cities, workModes, employmentTypes, industryTypes, skills] = await Promise.all([
      this.db.mstrDesignation.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrCily.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrWorkMode.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrEmpType.findMany({ orderBy: { descr: 'asc' } }),
      this.db.mstrIndustryType.findMany({ orderBy: { industryType: 'asc' } }),
      this.db.mstrSkills.findMany({ orderBy: { descr: 'asc' } }),
    ]);
    const opt = (id: number, label: string | null) => ({ id, label: label ?? '' });
    return {
      designations: designations.map((d) => opt(d.designationID, d.descr)),
      cities: cities.map((c) => opt(c.cityID, c.descr)),
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

  /** Edit an existing job posting. */
  async updateJob(userId: number, jobId: number, dto: UpdateJobDto) {
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
          ...(dto.openings !== undefined && { maxEmp: dto.openings ?? null }),
          ...(dto.minCtc != null && { minCTC: dto.minCtc }),
          ...(dto.maxCtc != null && { maxCTC: dto.maxCtc }),
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
    await this.ownedJob(userId, jobId);
    await this.db.clientJobs.update({
      where: { jobID: jobId },
      data: { statusID: 2 /* Closed, see the JOB_STATUS_ACTIVE note above */, timestampUpd: new Date(), loginIDUpd: userId },
    });
    await this.audit.record({ userId, action: 'job.deactivated', entity: 'ClientJobs', entityId: jobId });
    return { ok: true };
  }

  /** Client-side shortlist/reject of an applicant (spClientShortListRejectSubscriber, RoleID=4 branch). */
  async decideApplicant(userId: number, jobSubscriberMapId: number, dto: ApplicantDecisionDto) {
    const clientId = await this.clientIdFor(userId);
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      include: { job: { select: { clientID: true } } },
    });
    if (!mapping || Number(mapping.job?.clientID ?? -1) !== Number(clientId)) {
      throw new NotFoundException('Application not found');
    }

    const jobMapStatusId = dto.decision === 'Shortlisted' ? JobMapStatus.SHORTLISTED : JobMapStatus.REJECTED;
    const historyStatusId = dto.decision === 'Shortlisted' ? SubscriberStatus.SHORTLISTED : SubscriberStatus.REJECTED;
    await this.applications.transitionStatus(jobSubscriberMapId, jobMapStatusId, userId, historyStatusId);
    await this.audit.record({
      userId,
      action: 'applicant.decision',
      entity: 'JobSubscriberMapping',
      entityId: jobSubscriberMapId,
      detail: { decision: dto.decision },
    });
    return { ok: true };
  }
}
