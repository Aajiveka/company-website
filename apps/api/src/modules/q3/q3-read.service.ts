import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { JobMapStatus } from '@/shared/status';
import {
  Q3ActivityKind,
  REVIEW_WINDOW_DAYS,
  RoundDecision,
  RoundStatus,
  addDays,
  calendarDaysBetween,
  documentState,
  interviewPill,
  modeLabel,
  parseInterviewers,
  q2ReturnState,
  reviewDay,
  reviewDaysLeft,
  roundLabel,
  stageOf,
  startOfDay,
  startOfWeek,
  type DocumentState,
  type HiringStage,
} from '@/shared/hiring';
import type { PipelineQueryDto } from './dto/q3.dto';

/**
 * Everything a Q3 screen needs to know about one application, in one query.
 *
 * Q3's world is every application that has ever been referred (it has a tblCvReferral row);
 * the stage of each is derived from the rows that record its progress — see `stageOf`.
 */
export const APP_SELECT = {
  jobSubscriberMapID: true,
  subscriberID: true,
  jobMapStatusID: true,
  subscriber: {
    select: {
      subscriberID: true,
      SubscriberCVDetails: {
        select: {
          fullName: true,
          emailID: true,
          mobileNo1: true,
          totalExp: true,
          emailVerified: true,
          subFunction: { select: { descr: true } },
          currentCity: { select: { descr: true } },
          city: { select: { descr: true } },
        },
      },
      SubscriberCVUploaded: { select: { latestCVPath: true } },
      SubscriberScreening: { select: { status: true } },
      SubscriberEmployer: {
        where: { flgCurrent: 1 },
        select: { employer: true },
        orderBy: { subscriberEmployerID: 'desc' as const },
        take: 1,
      },
    },
  },
  job: {
    select: {
      jobID: true,
      designation: { select: { descr: true } },
      client: { select: { clientID: true, clientName: true, clientAddress: true, emailID: true, city: { select: { descr: true } } } },
    },
  },
  CvReferral: { orderBy: { referredByQ2At: 'desc' as const }, take: 1 },
  InterviewRound: {
    orderBy: { roundNumber: 'asc' as const },
    include: { slots: { orderBy: { slotDateTime: 'asc' as const } } },
  },
  ApplicationHiring: true,
  OfferLetter: true,
} satisfies Prisma.JobSubscriberMappingSelect;

export type AppRow = Prisma.JobSubscriberMappingGetPayload<{ select: typeof APP_SELECT }>;
export type RoundRow = AppRow['InterviewRound'][number];

/** The candidate block every Q3 header and table row prints. */
export function candidateOf(a: AppRow) {
  const cv = a.subscriber?.SubscriberCVDetails;
  const city = cv?.currentCity?.descr ?? cv?.city?.descr ?? '';
  return {
    subscriberId: Number(a.subscriberID ?? 0),
    name: cv?.fullName?.trim() || 'Candidate',
    designation: cv?.subFunction?.descr ?? '',
    totalExp: cv?.totalExp ?? null,
    currentEmployer: a.subscriber?.SubscriberEmployer?.[0]?.employer ?? '',
    location: city ? `${city}, India` : '',
    email: cv?.emailID ?? '',
    phone: cv?.mobileNo1 ?? '',
    hasCv: !!a.subscriber?.SubscriberCVUploaded?.latestCVPath,
    /** Q1 verified the candidate on a call, or the address was proved by OTP. */
    contactVerified: a.subscriber?.SubscriberScreening?.status === 'Verified' || !!cv?.emailVerified,
  };
}

export function jobOf(a: AppRow) {
  return {
    jobId: Number(a.job?.jobID ?? 0),
    title: a.job?.designation?.descr ?? '',
    company: a.job?.client?.clientName ?? '',
    companyEmail: a.job?.client?.emailID ?? null,
    officeAddress: [a.job?.client?.clientAddress, a.job?.client?.city?.descr].filter(Boolean).join(', '),
  };
}

export const latestRound = (a: AppRow): RoundRow | null => a.InterviewRound.at(-1) ?? null;

export function stageFor(a: AppRow): HiringStage {
  const r = latestRound(a);
  return stageOf({
    referralStatus: a.CvReferral[0]?.status ?? null,
    rejected: a.jobMapStatusID === JobMapStatus.REJECTED,
    joinedAt: a.ApplicationHiring?.joinedAt ?? null,
    selectedAt: a.ApplicationHiring?.selectedAt ?? null,
    docsApprovedAt: a.ApplicationHiring?.docsApprovedAt ?? null,
    offerStatus: a.OfferLetter?.status ?? null,
    latestRound: r ? { status: r.status, decision: r.decision } : null,
  });
}

/** A round as every Q3 screen reads it. */
export function roundView(r: RoundRow, now = new Date()) {
  return {
    roundId: Number(r.id),
    roundNumber: r.roundNumber,
    isFinal: r.isFinal,
    label: roundLabel(r),
    roundName: r.roundName,
    status: r.status,
    pill: interviewPill(r, now),
    mode: modeLabel(r.interviewModeID),
    meetingLink: r.meetingLink,
    durationMins: r.durationMins,
    scheduledAt: r.scheduledAt?.toISOString() ?? null,
    conductedAt: r.conductedAt?.toISOString() ?? null,
    resultDueAt: r.resultDueAt?.toISOString() ?? null,
    decision: r.decision,
    decidedAt: r.decidedAt?.toISOString() ?? null,
    decisionMailSentAt: r.decisionMailSentAt?.toISOString() ?? null,
    companyFeedback: r.companyFeedback,
    interviewers: parseInterviewers(r),
    hr: r.hrName ? { name: r.hrName, title: r.hrTitle, email: r.hrEmail } : null,
    slotsSharedAt: r.slotsSharedAt?.toISOString() ?? null,
    slotsRequestedAt: r.slotsRequestedAt?.toISOString() ?? null,
    invitesSentAt: r.invitesSentAt?.toISOString() ?? null,
    reminderSentAt: r.reminderSentAt?.toISOString() ?? null,
    candidateConfirmedAt: r.candidateConfirmedAt?.toISOString() ?? null,
    candidateJoinedAt: r.candidateJoinedAt?.toISOString() ?? null,
    slots: r.slots.map((s) => ({
      slotId: Number(s.id),
      at: s.slotDateTime.toISOString(),
      isSelected: s.isSelected,
      isUnavailable: s.isUnavailable,
    })),
  };
}

/**
 * The NEXT DUE column. Structured rather than pre-formatted so the browser renders dates in
 * the coordinator's own clock; `q3.format.ts` turns each kind into the design's two lines.
 */
export type NextDue =
  | { kind: 'awaitingValidation'; at: string }
  | { kind: 'reviewDay'; day: number; daysLeft: number; expiresAt: string | null }
  | { kind: 'slotsAwaited'; since: string | null }
  | { kind: 'slotPending'; attempts: number }
  | { kind: 'noShow' }
  | { kind: 'rescheduleAsked' }
  | { kind: 'interviewAt'; at: string; mode: string | null; link: string | null }
  | { kind: 'resultOverdue'; days: number }
  | { kind: 'resultDue'; at: string | null }
  | { kind: 'onHold'; since: string | null }
  | { kind: 'docsMissing'; count: number; requestedAt: string | null }
  | { kind: 'docsToVerify'; count: number }
  | { kind: 'docsWithCompany'; at: string | null }
  | { kind: 'generateOffer' }
  | { kind: 'offerSent'; at: string | null }
  | { kind: 'joins'; at: string | null }
  | { kind: 'joined'; at: string | null }
  | { kind: 'expired' }
  | { kind: 'returned'; reason: string | null; at: string | null }
  | { kind: 'rejected' };

/** Per-application document counts, for the pipeline and the dashboard. */
export interface DocCounts {
  total: number;
  missing: number;
  toVerify: number;
  needsCorrection: number;
  verified: number;
  lastRequestAt: Date | null;
  toVerifyNames: string[];
}

@Injectable()
export class Q3ReadService {
  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma.client;
  }

  /** Every application Q3 has seen, narrowed by `where`. */
  loadApps(where: Prisma.JobSubscriberMappingWhereInput = {}) {
    return this.db.jobSubscriberMapping.findMany({
      where: { AND: [{ CvReferral: { some: {} } }, where] },
      select: APP_SELECT,
    });
  }

  async loadApp(mapId: number) {
    const [a] = await this.loadApps({ jobSubscriberMapID: BigInt(mapId) });
    return a ?? null;
  }

  /**
   * The document checklist for an application: what was asked for (tblCandidateDocumentMap,
   * scoped to this application when Q3 asked, or to the candidate when QC2 did) and what was
   * uploaded against each.
   */
  async documentsFor(apps: AppRow[]) {
    const subscriberIds = [...new Set(apps.map((a) => a.subscriberID).filter((x): x is bigint => x != null))];
    if (!subscriberIds.length) return new Map<number, DocRow[]>();
    const [maps, uploads, master] = await Promise.all([
      this.db.candidateDocumentMap.findMany({
        where: { subscriberID: { in: subscriberIds } },
        orderBy: { documentMapID: 'asc' },
      }),
      this.db.candidateDocumentUploaded.findMany({ where: { subscriberID: { in: subscriberIds } } }),
      this.db.mstrDocuments.findMany({ select: { documentID: true, documentName: true } }),
    ]);
    const nameOf = new Map(master.map((m) => [m.documentID, m.documentName ?? 'Document']));
    const uploadOf = new Map(uploads.map((u) => [String(u.documentMapID), u]));

    const out = new Map<number, DocRow[]>();
    for (const a of apps) {
      const mapId = a.jobSubscriberMapID;
      // A candidate asked for the same document by two applications has two map rows; the
      // application's own wins, then the candidate-wide one, never both.
      const mine = maps.filter((m) => m.subscriberID === a.subscriberID);
      const byType = new Map<number, (typeof maps)[number]>();
      for (const m of mine) {
        if (m.documentTypeID == null) continue;
        const prev = byType.get(m.documentTypeID);
        const ownsIt = m.jobSubscriberMapID === mapId;
        if (!prev || (ownsIt && prev.jobSubscriberMapID !== mapId)) byType.set(m.documentTypeID, m);
      }
      const rows: DocRow[] = [...byType.values()].map((m) => {
        const up = uploadOf.get(String(m.documentMapID));
        const uploaded = !!up?.documentPath;
        return {
          documentMapId: Number(m.documentMapID),
          documentTypeId: m.documentTypeID ?? 0,
          name: nameOf.get(m.documentTypeID ?? -1) ?? 'Document',
          state: documentState(up?.flgStatus, uploaded),
          docUploadId: up ? Number(up.docUploadID) : null,
          fileName: up?.fileName ?? null,
          sizeBytes: up?.sizeBytes ?? null,
          uploadedAt: (up?.timestampUpd ?? up?.timestampIns)?.toISOString() ?? null,
          requestedAt: m.timestampUpd ?? m.timestampIns ?? null,
        };
      });
      out.set(Number(mapId), rows);
    }
    return out;
  }

  static docCounts(rows: DocRow[]): DocCounts {
    const count = (s: DocumentState) => rows.filter((r) => r.state === s).length;
    const requested = rows.map((r) => r.requestedAt).filter((d): d is Date => !!d);
    return {
      total: rows.length,
      missing: count('Missing'),
      toVerify: count('Uploaded'),
      needsCorrection: count('NeedsCorrection'),
      verified: count('Verified'),
      lastRequestAt: requested.length ? new Date(Math.max(...requested.map((d) => d.getTime()))) : null,
      toVerifyNames: rows.filter((r) => r.state === 'Uploaded').map((r) => r.name),
    };
  }

  /** Contact attempts per round, for "Contacted 2×" and "2 attempts so far". */
  async contactAttempts(apps: AppRow[]) {
    const roundIds = apps.map((a) => latestRound(a)?.id).filter((x): x is bigint => x != null);
    if (!roundIds.length) return new Map<number, number>();
    const rows = await this.db.q3Activity.groupBy({
      by: ['interviewRoundID'],
      where: { kind: Q3ActivityKind.CONTACT, interviewRoundID: { in: roundIds } },
      _count: { _all: true },
    });
    return new Map(rows.map((r) => [Number(r.interviewRoundID), r._count._all]));
  }

  nextDue(a: AppRow, stage: HiringStage, ctx: { attempts: number; docs: DocCounts | null }, now = new Date()): NextDue {
    const ref = a.CvReferral[0];
    const r = latestRound(a);
    const hiring = a.ApplicationHiring;
    switch (stage) {
      case 'Referred':
        return { kind: 'awaitingValidation', at: ref.referredByQ2At.toISOString() };
      case 'CompanyReview':
        if (ref?.companyShortlistedAt) return { kind: 'slotsAwaited', since: ref.companyShortlistedAt.toISOString() };
        return {
          kind: 'reviewDay',
          day: ref?.sentToCompanyAt ? reviewDay(ref.sentToCompanyAt, now) : 1,
          daysLeft: ref?.sentToCompanyAt ? reviewDaysLeft(ref.sentToCompanyAt, now) : REVIEW_WINDOW_DAYS,
          expiresAt: ref?.expiresAt?.toISOString() ?? null,
        };
      case 'Scheduling':
        if (r?.status === RoundStatus.NO_SHOW) return { kind: 'noShow' };
        if (r?.status === RoundStatus.RESCHEDULE_REQUESTED) return { kind: 'rescheduleAsked' };
        if (r && r.slots.some((s) => !s.isUnavailable)) return { kind: 'slotPending', attempts: ctx.attempts };
        return { kind: 'slotsAwaited', since: (r?.slotsRequestedAt ?? r?.createdAt)?.toISOString() ?? null };
      case 'Interview':
        return {
          kind: 'interviewAt',
          at: r!.scheduledAt?.toISOString() ?? '',
          mode: modeLabel(r!.interviewModeID),
          link: r!.meetingLink,
        };
      case 'Decision': {
        if (r?.decision === RoundDecision.HOLD) return { kind: 'onHold', since: r.decidedAt?.toISOString() ?? null };
        if (r?.resultDueAt && r.resultDueAt < now) {
          return { kind: 'resultOverdue', days: Math.max(1, calendarDaysBetween(r.resultDueAt, now)) };
        }
        return { kind: 'resultDue', at: r?.resultDueAt?.toISOString() ?? null };
      }
      case 'Documents': {
        const d = ctx.docs;
        if (d && d.missing + d.needsCorrection > 0) {
          return { kind: 'docsMissing', count: d.missing + d.needsCorrection, requestedAt: d.lastRequestAt?.toISOString() ?? null };
        }
        if (d && d.toVerify > 0) return { kind: 'docsToVerify', count: d.toVerify };
        return { kind: 'docsWithCompany', at: hiring?.docsForwardedAt?.toISOString() ?? null };
      }
      case 'Offer': {
        const o = a.OfferLetter;
        if (!o) return { kind: 'generateOffer' };
        if (o.status === 'Accepted') return { kind: 'joins', at: o.joiningDate?.toISOString() ?? null };
        return { kind: 'offerSent', at: o.sentAt?.toISOString() ?? null };
      }
      case 'Returned':
        if (ref?.status === 'Expired') return { kind: 'expired' };
        return { kind: 'returned', reason: ref?.returnReason ?? null, at: ref?.returnedAt?.toISOString() ?? null };
      case 'Closed':
        if (hiring?.joinedAt) return { kind: 'joined', at: hiring.joinedAt.toISOString() };
        return { kind: 'rejected' };
    }
  }

  /** The table row the dashboard and every queue switcher share. */
  async rows(apps: AppRow[], now = new Date()) {
    const stages = new Map(apps.map((a) => [Number(a.jobSubscriberMapID), stageFor(a)]));
    const docApps = apps.filter((a) => stages.get(Number(a.jobSubscriberMapID)) === 'Documents');
    const schedApps = apps.filter((a) => stages.get(Number(a.jobSubscriberMapID)) === 'Scheduling');
    const [docs, attempts] = await Promise.all([this.documentsFor(docApps), this.contactAttempts(schedApps)]);

    return apps.map((a) => {
      const mapId = Number(a.jobSubscriberMapID);
      const stage = stages.get(mapId)!;
      const r = latestRound(a);
      const c = candidateOf(a);
      const j = jobOf(a);
      const docRows = docs.get(mapId);
      return {
        mapId,
        referralId: Number(a.CvReferral[0]?.id ?? 0),
        subscriberId: c.subscriberId,
        name: c.name,
        designation: c.designation,
        company: j.company,
        jobTitle: j.title,
        stage,
        round: r ? roundLabel(r) : null,
        /** For "Awaiting result" vs "Interview" vs "Offer accepted" in the STAGE pill. */
        stageDetail: Q3ReadService.stageDetail(a, stage),
        next: this.nextDue(a, stage, {
          attempts: r ? (attempts.get(Number(r.id)) ?? 0) : 0,
          docs: docRows ? Q3ReadService.docCounts(docRows) : null,
        }, now),
        /** Sort key: when this application next needs someone. */
        dueAt: Q3ReadService.dueAt(a, stage),
      };
    });
  }

  /**
   * The STAGE pill's text where it is more specific than the stage: the designs show
   * "Awaiting result" in the Decision stage and "Offer accepted" in Offer.
   */
  private static stageDetail(a: AppRow, stage: HiringStage): string | null {
    const r = latestRound(a);
    if (stage === 'Decision') return r?.decision === RoundDecision.HOLD ? 'OnHold' : 'AwaitingResult';
    if (stage === 'Offer' && a.OfferLetter?.status === 'Accepted') return 'OfferAccepted';
    if (stage === 'Closed') return a.ApplicationHiring?.joinedAt ? 'Joined' : 'Rejected';
    return null;
  }

  private static dueAt(a: AppRow, stage: HiringStage): number {
    const r = latestRound(a);
    const ref = a.CvReferral[0];
    const t = (d: Date | null | undefined) => d?.getTime() ?? Number.MAX_SAFE_INTEGER;
    switch (stage) {
      case 'Interview':
        return t(r?.scheduledAt);
      case 'Decision':
        return t(r?.resultDueAt);
      case 'CompanyReview':
        return t(ref?.expiresAt);
      case 'Offer':
        return t(a.OfferLetter?.joiningDate);
      case 'Returned':
      case 'Closed':
        return Number.MAX_SAFE_INTEGER;
      default:
        return t(ref?.referredByQ2At);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Screens
  // ──────────────────────────────────────────────────────────────────────────

  /** Candidate Pipeline — "7 candidates · sorted by next due". */
  async pipeline(q: PipelineQueryDto) {
    const search = q.search?.trim();
    const apps = await this.loadApps({
      ...(q.company ? { job: { client: { clientName: q.company } } } : {}),
      ...(search
        ? {
            OR: [
              { subscriber: { SubscriberCVDetails: { fullName: { contains: search, mode: 'insensitive' as const } } } },
              { job: { designation: { descr: { contains: search, mode: 'insensitive' as const } } } },
              { job: { client: { clientName: { contains: search, mode: 'insensitive' as const } } } },
            ],
          }
        : {}),
    });
    const rows = (await this.rows(apps)).filter((r) => r.stage !== 'Closed' || r.stageDetail === 'Joined');
    const companies = [...new Set(rows.map((r) => r.company).filter(Boolean))].sort();
    const visible = q.stage === 'all' ? rows : rows.filter((r) => r.stage === q.stage);
    visible.sort((a, b) => a.dueAt - b.dueAt || a.name.localeCompare(b.name));
    return { total: visible.length, companies, rows: visible };
  }

  /** The applications in one sidebar queue, in the order they need attention. */
  async queue(stages: HiringStage[]) {
    const rows = (await this.rows(await this.loadApps())).filter((r) => stages.includes(r.stage));
    rows.sort((a, b) => a.dueAt - b.dueAt || a.name.localeCompare(b.name));
    return rows.map((r) => ({ mapId: r.mapId, name: r.name, company: r.company, round: r.round, stage: r.stage }));
  }

  /**
   * The quarterly hiring report behind "Report exported · Q3_hiring_report_Jul–Sep.pdf": the
   * quarter's funnel (what happened inside it, by event date), the company decisions, the
   * pipeline as it stands, and every application that moved during the quarter.
   */
  async report(quarter: string | undefined, now = new Date()) {
    const IST = 330 * 60_000;
    const local = new Date(now.getTime() + IST);
    const m = /^(\d{4})-Q([1-4])$/.exec(quarter ?? '');
    const year = m ? Number(m[1]) : local.getUTCFullYear();
    const q = m ? Number(m[2]) : Math.floor(local.getUTCMonth() / 3) + 1;
    const from = new Date(Date.UTC(year, (q - 1) * 3, 1) - IST);
    const to = new Date(Date.UTC(year, q * 3, 1) - IST);
    const within = (d: Date | null | undefined) => !!d && d >= from && d < to;

    const [refs, apps] = await Promise.all([
      this.db.cvReferral.findMany({
        where: {
          OR: [
            { referredByQ2At: { gte: from, lt: to } },
            { sentToCompanyAt: { gte: from, lt: to } },
            { returnedAt: { gte: from, lt: to } },
            { companyShortlistedAt: { gte: from, lt: to } },
          ],
        },
        select: { referredByQ2At: true, sentToCompanyAt: true, returnedAt: true, status: true, companyShortlistedAt: true },
      }),
      this.loadApps(),
    ]);
    const rounds = apps.flatMap((a) => a.InterviewRound);
    const count = <T>(xs: T[], f: (x: T) => boolean) => xs.filter(f).length;

    const funnel = {
      referred: count(refs, (r) => within(r.referredByQ2At)),
      forwarded: count(refs, (r) => within(r.sentToCompanyAt)),
      returnedAtValidation: count(refs, (r) => r.status === 'Returned' && within(r.returnedAt)),
      autoExpired: count(refs, (r) => r.status === 'Expired' && within(r.returnedAt)),
      shortlisted: count(refs, (r) => within(r.companyShortlistedAt)),
      interviewsScheduled: count(rounds, (r) => within(r.invitesSentAt)),
      interviewsConducted: count(rounds, (r) => within(r.conductedAt)),
      selected: count(apps, (a) => within(a.ApplicationHiring?.selectedAt)),
      offersSent: count(apps, (a) => within(a.OfferLetter?.sentAt)),
      offersAccepted: count(apps, (a) => a.OfferLetter?.status === 'Accepted' && within(a.OfferLetter.candidateResponseAt)),
      joined: count(apps, (a) => within(a.ApplicationHiring?.joinedAt)),
    };
    const decisions = {
      nextRound: count(rounds, (r) => r.decision === RoundDecision.NEXT_ROUND && within(r.decidedAt)),
      finalRound: count(rounds, (r) => r.decision === RoundDecision.FINAL_ROUND && within(r.decidedAt)),
      hold: count(rounds, (r) => r.decision === RoundDecision.HOLD && within(r.decidedAt)),
      rejected: count(rounds, (r) => r.decision === RoundDecision.REJECTED && within(r.decidedAt)),
      selected: count(rounds, (r) => r.decision === RoundDecision.SELECTED && within(r.decidedAt)),
    };

    const touched = apps.filter((a) => {
      const ref = a.CvReferral[0];
      return (
        within(ref?.referredByQ2At) ||
        within(ref?.sentToCompanyAt) ||
        within(ref?.returnedAt) ||
        a.InterviewRound.some((r) => within(r.invitesSentAt) || within(r.conductedAt) || within(r.decidedAt)) ||
        within(a.ApplicationHiring?.selectedAt) ||
        within(a.ApplicationHiring?.joinedAt) ||
        within(a.OfferLetter?.sentAt)
      );
    });
    const rows = (await this.rows(touched, now)).sort(
      (x, y) => x.company.localeCompare(y.company) || x.name.localeCompare(y.name),
    );
    const stages: Record<string, number> = {};
    for (const a of apps) {
      const st = stageFor(a);
      stages[st] = (stages[st] ?? 0) + 1;
    }

    // Spelled out: current ICU abbreviates September as "Sept", and the designs write "Sep".
    const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fmt = (d: Date) => MONTHS[new Date(d.getTime() + IST).getUTCMonth()];
    return {
      quarter: `Q${q} ${year}`,
      label: `${fmt(from)}–${fmt(new Date(to.getTime() - 1))} ${year}`,
      months: `${fmt(from)}–${fmt(new Date(to.getTime() - 1))}`,
      from: from.toISOString(),
      to: to.toISOString(),
      generatedAt: now.toISOString(),
      funnel,
      decisions,
      stages,
      rows: rows.map((r) => ({
        name: r.name,
        company: r.company,
        jobTitle: r.jobTitle,
        stage: r.stage,
        stageDetail: r.stageDetail,
        round: r.round,
      })),
    };
  }

  /** Sidebar badges. */
  async navCounts(now = new Date()) {
    const apps = await this.loadApps();
    const stages = apps.map(stageFor);
    const count = (s: HiringStage) => stages.filter((x) => x === s).length;
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 7);
    const interviewsThisWeek = apps.filter((a) =>
      a.InterviewRound.some(
        (r) =>
          r.scheduledAt &&
          r.scheduledAt >= weekStart &&
          r.scheduledAt < weekEnd &&
          r.status !== RoundStatus.CANCELLED,
      ),
    ).length;
    return {
      referred: count('Referred'),
      companyReview: apps.filter(
        (a) => a.CvReferral[0]?.status === 'SentToCompany' && !a.CvReferral[0].companyShortlistedAt,
      ).length,
      scheduling: count('Scheduling'),
      interviews: interviewsThisWeek,
      decisions: count('Decision'),
      documents: count('Documents'),
      offers: count('Offer'),
      returned: apps.filter((a) => {
        const ref = a.CvReferral[0];
        return (ref?.status === 'Returned' || ref?.status === 'Expired') && q2ReturnState(ref) === 'Awaiting';
      }).length,
    };
  }

  /** The four KPI cards and "Needs your action". */
  async dashboard(now = new Date()) {
    const apps = await this.loadApps();
    const rows = await this.rows(apps, now);
    const byMap = new Map(apps.map((a) => [Number(a.jobSubscriberMapID), a]));
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const weekStart = startOfWeek(now);
    const weekEnd = addDays(weekStart, 7);

    const inReview = apps.filter(
      (a) => a.CvReferral[0]?.status === 'SentToCompany' && !a.CvReferral[0].companyShortlistedAt,
    );
    const expiring = inReview.filter((a) => {
      const sent = a.CvReferral[0].sentToCompanyAt;
      return sent ? reviewDaysLeft(sent, now) <= 2 : false;
    });
    const weekRounds = apps.flatMap((a) =>
      a.InterviewRound.filter(
        (r) => r.scheduledAt && r.scheduledAt >= weekStart && r.scheduledAt < weekEnd && r.status !== RoundStatus.CANCELLED,
      ),
    );
    const docApps = apps.filter((a) => stageFor(a) === 'Documents');
    const docs = await this.documentsFor(docApps);
    const docTotals = [...docs.values()].map(Q3ReadService.docCounts);

    const kpis = {
      referred: { value: rows.filter((r) => r.stage === 'Referred').length },
      companyReview: { value: inReview.length, expiring: expiring.length },
      interviewsWeek: {
        value: weekRounds.length,
        today: weekRounds.filter((r) => r.scheduledAt! >= today && r.scheduledAt! < tomorrow).length,
      },
      docsPending: {
        value: docApps.length,
        reRequested: docTotals.reduce((n, d) => n + d.needsCorrection, 0),
      },
    };

    // ── Needs your action ──
    const attempts = await this.contactAttempts(apps.filter((a) => stageFor(a) === 'Scheduling'));
    type Action =
      | { kind: 'contactForSlot'; mapId: number; roundId: number; name: string; phone: string; company: string; slots: number; attempts: number }
      | { kind: 'sendDecisionMail'; mapId: number; roundId: number; name: string; company: string; round: string; decision: string }
      | { kind: 'decisionOverdue'; mapId: number; roundId: number; name: string; company: string; round: string; daysLate: number }
      | { kind: 'verifyDocs'; mapId: number; name: string; count: number; documents: string[] }
      | { kind: 'autoExpired'; count: number };
    const actions: Action[] = [];

    for (const row of rows) {
      const a = byMap.get(row.mapId)!;
      const r = latestRound(a);
      const c = candidateOf(a);
      if (row.stage === 'Scheduling' && r && r.status === RoundStatus.PENDING && r.slots.some((s) => !s.isUnavailable)) {
        actions.push({
          kind: 'contactForSlot',
          mapId: row.mapId,
          roundId: Number(r.id),
          name: c.name,
          phone: c.phone,
          company: row.company,
          slots: r.slots.filter((s) => !s.isUnavailable).length,
          attempts: attempts.get(Number(r.id)) ?? 0,
        });
      }
      // A round the company cleared whose mail Q3 has not sent yet.
      const cleared = a.InterviewRound.filter(
        (x) => (x.decision === RoundDecision.NEXT_ROUND || x.decision === RoundDecision.FINAL_ROUND) && !x.decisionMailSentAt,
      ).at(-1);
      if (cleared && row.stage !== 'Closed' && row.stage !== 'Returned') {
        actions.push({
          kind: 'sendDecisionMail',
          mapId: row.mapId,
          roundId: Number(cleared.id),
          name: c.name,
          company: row.company,
          round: roundLabel(cleared),
          decision: cleared.decision!,
        });
      }
      if (row.stage === 'Decision' && r && !r.decision && r.resultDueAt && r.resultDueAt < now) {
        actions.push({
          kind: 'decisionOverdue',
          mapId: row.mapId,
          roundId: Number(r.id),
          name: c.name,
          company: row.company,
          round: roundLabel(r),
          daysLate: Math.max(1, calendarDaysBetween(r.resultDueAt, now)),
        });
      }
      if (row.stage === 'Documents') {
        const d = docs.get(row.mapId);
        const counts = d ? Q3ReadService.docCounts(d) : null;
        if (counts && counts.toVerify > 0) {
          actions.push({ kind: 'verifyDocs', mapId: row.mapId, name: c.name, count: counts.toVerify, documents: counts.toVerifyNames });
        }
      }
    }
    const expiredAwaiting = apps.filter(
      (a) => a.CvReferral[0]?.status === 'Expired' && q2ReturnState(a.CvReferral[0]) === 'Awaiting',
    ).length;
    if (expiredAwaiting) actions.push({ kind: 'autoExpired', count: expiredAwaiting });

    return { kpis, actions };
  }
}

export interface DocRow {
  documentMapId: number;
  documentTypeId: number;
  name: string;
  state: DocumentState;
  docUploadId: number | null;
  fileName: string | null;
  sizeBytes: number | null;
  uploadedAt: string | null;
  requestedAt: Date | null;
}
