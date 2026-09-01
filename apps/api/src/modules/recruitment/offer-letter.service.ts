import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { JobMapStatus } from '@/shared/status';

/** Offer letter generation, sending, and candidate response tracking. */
@Injectable()
export class OfferLetterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly applications: JobApplicationsService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  /** Create a draft offer letter for a selected candidate. */
  async createOffer(input: {
    jobSubscriberMapId: number;
    offerDetails: Record<string, unknown>;
    joiningDate?: string;
    userId: number;
  }) {
    const offer = await this.db.offerLetter.create({
      data: {
        jobSubscriberMapID: BigInt(input.jobSubscriberMapId),
        offerDetails: JSON.stringify(input.offerDetails),
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : null,
        status: 'Draft',
      },
    });

    await this.audit.record({
      userId: input.userId,
      action: 'offer.created',
      entity: 'OfferLetter',
      entityId: Number(offer.id),
      detail: { jobSubscriberMapId: input.jobSubscriberMapId },
    });

    return { offerId: Number(offer.id) };
  }

  /** Send the offer to the candidate via email and update status. */
  async sendOffer(offerId: number, userId: number) {
    const offer = await this.db.offerLetter.findUnique({
      where: { id: BigInt(offerId) },
      include: {
        mapping: {
          include: {
            subscriber: { include: { SubscriberCVDetails: { select: { fullName: true, emailID: true } } } },
            job: {
              include: {
                designation: { select: { descr: true } },
                client: { select: { clientName: true } },
              },
            },
          },
        },
      },
    });
    if (!offer) throw new NotFoundException('Offer letter not found');

    await this.db.offerLetter.update({
      where: { id: BigInt(offerId) },
      data: { sentAt: new Date(), status: 'Sent' },
    });

    await this.applications.transitionStatus(
      Number(offer.jobSubscriberMapID),
      JobMapStatus.OFFER_SENT,
      userId,
    );

    // Notify candidate
    const candidateEmail = offer.mapping?.subscriber?.SubscriberCVDetails?.emailID;
    if (candidateEmail) {
      const details = offer.offerDetails ? JSON.parse(offer.offerDetails as string) : {};
      this.email.sendApplicationStatus(candidateEmail, {
        fullName: offer.mapping?.subscriber?.SubscriberCVDetails?.fullName ?? undefined,
        jobTitle: offer.mapping?.job?.designation?.descr ?? '',
        companyName: offer.mapping?.job?.client?.clientName ?? '',
        status: 'selected',
        message: `You have received an offer letter. CTC: ${details.ctc ?? 'As discussed'}. Joining Date: ${offer.joiningDate?.toLocaleDateString('en-IN') ?? 'TBD'}. Please log in to review and respond.`,
        dashboardUrl: '/candidate/tracker',
      }).catch(() => {});
    }

    await this.audit.record({
      userId,
      action: 'offer.sent',
      entity: 'OfferLetter',
      entityId: Number(offer.id),
    });

    return { ok: true };
  }

  /** Candidate accepts or rejects the offer. */
  async respondToOffer(offerId: number, accept: boolean, userId: number) {
    const offer = await this.db.offerLetter.findUnique({
      where: { id: BigInt(offerId) },
      select: { id: true, status: true, jobSubscriberMapID: true },
    });
    if (!offer) throw new NotFoundException('Offer letter not found');

    const newStatus = accept ? 'Accepted' : 'Rejected';
    await this.db.offerLetter.update({
      where: { id: BigInt(offerId) },
      data: {
        status: newStatus,
        candidateResponseAt: new Date(),
      },
    });

    if (accept) {
      await this.applications.transitionStatus(
        Number(offer.jobSubscriberMapID),
        JobMapStatus.OFFER_ACCEPTED,
        userId,
      );
    }

    await this.audit.record({
      userId,
      action: accept ? 'offer.accepted' : 'offer.rejected',
      entity: 'OfferLetter',
      entityId: Number(offer.id),
    });

    return { ok: true };
  }

  /** Get an offer letter by its application mapping. */
  async getOffer(jobSubscriberMapId: number) {
    const offer = await this.db.offerLetter.findUnique({
      where: { jobSubscriberMapID: BigInt(jobSubscriberMapId) },
    });
    if (!offer) return null;

    return {
      offerId: Number(offer.id),
      jobSubscriberMapId: Number(offer.jobSubscriberMapID),
      offerDetails: offer.offerDetails ? JSON.parse(offer.offerDetails as string) : null,
      joiningDate: offer.joiningDate?.toISOString() ?? null,
      status: offer.status,
      sentAt: offer.sentAt?.toISOString() ?? null,
      candidateResponseAt: offer.candidateResponseAt?.toISOString() ?? null,
    };
  }
}
