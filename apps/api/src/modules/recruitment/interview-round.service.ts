import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { JobMapStatus } from '@/shared/status';

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

  /** Company or Q3 creates a new interview round for an application. */
  async createRound(input: {
    jobSubscriberMapId: number;
    roundNumber: number;
    roundName: string;
    interviewerName?: string;
    interviewerEmail?: string;
    hrName?: string;
    hrEmail?: string;
    interviewMode: string;
    meetingLink?: string;
    slots?: string[];  // ISO date strings
    userId: number;
  }) {
    // Resolve interview mode name → id (if numeric already, use directly)
    let interviewModeID: number | null = null;
    const parsed = Number(input.interviewMode);
    if (!Number.isNaN(parsed)) {
      interviewModeID = parsed;
    } else {
      const mode = await this.db.mstrInterviewMode.findFirst({
        where: { descr: { equals: input.interviewMode, mode: 'insensitive' } },
      });
      interviewModeID = mode ? Number(mode.interviewModeID) : null;
    }

    const round = await this.db.interviewRound.create({
      data: {
        jobSubscriberMapID: BigInt(input.jobSubscriberMapId),
        roundNumber: input.roundNumber,
        roundName: input.roundName,
        interviewerName: input.interviewerName ?? null,
        interviewerEmail: input.interviewerEmail ?? null,
        hrName: input.hrName ?? null,
        hrEmail: input.hrEmail ?? null,
        interviewModeID,
        meetingLink: input.meetingLink ?? null,
        status: 'Pending',
        result: 'Pending',
      },
    });

    // Create offered slots if any
    if (input.slots?.length) {
      await this.db.interviewSlot.createMany({
        data: input.slots.map((slotDateTime) => ({
          interviewRoundID: round.id,
          slotDateTime: new Date(slotDateTime),
          isSelected: false,
        })),
      });
    }

    // Transition application status based on round number
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

    // Mark the selected slot
    await this.db.interviewSlot.update({
      where: { id: BigInt(slotId) },
      data: { isSelected: true },
    });

    // Update round with selected slot and status
    await this.db.interviewRound.update({
      where: { id: BigInt(roundId) },
      data: {
        scheduledAt: slot.slotDateTime,
        status: 'Scheduled',
      },
    });

    // Send interview email to candidate
    const candidateEmail = round.mapping?.subscriber?.SubscriberCVDetails?.emailID;
    if (candidateEmail) {
      const interviewTime = slot.slotDateTime;
      const modeName = round.interviewModeID != null ? String(round.interviewModeID) : 'TBD';
      this.email.sendInterviewScheduled(candidateEmail, {
        fullName: round.mapping?.subscriber?.SubscriberCVDetails?.fullName ?? undefined,
        jobTitle: round.mapping?.job?.designation?.descr ?? '',
        companyName: round.mapping?.job?.client?.clientName ?? '',
        date: interviewTime.toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        time: interviewTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }),
        location: round.meetingLink ?? modeName ?? 'To be announced',
        isOnline: modeName === 'Virtual',
      }).catch(() => {});
    }

    await this.audit.record({
      userId,
      action: 'interview.slot_selected',
      entity: 'InterviewRound',
      entityId: Number(round.id),
    });

    return { ok: true };
  }

  /** Record round result (Company/Q3 submits after interview). */
  async submitResult(roundId: number, result: 'Passed' | 'Failed' | 'Hold', userId: number, feedback?: string) {
    const round = await this.db.interviewRound.findUnique({
      where: { id: BigInt(roundId) },
      select: { id: true, jobSubscriberMapID: true },
    });
    if (!round) throw new NotFoundException('Interview round not found');

    await this.db.interviewRound.update({
      where: { id: BigInt(roundId) },
      data: {
        result,
        companyFeedback: feedback ?? null,
        status: 'Completed',
      },
    });

    await this.audit.record({
      userId,
      action: 'interview.round_result',
      entity: 'InterviewRound',
      entityId: Number(round.id),
      detail: { result, feedback },
    });

    return { ok: true };
  }

  /** List rounds for an application. */
  async listRounds(jobSubscriberMapId: number) {
    const rounds = await this.db.interviewRound.findMany({
      where: { jobSubscriberMapID: BigInt(jobSubscriberMapId) },
      orderBy: { roundNumber: 'asc' },
      include: { slots: { orderBy: { slotDateTime: 'asc' } } },
    });

    return rounds.map((r) => ({
      roundId: Number(r.id),
      roundNumber: r.roundNumber,
      roundName: r.roundName,
      interviewerName: r.interviewerName,
      interviewModeId: r.interviewModeID,
      meetingLink: r.meetingLink,
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
