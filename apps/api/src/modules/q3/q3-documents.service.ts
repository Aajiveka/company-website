import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { OfferLetterService } from '@/modules/recruitment/offer-letter.service';
import { StorageService } from '@/modules/storage/storage.service';
import { staffDirectory } from '@/modules/recruitment/staff-directory';
import { JobMapStatus } from '@/shared/status';
import { DOCS_DUE_DAYS, Q3ActivityKind, istDateAfter, startOfDay } from '@/shared/hiring';
import { Q3ReadService, candidateOf, jobOf, latestRound, roundView, stageFor } from './q3-read.service';
import { mailDate } from './q3-mail';
import type { DocumentRequestDto, OfferDto } from './dto/q3.dto';

/** tblCandidateDocumentStatus.StatusID values this service writes, matching flgStatus. */
const DOC_STATUS = { VERIFIED: 1, SENT_BACK: 2 } as const;

/** Inline preview types; anything else is offered as a download only. */
const PREVIEW_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

/**
 * Q3's Documents & Offer screen (Figma "Q3" 06): verify what the selected candidate uploads,
 * send back what needs fixing, forward the set to the company, then the offer and joining.
 *
 * Documents live where they always have — tblCandidateDocumentMap (what was asked for) and
 * tblCandidateDocumentUploaded (what arrived) — so the candidate portal's upload screen and the
 * employer API keep working on the same rows.
 */
@Injectable()
export class Q3DocumentsService {
  private readonly logger = new Logger(Q3DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly applications: JobApplicationsService,
    private readonly offers: OfferLetterService,
    private readonly storage: StorageService,
    private readonly read: Q3ReadService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  private async appOrThrow(mapId: number) {
    const a = await this.read.loadApp(mapId);
    if (!a) throw new NotFoundException('Application not found');
    return a;
  }

  private mail(to: string | null | undefined, subject: string, data: Parameters<EmailService['sendQ3Notice']>[2]) {
    if (!to) return false;
    this.email.sendQ3Notice(to, subject, data).catch((err: Error) => this.logger.warn(`Mail to ${to} failed: ${err.message}`));
    return true;
  }

  private log(mapId: number | bigint, kind: string, note: string, userId: number, channel: string | null = null) {
    return this.db.q3Activity.create({
      data: { jobSubscriberMapID: BigInt(mapId), kind, channel, note: note.slice(0, 2000), createdBy: BigInt(userId) },
    });
  }

  /** The upload, and the one application in Q3's world it belongs to. */
  private async uploadOrThrow(docUploadId: number) {
    const up = await this.db.candidateDocumentUploaded.findUnique({
      where: { docUploadID: BigInt(docUploadId) },
      include: { documentMap: { select: { jobSubscriberMapID: true, documentTypeID: true } } },
    });
    if (!up) throw new NotFoundException('Document not found');
    // Only candidates Q3 has seen (a referred application — the same world loadApps reads).
    // Unscoped, the verify / send-back / file routes reached every candidate's Aadhaar, PAN
    // and bank documents by walking the ids.
    const inQ3World = up.subscriberID != null && (await this.db.jobSubscriberMapping.count({
      where: { subscriberID: up.subscriberID, CvReferral: { some: {} } },
    })) > 0;
    if (!inQ3World) throw new NotFoundException('Document not found');
    return up;
  }

  /** Which application a document belongs to: the one it was asked for, else the candidate's selected one. */
  private async mapIdForUpload(up: Awaited<ReturnType<Q3DocumentsService['uploadOrThrow']>>) {
    if (up.documentMap?.jobSubscriberMapID != null) return Number(up.documentMap.jobSubscriberMapID);
    const hiring = await this.db.applicationHiring.findFirst({
      where: { selectedAt: { not: null }, mapping: { subscriberID: up.subscriberID } },
      orderBy: { selectedAt: 'desc' },
      select: { jobSubscriberMapID: true },
    });
    return hiring ? Number(hiring.jobSubscriberMapID) : null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 06 · Documents & Offer
  // ──────────────────────────────────────────────────────────────────────────

  async documents(mapId: number) {
    const a = await this.appOrThrow(mapId);
    const c = candidateOf(a);
    const j = jobOf(a);
    const hiring = a.ApplicationHiring;
    const docs = (await this.read.documentsFor([a])).get(mapId) ?? [];
    const counts = Q3ReadService.docCounts(docs);

    // "Verified by Priya Nair · 30 Sep, 10:05 AM" and the needs-correction note come from the
    // latest status row per upload.
    const uploadIds = docs.map((d) => d.docUploadId).filter((x): x is number => x != null);
    const history = uploadIds.length
      ? await this.db.candidateDocumentStatus.findMany({
          where: { docUploadID: { in: uploadIds.map((id) => BigInt(id)) } },
          orderBy: { docStatusID: 'desc' },
        })
      : [];
    const latestOf = new Map<number, (typeof history)[number]>();
    for (const h of history) if (!latestOf.has(Number(h.docUploadID))) latestOf.set(Number(h.docUploadID), h);
    const staff = await staffDirectory(this.db, history.map((h) => h.userID));

    const offer = a.OfferLetter;
    const offerDetails = offer?.offerDetails ? (JSON.parse(offer.offerDetails) as Record<string, unknown>) : null;
    const r = latestRound(a);

    // Uploaded → Q3 verify → Forwarded → Company approval → Offer letter → Accepted → Joining.
    const step = hiring?.joinedAt
      ? 8
      : offer?.status === 'Accepted'
        ? 7
        : offer
          ? 6
          : hiring?.docsApprovedAt
            ? 5
            : hiring?.docsForwardedAt
              ? 4
              : // Verification starts with the first upload; it need not wait for the last one.
                counts.total > counts.missing
                ? 2
                : 1;

    return {
      mapId,
      stage: stageFor(a),
      candidate: c,
      company: j.company,
      jobTitle: j.title,
      roundLabel: r ? roundView(r).label : null,
      selectedAt: hiring?.selectedAt?.toISOString() ?? null,
      docsRequestedAt: hiring?.docsRequestedAt?.toISOString() ?? null,
      docsDueAt: hiring?.docsDueAt?.toISOString().slice(0, 10) ?? null,
      docsForwardedAt: hiring?.docsForwardedAt?.toISOString() ?? null,
      docsApprovedAt: hiring?.docsApprovedAt?.toISOString() ?? null,
      joinedAt: hiring?.joinedAt?.toISOString() ?? null,
      step,
      counts: { total: counts.total, verified: counts.verified },
      documents: docs.map((d) => {
        const h = d.docUploadId != null ? latestOf.get(d.docUploadId) : undefined;
        return {
          documentTypeId: d.documentTypeId,
          name: d.name,
          state: d.state,
          docUploadId: d.docUploadId,
          fileName: d.fileName,
          sizeBytes: d.sizeBytes,
          uploadedAt: d.uploadedAt,
          comment: d.state === 'NeedsCorrection' ? (h?.comments ?? null) : null,
          verifiedBy: d.state === 'Verified' && h?.statusID === DOC_STATUS.VERIFIED && h.userID != null ? (staff.get(Number(h.userID))?.name ?? null) : null,
          verifiedAt: d.state === 'Verified' && h?.statusID === DOC_STATUS.VERIFIED ? (h.timestampIns?.toISOString() ?? null) : null,
          canPreview: !!d.fileName && !!PREVIEW_TYPES[extOf(d.fileName)],
        };
      }),
      offer: offer
        ? {
            offerId: Number(offer.id),
            status: offer.status,
            generatedAt: offer.generatedAt.toISOString(),
            sentAt: offer.sentAt?.toISOString() ?? null,
            respondedAt: offer.candidateResponseAt?.toISOString() ?? null,
            joiningDate: offer.joiningDate?.toISOString().slice(0, 10) ?? null,
            designation: typeof offerDetails?.designation === 'string' ? offerDetails.designation : j.title,
            ctc: typeof offerDetails?.ctc === 'string' ? offerDetails.ctc : null,
          }
        : null,
    };
  }

  /** "Verify". */
  async verify(docUploadId: number, userId: number) {
    const up = await this.uploadOrThrow(docUploadId);
    if (!up.documentPath) throw new BadRequestException('Nothing has been uploaded yet');
    if (up.flgStatus === DOC_STATUS.VERIFIED) throw new ConflictException('This document is already verified');
    const mapId = await this.mapIdForUpload(up);
    const now = new Date();
    await this.db.$transaction([
      this.db.candidateDocumentUploaded.update({
        where: { docUploadID: up.docUploadID },
        data: { flgStatus: DOC_STATUS.VERIFIED, timestampUpd: now, loginIDUpd: userId },
      }),
      this.db.candidateDocumentStatus.create({
        data: { docUploadID: up.docUploadID, statusID: DOC_STATUS.VERIFIED, userID: BigInt(userId), timestampIns: now, loginIDIns: userId },
      }),
    ]);

    let verified = 0;
    let total = 0;
    let name = 'Document';
    if (mapId != null) {
      const a = await this.read.loadApp(mapId);
      if (a) {
        const docs = (await this.read.documentsFor([a])).get(mapId) ?? [];
        verified = docs.filter((d) => d.state === 'Verified').length;
        total = docs.length;
        name = docs.find((d) => d.docUploadId === docUploadId)?.name ?? name;
        await this.log(mapId, Q3ActivityKind.DOC_VERIFIED, `${name} verified`, userId);
      }
    }
    return { verified, total, name };
  }

  /** The ✕ beside Verify — the candidate has to re-upload. */
  async sendBack(docUploadId: number, comment: string, userId: number) {
    const up = await this.uploadOrThrow(docUploadId);
    if (!up.documentPath) throw new BadRequestException('Nothing has been uploaded yet');
    const mapId = await this.mapIdForUpload(up);
    const now = new Date();
    await this.db.$transaction([
      this.db.candidateDocumentUploaded.update({
        where: { docUploadID: up.docUploadID },
        data: { flgStatus: DOC_STATUS.SENT_BACK, timestampUpd: now, loginIDUpd: userId },
      }),
      this.db.candidateDocumentStatus.create({
        data: {
          docUploadID: up.docUploadID,
          statusID: DOC_STATUS.SENT_BACK,
          comments: comment.trim(),
          userID: BigInt(userId),
          timestampIns: now,
          loginIDIns: userId,
        },
      }),
    ]);

    let name = 'Document';
    if (mapId != null) {
      const a = await this.read.loadApp(mapId);
      if (a) {
        name = (await this.read.documentsFor([a])).get(mapId)?.find((d) => d.docUploadId === docUploadId)?.name ?? name;
        // A document that changed after the set went to the company means the company has
        // not approved what it will end up with — the hand-off starts again.
        if (a.ApplicationHiring?.docsForwardedAt && !a.ApplicationHiring.docsApprovedAt) {
          await this.db.applicationHiring.update({ where: { jobSubscriberMapID: BigInt(mapId) }, data: { docsForwardedAt: null, timestampUpd: now } });
        }
        const c = candidateOf(a);
        this.mail(c.email, `Please re-upload your ${name}`, {
          previewText: `Your ${name} needs a fresh upload`,
          greetingName: c.name,
          paragraphs: [
            `We could not accept the ${name} you uploaded: ${comment.trim()}.`,
            'Please upload a corrected copy from the Documents section of your Aajiveka dashboard.',
          ],
        });
        await this.log(mapId, Q3ActivityKind.DOC_SENT_BACK, `${name} sent back: ${comment.trim()}`, userId, 'Mail');
      }
    }
    return { sentBack: true, name };
  }

  /** "Send request to candidate" — and each row's Re-request. */
  async request(mapId: number, dto: DocumentRequestDto, userId: number) {
    const a = await this.appOrThrow(mapId);
    if (a.subscriberID == null) throw new NotFoundException('Candidate not found');
    if (!dto.email && !dto.whatsapp) throw new BadRequestException('Pick Email, WhatsApp or both');
    const master = await this.db.mstrDocuments.findMany({
      where: { documentID: { in: dto.documentTypeIds }, flgCandidateUpload: 1 },
      select: { documentID: true, documentName: true },
    });
    if (master.length !== new Set(dto.documentTypeIds).size) throw new BadRequestException('Unknown document type');

    const c = candidateOf(a);
    // Refuse before writing anything: the request used to be recorded and stamped first.
    if (dto.email && !c.email) throw new BadRequestException(`${c.name} has no email address on file`);

    const now = new Date();
    const existing = await this.db.candidateDocumentMap.findMany({
      where: { subscriberID: a.subscriberID, documentTypeID: { in: dto.documentTypeIds } },
      select: { documentMapID: true, documentTypeID: true },
    });
    const have = new Set(existing.map((e) => e.documentTypeID));
    const toCreate = dto.documentTypeIds.filter((id) => !have.has(id));
    await this.db.$transaction([
      // Re-requesting stamps the row, which is the "Re-requested today" the pipeline shows.
      this.db.candidateDocumentMap.updateMany({
        where: { documentMapID: { in: existing.map((e) => e.documentMapID) } },
        data: { timestampUpd: now, loginIDUpd: userId },
      }),
      this.db.candidateDocumentMap.createMany({
        data: toCreate.map((documentTypeID) => ({
          subscriberID: a.subscriberID,
          jobSubscriberMapID: a.jobSubscriberMapID,
          documentTypeID,
          flgStatus: 0,
          timestampIns: now,
          loginIDIns: userId,
        })),
      }),
    ]);
    const hiring = await this.db.applicationHiring.upsert({
      where: { jobSubscriberMapID: a.jobSubscriberMapID },
      create: { jobSubscriberMapID: a.jobSubscriberMapID, docsRequestedAt: now, docsDueAt: istDateAfter(now, DOCS_DUE_DAYS) },
      // A re-request is a fresh deadline; keeping the old one mailed a date already past.
      update: { docsDueAt: istDateAfter(now, DOCS_DUE_DAYS), timestampUpd: now },
    });

    const names = master.map((m) => m.documentName ?? 'Document');
    let mailed = false;
    if (dto.email) {
      mailed = this.mail(c.email, 'Documents needed for your offer', {
        previewText: `Please upload: ${names.join(', ')}`,
        greetingName: c.name,
        paragraphs: [dto.message.trim(), `Requested: ${names.join(', ')}.`],
        details: hiring.docsDueAt ? [['Upload by', mailDate(hiring.docsDueAt)]] : undefined,
      });
      if (!mailed) throw new BadRequestException(`${c.name} has no email address on file`);
    }
    // There is no WhatsApp provider in this deployment (Q1's contact log records the channel
    // the same way). The request is logged against WhatsApp so the coordinator who sends it
    // from their phone has it on record.
    const channels = [dto.email ? 'Email' : null, dto.whatsapp ? 'WhatsApp' : null].filter(Boolean).join(' + ');
    await this.log(mapId, Q3ActivityKind.DOC_REQUEST, `Requested ${names.join(', ')} via ${channels}`, userId, dto.email ? 'Mail' : 'WhatsApp');
    return { requested: names.length, channels, dueAt: hiring.docsDueAt?.toISOString().slice(0, 10) ?? null };
  }

  /** "Forward to company" — every requested document verified. */
  async forward(mapId: number, userId: number) {
    const a = await this.appOrThrow(mapId);
    const docs = (await this.read.documentsFor([a])).get(mapId) ?? [];
    if (!docs.length) throw new BadRequestException('No documents have been requested yet');
    const pending = docs.filter((d) => d.state !== 'Verified');
    if (pending.length) throw new BadRequestException(`${pending.length} document${pending.length === 1 ? '' : 's'} still to verify`);
    if (a.ApplicationHiring?.docsForwardedAt) throw new ConflictException('These documents are already with the company');

    const now = new Date();
    await this.db.applicationHiring.upsert({
      where: { jobSubscriberMapID: a.jobSubscriberMapID },
      create: { jobSubscriberMapID: a.jobSubscriberMapID, docsForwardedAt: now },
      update: { docsForwardedAt: now, docsApprovedAt: null, timestampUpd: now },
    });
    const c = candidateOf(a);
    const j = jobOf(a);
    const r = latestRound(a);
    const to = r?.hrEmail || j.companyEmail;
    this.mail(to, `Verified documents: ${c.name} — ${j.title}`, {
      previewText: `${docs.length} verified documents for ${c.name}`,
      greetingName: r?.hrName,
      paragraphs: [
        `${c.name}'s documents for ${j.title} have been verified by Aajiveka and are ready for your approval.`,
        docs.map((d) => `• ${d.name}`).join('\n'),
        'They are available under the applicant in your employer portal. Reply to this mail with your approval, or tell us what needs correcting.',
      ],
    });
    await this.log(mapId, Q3ActivityKind.DOCS_FORWARDED, `${docs.length} verified documents forwarded to ${j.company}`, userId, 'Mail');
    return { forwarded: docs.length, company: j.company };
  }

  /**
   * The company approved the forwarded documents. Q3 records it the way it records every
   * other company decision (Record company decision); the employer API sets the same field
   * when the company approves from the portal.
   */
  async approve(mapId: number, userId: number) {
    const a = await this.appOrThrow(mapId);
    if (!a.ApplicationHiring?.docsForwardedAt) throw new ConflictException('Forward the documents to the company first');
    if (a.ApplicationHiring.docsApprovedAt) throw new ConflictException('The company has already approved these documents');
    const now = new Date();
    await this.db.applicationHiring.update({
      where: { jobSubscriberMapID: a.jobSubscriberMapID },
      data: { docsApprovedAt: now, timestampUpd: now },
    });
    await this.audit.record({ userId, action: 'q3.docs_approved', entity: 'ApplicationHiring', entityId: mapId });
    return { approved: true };
  }

  /** The document behind "View" and "Download". */
  async file(docUploadId: number) {
    const up = await this.uploadOrThrow(docUploadId);
    const key = up.documentPath?.trim();
    if (!key) throw new NotFoundException('Nothing has been uploaded yet');
    const ext = extOf(up.fileName || key);
    const master = up.documentTypeID != null
      ? await this.db.mstrDocuments.findUnique({ where: { documentID: up.documentTypeID }, select: { documentName: true } })
      : null;
    return {
      body: await this.storage.read(key),
      fileName: up.fileName || `${master?.documentName ?? 'document'}${ext}`,
      previewType: PREVIEW_TYPES[ext] ?? null,
    };
  }

  /** "Generate offer letter" — creates the offer and sends it to the candidate. */
  async generateOffer(mapId: number, dto: OfferDto, userId: number) {
    const a = await this.appOrThrow(mapId);
    if (!a.ApplicationHiring?.docsApprovedAt) {
      throw new ConflictException('The offer unlocks after the company approves the documents');
    }
    if (a.OfferLetter) throw new ConflictException('An offer letter already exists for this candidate');
    const joining = new Date(`${dto.joiningDate}T00:00:00Z`);
    if (Number.isNaN(joining.getTime()) || joining < startOfDay(new Date())) {
      throw new BadRequestException('Pick a joining date from today onwards');
    }
    const { offerId } = await this.offers.createOffer({
      jobSubscriberMapId: mapId,
      offerDetails: {
        designation: dto.designation.trim(),
        ctc: dto.ctc.trim(),
        location: dto.location?.trim() || null,
        company: jobOf(a).company,
      },
      joiningDate: dto.joiningDate,
      userId,
    });
    await this.offers.sendOffer(offerId, userId);
    return { offerId };
  }

  /** "Joining process" — the candidate joined. Ends Q3's work on the application. */
  async joined(mapId: number, userId: number) {
    const a = await this.appOrThrow(mapId);
    if (a.OfferLetter?.status !== 'Accepted') throw new ConflictException('The candidate has not accepted the offer yet');
    if (a.ApplicationHiring?.joinedAt) throw new ConflictException('Already marked as joined');
    const now = new Date();
    await this.db.applicationHiring.update({
      where: { jobSubscriberMapID: a.jobSubscriberMapID },
      data: { joinedAt: now, timestampUpd: now },
    });
    await this.applications.transitionStatus(mapId, JobMapStatus.JOINED, userId);
    await this.audit.record({ userId, action: 'q3.joined', entity: 'ApplicationHiring', entityId: mapId });
    return { joined: true };
  }
}

function extOf(name: string) {
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}

