import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CandidatesService } from '@/modules/candidates/candidates.service';
import type { CandidatesQueryDto, ReviewDocumentDto } from './dto/recruitment.dto';

/** The QC / recruitment side. */
@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
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

  /** A single candidate's CV, reusing the candidate-side reader. */
  candidateDetail(subscriberId: number) {
    return this.candidates.profile(subscriberId);
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

    return rows.map((i) => ({
      interviewId: Number(i.interviewStatusID),
      candidate: i.jobSubscriberMap?.subscriber?.SubscriberCVDetails?.fullName ?? '',
      designation: i.jobSubscriberMap?.job?.designation?.descr ?? '',
      company: i.jobSubscriberMap?.job?.client?.clientName ?? '',
      mode: i.interviewMode?.descr ?? '',
      scheduledAt: i.interviewScheduledOn?.toISOString() ?? '',
      location: i.interviewLocation ?? '',
    }));
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
}
