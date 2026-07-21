import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { AuditService } from '@/modules/audit/audit.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { JobMapStatus, SubscriberStatus } from '@/shared/status';
import type {
  CandidatesQueryDto,
  ReviewDocumentDto,
  ScheduleInterviewDto,
  UpdateInterviewStatusDto,
} from './dto/recruitment.dto';

/** tblSubscriberRegistration.flgstatus: 0 = pending QC1 decision, 1 = approved, 2 = rejected. */
function registrationStatusLabel(flgstatus: number): 'Pending' | 'Approved' | 'Rejected' {
  return flgstatus === 1 ? 'Approved' : flgstatus === 2 ? 'Rejected' : 'Pending';
}

/** The QC / recruitment side. */
@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
    private readonly audit: AuditService,
    private readonly applications: JobApplicationsService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Port of spSubscriberGetSubscriberForListing — the paginated QC candidate list. */
  async candidateList(q: CandidatesQueryDto) {
    const search = q.search?.trim();
    const where = {
      ...(search
        ? {
            SubscriberCVDetails: {
              fullName: { contains: search, mode: 'insensitive' as const },
            },
          }
        : {}),
      ...(q.status
        ? {
            SubscriberJobStatusLatest: {
              jobMapStatus: { descr: { equals: q.status, mode: 'insensitive' as const } },
            },
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.db.subscriberRegistration.findMany({
        where,
        skip: (q.page - 1) * q.pageSize,
        take: q.pageSize,
        orderBy: { subscriberID: 'desc' },
        include: {
          SubscriberCVDetails: {
            include: {
              city: { select: { descr: true } },
              subFunction: { select: { descr: true } },
            },
          },
          SubscriberJobStatusLatest: {
            include: { jobMapStatus: { select: { descr: true } } },
          },
        },
      }),
      this.db.subscriberRegistration.count({ where }),
    ]);

    return {
      rows: rows.map((s) => {
        const cv = s.SubscriberCVDetails;
        return {
          subscriberId: Number(s.subscriberID),
          fullName: cv?.fullName?.trim() || s.registrationMobileNo,
          designation: cv?.subFunction?.descr ?? '',
          city: cv?.city?.descr ?? '',
          experience: cv?.totalExp != null ? `${cv.totalExp} yrs` : '',
          jobStatus: s.SubscriberJobStatusLatest?.jobMapStatus?.descr ?? 'Registered',
          appliedOn: s.registrationDateTime?.toISOString().slice(0, 10) ?? '',
        };
      }),
      total,
    };
  }

  /** A single candidate's CV, reusing the candidate-side reader, plus its registration status. */
  async candidateDetail(subscriberId: number) {
    const [profile, registration] = await Promise.all([
      this.candidates.profile(subscriberId),
      this.db.subscriberRegistration.findUnique({
        where: { subscriberID: subscriberId },
        select: { flgstatus: true },
      }),
    ]);
    return {
      ...profile,
      registrationStatus: registrationStatusLabel(registration?.flgstatus ?? 0),
    };
  }

  /**
   * Port of spQC1GetDashboardData. The proc reports, per registration, what is still
   * MISSING (CV / education / employment) — it is a completeness dashboard, not a
   * pending/approved/rejected funnel. The mock invented the latter; these are the real
   * counts.
   */
  async qc1Stats() {
    const [total, withCv, withEducation, withEmployment] = await Promise.all([
      this.db.subscriberRegistration.count({ where: { flgstatus: 0 } }),
      this.db.subscriberRegistration.count({ where: { flgstatus: 0, flgCVUploaded: 1 } }),
      this.db.subscriberRegistration.count({
        where: { flgstatus: 0, SubscriberEducation: { some: {} } },
      }),
      this.db.subscriberRegistration.count({
        where: { flgstatus: 0, SubscriberEmployer: { some: {} } },
      }),
    ]);
    return {
      total,
      cvMissing: total - withCv,
      educationMissing: total - withEducation,
      employmentMissing: total - withEmployment,
    };
  }

  /** Interviews scheduled against job applications (tblJobInterviewStatus). */
  async interviews() {
    const rows = await this.db.jobInterviewStatus.findMany({
      orderBy: { interviewScheduledOn: 'desc' },
      include: {
        interviewMode: { select: { descr: true } },
        jobSubscriberMap: {
          include: {
            job: {
              include: {
                designation: { select: { descr: true } },
                client: { select: { clientName: true } },
              },
            },
            subscriber: { include: { SubscriberCVDetails: { select: { fullName: true } } } },
          },
        },
      },
    });

    return rows.map((i) => {
      const jobMapStatusId = i.jobSubscriberMap?.jobMapStatusID;
      const status =
        jobMapStatusId === JobMapStatus.INTERVIEW_ATTENDED
          ? 'Completed'
          : jobMapStatusId === JobMapStatus.INTERVIEW_NOT_ATTENDED
            ? 'Cancelled'
            : 'Scheduled';
      return {
        interviewId: Number(i.interviewStatusID),
        interviewStatusId: Number(i.interviewStatusID),
        jobSubscriberMapId: i.jobSubscriberMapID != null ? Number(i.jobSubscriberMapID) : null,
        candidate: i.jobSubscriberMap?.subscriber?.SubscriberCVDetails?.fullName ?? '',
        designation: i.jobSubscriberMap?.job?.designation?.descr ?? '',
        company: i.jobSubscriberMap?.job?.client?.clientName ?? '',
        mode: i.interviewMode?.descr ?? '',
        scheduledAt: i.interviewTime?.toISOString() ?? i.interviewScheduledOn?.toISOString() ?? '',
        location: i.interviewLocation ?? '',
        status,
      };
    });
  }

  /** Interview mode master list (tblMstrInterviewMode), for the schedule-interview form. */
  async interviewModes() {
    const rows = await this.db.mstrInterviewMode.findMany({ orderBy: { interviewModeID: 'asc' } });
    return rows.map((m) => ({ id: m.interviewModeID, label: m.descr ?? '' }));
  }

  /** Applications that are Mapped and have no interview yet — the schedule-interview candidate picker. */
  async eligibleForInterview() {
    const rows = await this.db.jobSubscriberMapping.findMany({
      where: { jobMapStatusID: JobMapStatus.MAPPED, JobInterviewStatus: { none: {} } },
      include: {
        job: { include: { designation: { select: { descr: true } }, client: { select: { clientName: true } } } },
        subscriber: { include: { SubscriberCVDetails: { select: { fullName: true } } } },
      },
    });
    return rows.map((r) => ({
      jobSubscriberMapId: Number(r.jobSubscriberMapID),
      candidate: r.subscriber?.SubscriberCVDetails?.fullName ?? '',
      designation: r.job?.designation?.descr ?? '',
      company: r.job?.client?.clientName ?? '',
    }));
  }

  /** Schedule an interview (schedule-Interview.aspx / Interview-scheduling.aspx). */
  async scheduleInterview(userId: number, dto: ScheduleInterviewDto) {
    const now = new Date();
    const interview = await this.db.jobInterviewStatus.create({
      data: {
        jobSubscriberMapID: dto.jobSubscriberMapId,
        interviewModeID: dto.interviewModeId,
        interviewTime: new Date(dto.interviewTime),
        interviewScheduledOn: now,
        interviewLocation: dto.location ?? null,
        timestampIns: now,
        loginIDIns: userId,
      },
    });
    await this.applications.transitionStatus(
      dto.jobSubscriberMapId,
      JobMapStatus.INTERVIEW_SCHEDULED,
      userId,
      SubscriberStatus.INTERVIEW_SCHEDULED,
    );
    await this.audit.record({
      userId,
      action: 'interview.scheduled',
      entity: 'JobInterviewStatus',
      entityId: Number(interview.interviewStatusID),
    });
    return { interviewStatusId: Number(interview.interviewStatusID) };
  }

  /** Mark an interview Completed or Cancelled (Interview-status.aspx). */
  async updateInterviewStatus(userId: number, interviewStatusId: number, dto: UpdateInterviewStatusDto) {
    const interview = await this.db.jobInterviewStatus.findUnique({
      where: { interviewStatusID: interviewStatusId },
      select: { jobSubscriberMapID: true },
    });
    if (!interview?.jobSubscriberMapID) throw new NotFoundException('Interview not found');

    const jobSubscriberMapId = Number(interview.jobSubscriberMapID);
    if (dto.status === 'Completed') {
      // No tblMstrStatus row cleanly represents "interview completed" — the comment carries it.
      await this.applications.transitionStatus(
        jobSubscriberMapId,
        JobMapStatus.INTERVIEW_ATTENDED,
        userId,
        undefined,
        dto.comments ?? 'Interview marked completed',
      );
    } else {
      await this.applications.transitionStatus(
        jobSubscriberMapId,
        JobMapStatus.INTERVIEW_NOT_ATTENDED,
        userId,
        SubscriberStatus.NOT_ATTENDED,
        dto.comments,
      );
    }
    await this.audit.record({
      userId,
      action: 'interview.status',
      entity: 'JobInterviewStatus',
      entityId: interviewStatusId,
      detail: { status: dto.status },
    });
    return { ok: true };
  }

  /** Documents awaiting QC review (spQC2GetMappedDocuments). */
  async documentReviews() {
    const rows = await this.db.candidateDocumentUploaded.findMany({
      orderBy: { docUploadID: 'desc' },
      include: {
        documentType: { select: { documentType: true } },
      },
    });

    const cvNames = new Map(
      (
        await this.db.subscriberCVDetails.findMany({
          select: { subscriberID: true, fullName: true },
        })
      ).map((c) => [Number(c.subscriberID), c.fullName ?? '']),
    );

    return rows.map((d) => ({
      documentId: Number(d.docUploadID),
      candidate: cvNames.get(Number(d.subscriberID)) ?? '',
      document: d.documentType?.documentType ?? '',
      status: d.flgStatus === 1 ? 'Verified' : d.flgStatus === 2 ? 'Rejected' : 'Pending',
    }));
  }

  /** Port of spClientUpdateMapDocumentStatus. */
  async reviewDocument(userId: number, dto: ReviewDocumentDto) {
    const doc = await this.db.candidateDocumentUploaded.findUnique({
      where: { docUploadID: dto.documentId },
    });
    if (!doc) throw new NotFoundException('Document not found');

    await this.db.candidateDocumentUploaded.update({
      where: { docUploadID: dto.documentId },
      data: {
        flgStatus: dto.status === 'Verified' ? 1 : 2,
        timestampUpd: new Date(),
        loginIDUpd: userId,
      },
    });
    return { ok: true };
  }

  /**
   * Registration approval gate (candidate-details.aspx's Approve/Reject — spQC1ApproveRejectCandidate).
   * The legacy proc also writes a JobMapStatusID onto the candidate's latest job mapping, which
   * is wrong here: a fresh registration may have no job mapping yet. This only flips flgstatus
   * (already the field qc1Stats() treats as the pending funnel) and logs the journey event.
   */
  async decideCandidate(userId: number, subscriberId: number, decision: 'Approved' | 'Rejected') {
    const registration = await this.db.subscriberRegistration.findUnique({
      where: { subscriberID: subscriberId },
      select: { subscriberID: true },
    });
    if (!registration) throw new NotFoundException('Candidate not found');

    await this.db.subscriberRegistration.update({
      where: { subscriberID: subscriberId },
      data: { flgstatus: decision === 'Approved' ? 1 : 2 },
    });
    await this.db.subscriberStatusHistory.create({
      data: {
        subscriberID: subscriberId,
        statusID:
          decision === 'Approved' ? SubscriberStatus.CV_APPROVED : SubscriberStatus.CANDIDATE_NOT_INTERESTED,
        userID: userId,
        timestampIns: new Date(),
        loginIDIns: userId,
      },
    });
    await this.audit.record({
      userId,
      action: 'candidate.decision',
      entity: 'SubscriberRegistration',
      entityId: subscriberId,
      detail: { decision },
    });
    return { ok: true };
  }

  /** Staff "assign candidate to job" (assign-job.aspx) — same write path as self-apply. */
  assignToJob(userId: number, subscriberId: number, jobId: number) {
    return this.applications.apply(subscriberId, jobId, userId);
  }

  /** Candidate-uploadable document types (tblMstrDocuments), for the assign-documents checklist. */
  async documentTypes() {
    const rows = await this.db.mstrDocuments.findMany({
      where: { flgCandidateUpload: 1 },
      orderBy: { documentName: 'asc' },
    });
    return rows.map((d) => ({ documentTypeId: d.documentID, name: d.documentName ?? '' }));
  }

  /**
   * QC assigns which documents a candidate must submit (mark-documents.aspx). Nothing else
   * in this app creates tblCandidateDocumentMap rows — a fresh candidate's document
   * checklist is empty until this runs at least once.
   */
  async assignDocuments(userId: number, subscriberId: number, documentTypeIds: number[]) {
    const existing = await this.db.candidateDocumentMap.findMany({
      where: { subscriberID: subscriberId },
      select: { documentTypeID: true },
    });
    const already = new Set(existing.map((e) => e.documentTypeID));
    const toCreate = documentTypeIds.filter((id) => !already.has(id));

    if (toCreate.length) {
      const now = new Date();
      await this.db.candidateDocumentMap.createMany({
        data: toCreate.map((documentTypeID) => ({
          subscriberID: subscriberId,
          documentTypeID,
          flgStatus: 0,
          timestampIns: now,
          loginIDIns: userId,
        })),
      });
    }

    await this.audit.record({
      userId,
      action: 'candidate.documents_assigned',
      entity: 'SubscriberRegistration',
      entityId: subscriberId,
      detail: { documentTypeIds },
    });
    return { ok: true };
  }

  /** Thin active-job list to populate the assign-job picker. */
  async activeJobs() {
    const rows = await this.db.clientJobs.findMany({
      where: { statusID: 1 },
      orderBy: { timestampIns: 'desc' },
      include: {
        designation: { select: { descr: true } },
        client: { select: { clientName: true } },
      },
    });
    return rows.map((j) => ({
      jobId: Number(j.jobID),
      designation: j.designation?.descr ?? '',
      company: j.client?.clientName ?? '',
    }));
  }
}
