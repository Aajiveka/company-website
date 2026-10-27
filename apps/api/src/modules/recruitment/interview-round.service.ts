import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { JobMapStatus, SubscriberStatus } from '@/shared/status';

export type RoundDetails = {
  interviewerName?: string;
  interviewerEmail?: string;
  hrName?: string;
  hrEmail?: string;
  guestName?: string;
  guestEmail?: string;
  interviewMode: string;
  meetingLink?: string;
  location?: string;
  slots?: string[];
};

export type NextRound = 'Round2' | 'Round3' | 'Final' | 'Select';

export function roundNumberFor(next: Exclude<NextRound, 'Select'> | 'Round1'): number {
  return { Round1: 1, Round2: 2, Round3: 3, Final: 4 }[next];
}

export function roundNameFor(roundNumber: number): string {
  return roundNumber >= 4 ? 'Final round' : `Round ${roundNumber}`;
}

/** Multi-round interview management (Q3/Company workflow). */
@Injectable()
export class InterviewRoundService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly applications: JobApplicationsService,
  ) {}

  private get db() {
    return this.prisma.client;
  }

  private async resolveInterviewModeId(interviewMode: string): Promise<number | null> {
    const parsed = Number(interviewMode);
    if (!Number.isNaN(parsed) && interviewMode.trim() !== '') return parsed;
    const modes = await this.db.mstrInterviewMode.findMany();
    const wanted = interviewMode.trim().toLowerCase();
    const exact = modes.find((m) => m.descr?.trim().toLowerCase() === wanted);
    if (exact) return Number(exact.interviewModeID);
    // The employer form says "Face to face" / "Video call"; the master says In-person / Video.
    const family = /face|person|office|walk/.test(wanted)
      ? /person|face/
      : /video|virtual|online|meet|zoom|teams/.test(wanted)
        ? /video|virtual|online/
        : /tele|phone|call/.test(wanted)
          ? /tele|phone/
          : null;
    const alias = family ? modes.find((m) => family.test(m.descr?.toLowerCase() ?? '')) : undefined;
    return alias ? Number(alias.interviewModeID) : null;
  }

  private async modeLabel(
    interviewModeID: number | null,
    meetingLink: string | null,
    location: string | null = null,
  ): Promise<{
    label: string;
    isOnline: boolean;
  }> {
    if (interviewModeID == null) {
      return { label: meetingLink ?? location ?? 'To be announced', isOnline: Boolean(meetingLink) };
    }
    const mode = await this.db.mstrInterviewMode.findUnique({
      where: { interviewModeID },
      select: { descr: true },
    });
    const label = mode?.descr ?? String(interviewModeID);
    const isOnline = /virtual|online|video/i.test(label) || Boolean(meetingLink);
    return { label: meetingLink || location || label, isOnline };
  }

  /** Company or Q3 creates a new interview round for an application. */
  async createRound(
    input: RoundDetails & {
      jobSubscriberMapId: number;
      roundNumber: number;
      roundName: string;
      userId: number;
      /** Pipeline history note; defaults to "<round> sent to Q3 for scheduling". */
      comments?: string;
    },
  ) {
    const interviewModeID = await this.resolveInterviewModeId(input.interviewMode);
    const clean = (v?: string) => v?.trim() || null;

    const round = await this.db.interviewRound.create({
      data: {
        jobSubscriberMapID: BigInt(input.jobSubscriberMapId),
        roundNumber: input.roundNumber,
        roundName: input.roundName,
        interviewerName: clean(input.interviewerName),
        interviewerEmail: clean(input.interviewerEmail),
        hrName: clean(input.hrName),
        hrEmail: clean(input.hrEmail),
        guestName: clean(input.guestName),
        guestEmail: clean(input.guestEmail),
        interviewModeID,
        meetingLink: clean(input.meetingLink),
        location: clean(input.location),
        status: 'Pending',
        result: 'Pending',
      },
    });

    if (input.slots?.length) {
      await this.db.interviewSlot.createMany({
        data: input.slots.map((slotDateTime) => ({
          interviewRoundID: round.id,
          slotDateTime: new Date(slotDateTime),
          isSelected: false,
        })),
      });
    }

    const statusMap: Record<number, number> = {
      1: JobMapStatus.INTERVIEW_R1,
      2: JobMapStatus.INTERVIEW_R2,
      3: JobMapStatus.INTERVIEW_R3,
    };
    const targetStatus = statusMap[input.roundNumber] ?? JobMapStatus.FINAL_ROUND;
    await this.applications.transitionStatus(
      input.jobSubscriberMapId,
      targetStatus,
      input.userId,
      SubscriberStatus.INTERVIEW_SCHEDULED,
      input.comments ?? `${input.roundName} sent to Q3 for scheduling`,
    );

    await this.audit.record({
      userId: input.userId,
      action: 'interview.round_created',
      entity: 'InterviewRound',
      entityId: Number(round.id),
      detail: { roundNumber: input.roundNumber, roundName: input.roundName },
    });

    return { interviewRoundId: Number(round.id) };
  }

  /** Replace offered slots when the candidate needs new options. */
  async addSlots(roundId: number, slots: string[], userId: number) {
    if (!slots.length) throw new BadRequestException('At least one slot is required');
    const round = await this.db.interviewRound.findUnique({
      where: { id: BigInt(roundId) },
      select: { id: true, status: true },
    });
    if (!round) throw new NotFoundException('Interview round not found');
    if (round.status === 'Completed' || round.status === 'Cancelled') {
      throw new BadRequestException('Cannot change slots on a completed round');
    }

    await this.db.interviewSlot.deleteMany({
      where: { interviewRoundID: round.id, isSelected: false },
    });
    await this.db.interviewSlot.createMany({
      data: slots.map((slotDateTime) => ({
        interviewRoundID: round.id,
        slotDateTime: new Date(slotDateTime),
        isSelected: false,
      })),
    });
    await this.db.interviewRound.update({
      where: { id: round.id },
      data: { status: 'Pending', scheduledAt: null, updatedAt: new Date() },
    });

    await this.audit.record({
      userId,
      action: 'interview.slots_updated',
      entity: 'InterviewRound',
      entityId: roundId,
      detail: { slotCount: slots.length },
    });

    return { ok: true, slotCount: slots.length };
  }

  /** Candidate selects a slot for an interview round. */
  async selectSlot(roundId: number, slotId: number, userId: number) {
    const round = await this.db.interviewRound.findUnique({
      where: { id: BigInt(roundId) },
      include: {
        slots: true,
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
    if (!round) throw new NotFoundException('Interview round not found');

    const slot = round.slots.find((s) => Number(s.id) === slotId);
    if (!slot) throw new NotFoundException('Slot not found');

    await this.db.interviewSlot.updateMany({
      where: { interviewRoundID: round.id },
      data: { isSelected: false },
    });
    await this.db.interviewSlot.update({
      where: { id: BigInt(slotId) },
      data: { isSelected: true },
    });

    await this.db.interviewRound.update({
      where: { id: BigInt(roundId) },
      data: {
        scheduledAt: slot.slotDateTime,
        status: 'Scheduled',
      },
    });

    const { label, isOnline } = await this.modeLabel(
      round.interviewModeID,
      round.meetingLink,
      round.location,
    );
    const interviewTime = slot.slotDateTime;
    if (round.mapping?.jobMapStatusID != null) {
      await this.applications.transitionStatus(
        Number(round.jobSubscriberMapID),
        Number(round.mapping.jobMapStatusID),
        userId,
        undefined,
        `${round.roundName ?? roundNameFor(round.roundNumber)} scheduled for ${interviewTime.toLocaleString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          timeZone: 'Asia/Kolkata',
        })}`,
      );
    }
    const payload = {
      fullName: round.mapping?.subscriber?.SubscriberCVDetails?.fullName ?? undefined,
      jobTitle: round.mapping?.job?.designation?.descr ?? '',
      companyName: round.mapping?.job?.client?.clientName ?? '',
      date: interviewTime.toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
      time: interviewTime.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
      location: label,
      isOnline,
    };

    const recipients = [
      round.mapping?.subscriber?.SubscriberCVDetails?.emailID,
      round.interviewerEmail,
      round.hrEmail,
      round.guestEmail,
    ].filter((e): e is string => Boolean(e?.trim()));

    await Promise.all(
      [...new Set(recipients)].map((to) =>
        this.email.sendInterviewScheduled(to, payload).catch(() => {}),
      ),
    );

    await this.audit.record({
      userId,
      action: 'interview.slot_selected',
      entity: 'InterviewRound',
      entityId: Number(round.id),
    });

    return { ok: true };
  }

  /**
   * Record round result and advance pipeline.
   * next: Round2 | Round3 | Final | Select (when Passed).
   */
  async submitResult(
    roundId: number,
    result: 'Passed' | 'Failed' | 'Hold',
    userId: number,
    feedback?: string,
    next?: NextRound,
    nextRound?: RoundDetails,
  ) {
    const round = await this.db.interviewRound.findUnique({
      where: { id: BigInt(roundId) },
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
    if (!round) throw new NotFoundException('Interview round not found');

    // Hold leaves the round open so the employer can still select or reject after it.
    await this.db.interviewRound.update({
      where: { id: BigInt(roundId) },
      data: {
        result,
        companyFeedback: feedback?.trim() || null,
        status: result === 'Hold' ? round.status : 'Completed',
        updatedAt: new Date(),
      },
    });

    const roundName = round.roundName ?? roundNameFor(round.roundNumber);
    const mapId = Number(round.jobSubscriberMapID);
    const email = round.mapping?.subscriber?.SubscriberCVDetails?.emailID;
    const base = {
      fullName: round.mapping?.subscriber?.SubscriberCVDetails?.fullName ?? undefined,
      jobTitle: round.mapping?.job?.designation?.descr ?? '',
      companyName: round.mapping?.job?.client?.clientName ?? '',
      dashboardUrl: '/candidate/tracker',
    };

    let nextRoundId: number | undefined;

    if (result === 'Failed') {
      await this.applications.transitionStatus(
        mapId,
        JobMapStatus.REJECTED,
        userId,
        SubscriberStatus.REJECTED,
        `Rejected after ${roundName}`,
      );
      if (email) {
        await this.email
          .sendApplicationStatus(email, {
            ...base,
            status: 'rejected',
            message: 'Thank you for interviewing. Unfortunately we will not be moving forward at this time.',
          })
          .catch(() => {});
      }
    } else if (result === 'Hold') {
      await this.applications.transitionStatus(
        mapId,
        JobMapStatus.ON_HOLD,
        userId,
        undefined,
        `On hold after ${roundName}`,
      );
      if (email) {
        await this.email
          .sendApplicationStatus(email, {
            ...base,
            status: 'shortlisted',
            message: 'Your application is on hold. We will update you soon.',
          })
          .catch(() => {});
      }
    } else {
      // Passed
      const advance = next ?? (round.roundNumber >= 3 ? 'Select' : (`Round${round.roundNumber + 1}` as 'Round2' | 'Round3'));

      if (advance === 'Select') {
        await this.applications.transitionStatus(
          mapId,
          JobMapStatus.SELECTED,
          userId,
          SubscriberStatus.SELECTED,
          `Selected after ${roundName}`,
        );
        if (email) {
          await this.email
            .sendApplicationStatus(email, {
              ...base,
              status: 'selected',
              message: 'Congratulations — you have been selected. Next steps will follow for documents and offer.',
            })
            .catch(() => {});
        }
      } else {
        const nextNumber = roundNumberFor(advance);
        const nextName = roundNameFor(nextNumber);
        if (email) {
          await this.email
            .sendApplicationStatus(email, {
              ...base,
              status: 'shortlisted',
              message: `Congratulations — you cleared ${roundName}. ${nextName} scheduling will follow.`,
            })
            .catch(() => {});
        }
        const details: RoundDetails = nextRound ?? {
          interviewerName: round.interviewerName ?? undefined,
          interviewerEmail: round.interviewerEmail ?? undefined,
          hrName: round.hrName ?? undefined,
          hrEmail: round.hrEmail ?? undefined,
          guestName: round.guestName ?? undefined,
          guestEmail: round.guestEmail ?? undefined,
          interviewMode: String(round.interviewModeID ?? 'Video'),
          meetingLink: round.meetingLink ?? undefined,
          location: round.location ?? undefined,
        };
        const created = await this.createRound({
          ...details,
          jobSubscriberMapId: mapId,
          roundNumber: nextNumber,
          roundName: nextName,
          userId,
          comments: `Selected after ${roundName} · ${nextName} sent to Q3 for scheduling`,
        });
        nextRoundId = created.interviewRoundId;
      }
    }

    await this.audit.record({
      userId,
      action: 'interview.round_result',
      entity: 'InterviewRound',
      entityId: Number(round.id),
      detail: { result, feedback, next, nextRoundId },
    });

    return { ok: true, nextRoundId };
  }

  /** List rounds for an application. */
  async listRounds(jobSubscriberMapId: number) {
    const rounds = await this.db.interviewRound.findMany({
      where: { jobSubscriberMapID: BigInt(jobSubscriberMapId) },
      orderBy: { roundNumber: 'asc' },
      include: {
        slots: { orderBy: { slotDateTime: 'asc' } },
        interviewMode: { select: { descr: true } },
      },
    });

    return rounds.map((r) => ({
      roundId: Number(r.id),
      jobSubscriberMapId,
      roundNumber: r.roundNumber,
      roundName: r.roundName ?? roundNameFor(r.roundNumber),
      interviewerName: r.interviewerName,
      interviewerEmail: r.interviewerEmail,
      hrName: r.hrName,
      hrEmail: r.hrEmail,
      guestName: r.guestName,
      guestEmail: r.guestEmail,
      interviewModeId: r.interviewModeID,
      interviewMode: r.interviewMode?.descr ?? null,
      meetingLink: r.meetingLink,
      location: r.location,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt?.toISOString() ?? null,
      scheduledAt: r.scheduledAt?.toISOString() ?? null,
      status: r.status,
      result: r.result,
      companyFeedback: r.companyFeedback,
      slots: r.slots.map((s) => ({
        slotId: Number(s.id),
        slotDateTime: s.slotDateTime.toISOString(),
        isSelected: s.isSelected,
      })),
    }));
  }
}
