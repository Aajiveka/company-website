import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { CreateJobDto } from './dto/clients.dto';

/**
 * A job is Active or Closed, nothing else.
 *
 * spClientGetJoblisting reads tblClientJobs.StatusID as
 *   CASE WHEN StatusID = 1 THEN 'Active' ELSE 'Closed' END
 * and spClientManageJob writes 1 on insert. It is a flag, not a lookup — tblMstrStatus is
 * the CANDIDATE journey, and joining it made every job display "Account created".
 */
const JOB_STATUS_ACTIVE = 1;
const jobStatus = (statusId: number | null) =>
  statusId === JOB_STATUS_ACTIVE ? 'Active' : 'Closed';

/** The employer (client) side — tblClientMstr and the jobs it owns. */
@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

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
        _count: { select: { JobSubscriberMapping: true } },
      },
    });

    return rows.map((j) => ({
      jobId: Number(j.jobID),
      designation: j.designation?.descr ?? '',
      city: j.jobCity?.descr ?? '',
      workMode: j.workMode?.descr ?? '',
      employmentType: j.employeeType?.descr ?? '',
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
      };
    });
  }
}
