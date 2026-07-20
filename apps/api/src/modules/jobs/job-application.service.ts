import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobMapStatus, SubscriberStatus } from '@/shared/status';

const JOB_STATUS_ACTIVE = 1;

/**
 * The shared write path behind every action that creates or moves a job application
 * (tblJobSubscriberMapping): candidate self-apply, staff assign-to-job, client
 * shortlist/reject, and interview scheduling/attendance all funnel through here so the
 * four-table write (mapping + status-log row + "latest status" + candidate journey
 * history) only exists once.
 */
@Injectable()
export class JobApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Creates a new application (candidate self-apply, or staff assign-to-job). */
  async apply(subscriberId: number, jobId: number, actorUserId: number) {
    const job = await this.db.clientJobs.findUnique({
      where: { jobID: jobId },
      select: { jobID: true, statusID: true, clientID: true },
    });
    if (!job || job.statusID !== JOB_STATUS_ACTIVE) {
      throw new NotFoundException('Job not found or no longer active');
    }

    const existing = await this.db.jobSubscriberMapping.findFirst({
      where: { jobID: jobId, subscriberID: subscriberId },
      select: { jobSubscriberMapID: true },
    });
    if (existing) throw new BadRequestException('Already applied to this job');

    const now = new Date();
    const mapping = await this.db.$transaction(async (tx) => {
      const map = await tx.jobSubscriberMapping.create({
        data: {
          jobID: jobId,
          subscriberID: subscriberId,
          mapDate: now,
          jobMapStatusID: JobMapStatus.MAPPED,
          timestampIns: now,
          loginIDIns: actorUserId,
        },
      });
      await tx.jobSubscriberStatus.create({
        data: {
          jobSubscriberMapID: map.jobSubscriberMapID,
          jobMapStatusID: JobMapStatus.MAPPED,
          mappedbyUserID: actorUserId,
          timestampIns: now,
        },
      });
      await tx.subscriberJobStatusLatest.upsert({
        where: { subscriberID: subscriberId },
        create: {
          subscriberID: subscriberId,
          clientID: job.clientID,
          jobID: jobId,
          jobSubscriberMapID: map.jobSubscriberMapID,
          jobMapStatusID: JobMapStatus.MAPPED,
          timestampIns: now,
          flgClose: 0,
        },
        update: {
          clientID: job.clientID,
          jobID: jobId,
          jobSubscriberMapID: map.jobSubscriberMapID,
          jobMapStatusID: JobMapStatus.MAPPED,
          timestampIns: now,
          flgClose: 0,
        },
      });
      await tx.subscriberStatusHistory.create({
        data: {
          subscriberID: subscriberId,
          jobID: jobId,
          clientID: job.clientID,
          jobSubscriberMapID: map.jobSubscriberMapID,
          statusID: SubscriberStatus.MAPPED_TO_JOB,
          userID: actorUserId,
          timestampIns: now,
          loginIDIns: actorUserId,
        },
      });
      return map;
    });

    await this.audit.record({
      userId: actorUserId,
      action: 'job.applied',
      entity: 'JobSubscriberMapping',
      entityId: Number(mapping.jobSubscriberMapID),
    });
    return { jobSubscriberMapId: Number(mapping.jobSubscriberMapID) };
  }

  /**
   * Moves an existing application to a new JobMapStatus (shortlist/reject, interview
   * scheduling/attendance). Only touches tblSubscriberJobStatusLatest when that row is
   * still pointing at this mapping — a candidate can have applied elsewhere since.
   */
  async transitionStatus(
    jobSubscriberMapId: number,
    jobMapStatusId: number,
    actorUserId: number,
    historyStatusId?: number,
    comments?: string,
  ) {
    const map = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
    });
    if (!map) throw new NotFoundException('Application not found');

    const now = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.jobSubscriberMapping.update({
        where: { jobSubscriberMapID: jobSubscriberMapId },
        data: { jobMapStatusID: jobMapStatusId, timestampUpd: now, loginIDUpd: actorUserId },
      });
      await tx.jobSubscriberStatus.create({
        data: {
          jobSubscriberMapID: jobSubscriberMapId,
          jobMapStatusID: jobMapStatusId,
          mappedbyUserID: actorUserId,
          comments: comments ?? null,
          timestampIns: now,
        },
      });
      if (map.subscriberID != null) {
        const latest = await tx.subscriberJobStatusLatest.findUnique({
          where: { subscriberID: map.subscriberID },
          select: { jobSubscriberMapID: true },
        });
        if (latest && Number(latest.jobSubscriberMapID) === jobSubscriberMapId) {
          await tx.subscriberJobStatusLatest.update({
            where: { subscriberID: map.subscriberID },
            data: { jobMapStatusID: jobMapStatusId, timestampIns: now },
          });
        }
      }
      if (historyStatusId != null) {
        await tx.subscriberStatusHistory.create({
          data: {
            subscriberID: map.subscriberID,
            jobID: map.jobID,
            jobSubscriberMapID: jobSubscriberMapId,
            statusID: historyStatusId,
            userID: actorUserId,
            timestampIns: now,
            loginIDIns: actorUserId,
          },
        });
      }
    });

    return { jobSubscriberMapId };
  }
}
