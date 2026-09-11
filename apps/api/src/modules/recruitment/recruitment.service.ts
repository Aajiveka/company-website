import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import { StorageService } from '@/modules/storage/storage.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { JobMapStatus, SubscriberStatus } from '@/shared/status';
import type {
  CandidateDecision,
  CandidatesQueryDto,
  ReviewDocumentDto,
  ScheduleInterviewDto,
  UpdateInterviewStatusDto,
  UpdatePipelineDto,
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
    private readonly email: EmailService,
    private readonly storage: StorageService,
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

  /**
   * A single candidate's CV, reusing the candidate-side reader, plus its registration status.
   *
   * The mapping id and any stored score ride along because the QC screen needs both to
   * survive a reload. Scoring used to be reachable only in the same page session that
   * assigned the job — the id lived in React state and nothing hydrated it — so a candidate
   * mapped yesterday could never be scored. And `tblCandidateJobScore` was written by the
   * scorer and read by nothing, so a score that had been computed was invisible the moment
   * the modal closed.
   */
  async candidateDetail(subscriberId: number) {
    const [profile, registration, mapping] = await Promise.all([
      this.candidates.profile(subscriberId),
      this.db.subscriberRegistration.findUnique({
        where: { subscriberID: subscriberId },
        select: { flgstatus: true },
      }),
      // The newest mapping: that is the application a QC user is judging on this screen.
      this.db.jobSubscriberMapping.findFirst({
        where: { subscriberID: BigInt(subscriberId) },
        orderBy: { jobSubscriberMapID: 'desc' },
        select: { jobSubscriberMapID: true, CandidateJobScore: true },
      }),
    ]);

    const s = mapping?.CandidateJobScore;
    return {
      ...profile,
      registrationStatus: registrationStatusLabel(registration?.flgstatus ?? 0),
      latestJobSubscriberMapId: mapping ? Number(mapping.jobSubscriberMapID) : null,
      score: s
        ? {
            totalScore: s.totalScore,
            skillScore: s.skillScore,
            experienceScore: s.experienceScore,
            jobRoleScore: s.jobRoleScore,
            educationScore: s.educationScore,
            locationScore: s.locationScore,
            salaryScore: s.salaryScore,
            noticePeriodScore: s.noticePeriodScore,
          }
        : null,
    };
  }

  /** The candidate's own resume, for the QC reviewer — see the controller note on why. */
  candidateResume(subscriberId: number) {
    return this.candidates.resumeFile(subscriberId);
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

    // Send interview notification email to the candidate (fire-and-forget).
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: dto.jobSubscriberMapId },
      include: {
        subscriber: { include: { SubscriberCVDetails: { select: { fullName: true, emailID: true } } } },
        job: {
          include: {
            designation: { select: { descr: true } },
            client: { select: { clientName: true } },
          },
        },
      },
    });
    const candidateEmail = mapping?.subscriber?.SubscriberCVDetails?.emailID;
    if (candidateEmail) {
      const interviewTime = new Date(dto.interviewTime);
      this.email.sendInterviewScheduled(candidateEmail, {
        fullName: mapping.subscriber?.SubscriberCVDetails?.fullName ?? undefined,
        jobTitle: mapping.job?.designation?.descr ?? '',
        companyName: mapping.job?.client?.clientName ?? '',
        date: interviewTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: interviewTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
        location: dto.location ?? 'To be announced',
      }).catch(() => { /* email failure must not block scheduling */ });
    }

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
    // The `documentType` relation points at tblMstrDocumentType, while the IDs actually
    // stored here come from tblMstrDocuments — that is what `documentTypes()` serves to the
    // assign checklist and what storage.service resolves folders from. The two masters are
    // seeded identically (same ids, same names, db/seed/tblMstrDocument*.psv), so the join
    // lands on the right label today. It is a coupling, not a coincidence to rely on: adding
    // a row to one master without the other will silently blank this column.
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

  /**
   * The uploaded file behind a document review row.
   *
   * The review screen offered Verify and Reject against a candidate name and a document-type
   * label, with no way to look at the document itself — the reviewer was asked to judge
   * something they could not see. `DocumentPath` was on the row the whole time.
   */
  async documentFile(documentId: number) {
    const doc = await this.db.candidateDocumentUploaded.findUnique({
      where: { docUploadID: documentId },
      include: { documentType: { select: { documentType: true } } },
    });
    const key = doc?.documentPath?.trim();
    if (!doc || !key) throw new NotFoundException('Document not found');
    return {
      body: await this.storage.read(key),
      fileName: `${doc.documentType?.documentType ?? 'document'}${key.slice(key.lastIndexOf('.'))}`,
    };
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
   *
   * Extended for Figma flow: besides Approved/Rejected, Q1 can now set OnHold, NeedMoreInfo,
   * Duplicate, and Withdrawn statuses. The legacy flgstatus is: 0=Pending, 1=Approved, 2=Rejected.
   * New hold-like statuses keep flgstatus at 0 (pending) since they are not final decisions.
   */
  async decideCandidate(userId: number, subscriberId: number, decision: CandidateDecision, reason?: string) {
    const registration = await this.db.subscriberRegistration.findUnique({
      where: { subscriberID: subscriberId },
      select: { subscriberID: true },
    });
    if (!registration) throw new NotFoundException('Candidate not found');

    // Map decision to flgstatus: Approved=1, Rejected/Withdrawn=2, hold-like=0 (still pending)
    const flgstatus =
      decision === 'Approved' ? 1 : decision === 'Rejected' || decision === 'Withdrawn' ? 2 : 0;

    // Map decision to subscriber status for history
    const STATUS_MAP: Record<CandidateDecision, number> = {
      Approved: SubscriberStatus.CV_APPROVED,
      Rejected: SubscriberStatus.CANDIDATE_NOT_INTERESTED,
      OnHold: SubscriberStatus.CV_CREATED, // stays in CV stage
      NeedMoreInfo: SubscriberStatus.CV_CREATED,
      Duplicate: SubscriberStatus.CANDIDATE_NOT_INTERESTED,
      Withdrawn: SubscriberStatus.CANDIDATE_NOT_INTERESTED,
    };

    await this.db.subscriberRegistration.update({
      where: { subscriberID: subscriberId },
      data: { flgstatus },
    });
    await this.db.subscriberStatusHistory.create({
      data: {
        subscriberID: subscriberId,
        statusID: STATUS_MAP[decision],
        userID: userId,
        comments: reason ?? null,
        timestampIns: new Date(),
        loginIDIns: userId,
      },
    });
    await this.audit.record({
      userId,
      action: 'candidate.decision',
      entity: 'SubscriberRegistration',
      entityId: subscriberId,
      detail: { decision, reason },
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

  /** Update the pipeline stage (jobMapStatusID) for a job-subscriber mapping. */
  async updatePipelineStage(userId: number, jobSubscriberMapId: number, dto: UpdatePipelineDto) {
    const mapping = await this.db.jobSubscriberMapping.findUnique({
      where: { jobSubscriberMapID: jobSubscriberMapId },
    });
    if (!mapping) throw new NotFoundException('Application not found');

    await this.db.jobSubscriberMapping.update({
      where: { jobSubscriberMapID: jobSubscriberMapId },
      data: {
        jobMapStatusID: dto.stageId,
        timestampUpd: new Date(),
        loginIDUpd: userId,
      },
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
