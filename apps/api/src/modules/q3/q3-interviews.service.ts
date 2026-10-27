import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '@/prisma/prisma.service';
import { AuditService } from '@/modules/audit/audit.service';
import { EmailService } from '@/common/email/email.service';
import { JobApplicationsService } from '@/modules/jobs/job-application.service';
import { staffDirectory } from '@/modules/recruitment/staff-directory';
import { JobMapStatus } from '@/shared/status';
import {
  DEFAULT_HIRING_DOCUMENTS,
  DOCS_DUE_DAYS,
  Q3ActivityKind,
  RESULT_DUE_HOURS,
  RESULT_FOR_DECISION,
  RoundDecision,
  RoundStatus,
  addDays,
  istDateAfter,
  calendarDaysBetween,
  isInPersonMode,
  modeLabel,
  parseInterviewers,
  roundLabel,
  roundTitle,
  startOfDay,
  startOfWeek,
  type RoundDecisionValue,
} from '@/shared/hiring';
import {
  Q3ReadService,
  candidateOf,
  jobOf,
  latestRound,
  roundView,
  stageFor,
  type AppRow,
  type RoundRow,
} from './q3-read.service';
import { firstName, mailDate, mailDateTime, mailTime, maskEmail } from './q3-mail';
import type { ChecklistDto, ConfirmSlotDto, ContactDto, Q3RoundDecisionDto } from './dto/q3.dto';

/** JobMapStatus for "this round is on" — what the rest of the app shows as the stage. */
function interviewStatusFor(r: { roundNumber: number; isFinal: boolean }) {
  if (r.isFinal) return JobMapStatus.FINAL_ROUND;
  return [JobMapStatus.INTERVIEW_R1, JobMapStatus.INTERVIEW_R2, JobMapStatus.INTERVIEW_R3][r.roundNumber - 1] ?? JobMapStatus.FINAL_ROUND;
}

/** Statuses a round can be (re)scheduled from. */
const SCHEDULABLE: string[] = [RoundStatus.PENDING, RoundStatus.NO_SHOW, RoundStatus.RESCHEDULE_REQUESTED];

/**
 * Q3's interview screens (Figma "Q3" 04, 04b, 05 and 05b): finding a slot with the candidate,
 * confirming it and sending the invites, the week's schedule, and recording what the company
 * decided after each round.
 */
@Injectable()
export class Q3InterviewsService {
  private readonly logger = new Logger(Q3InterviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly email: EmailService,
    private readonly applications: JobApplicationsService,
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

  /** The round and the application it belongs to. */
  private async roundOrThrow(roundId: number) {
    const round = await this.db.interviewRound.findUnique({
      where: { id: BigInt(roundId) },
      select: { jobSubscriberMapID: true },
    });
    if (!round) throw new NotFoundException('Interview round not found');
    const app = await this.appOrThrow(Number(round.jobSubscriberMapID));
    const r = app.InterviewRound.find((x) => Number(x.id) === roundId)!;
    return { app, round: r };
  }

  private async log(
    mapId: number | bigint,
    kind: string,
    opts: { roundId?: number | bigint | null; channel?: string | null; note?: string | null; userId?: number },
  ) {
    await this.db.q3Activity.create({
      data: {
        jobSubscriberMapID: BigInt(mapId),
        interviewRoundID: opts.roundId != null ? BigInt(opts.roundId) : null,
        kind,
        channel: opts.channel ?? null,
        note: opts.note?.slice(0, 2000) ?? null,
        createdBy: opts.userId ? BigInt(opts.userId) : null,
      },
    });
  }

  /** Fire-and-forget: a slow mail provider must not fail the action that triggered the mail. */
  private mail(to: string | null | undefined, subject: string, data: Parameters<EmailService['sendQ3Notice']>[2]) {
    if (!to) return false;
    this.email.sendQ3Notice(to, subject, data).catch((err: Error) => this.logger.warn(`Mail to ${to} failed: ${err.message}`));
    return true;
  }

  /** Who to mail about a round on the company's side: its HR contact, else the company. */
  private companyContact(a: AppRow, r: RoundRow | null) {
    return r?.hrEmail || jobOf(a).companyEmail || null;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 04 · Slot Scheduling
  // ──────────────────────────────────────────────────────────────────────────

  async scheduling(mapId: number, userId: number) {
    const a = await this.appOrThrow(mapId);
    const r = latestRound(a);
    const c = candidateOf(a);
    const j = jobOf(a);
    const [log, staff] = await Promise.all([
      this.db.q3Activity.findMany({
        where: { jobSubscriberMapID: BigInt(mapId), kind: Q3ActivityKind.CONTACT, ...(r ? { interviewRoundID: r.id } : {}) },
        orderBy: { createdAt: 'asc' },
      }),
      staffDirectory(this.db, [userId]),
    ]);
    const view = r ? roundView(r) : null;
    return {
      mapId,
      stage: stageFor(a),
      candidate: c,
      company: j.company,
      jobTitle: j.title,
      officeAddress: j.officeAddress,
      shortlisted: !!a.CvReferral[0]?.companyShortlistedAt || !!r,
      round: view,
      steps: {
        companyShared: !!view && view.slots.length > 0,
        contacted: log.length > 0,
        confirmed: !!r && r.status === RoundStatus.SCHEDULED,
        invitesSent: !!r?.invitesSentAt && r.status === RoundStatus.SCHEDULED,
      },
      contactLog: log.map((l) => ({
        id: Number(l.id),
        channel: l.channel,
        note: l.note ?? '',
        at: l.createdAt.toISOString(),
      })),
      recipients: {
        candidate: c.name,
        interviewers: view?.interviewers.map((i) => i.name) ?? [],
        hr: view?.hr?.name ?? null,
        q3: staff.get(userId)?.name ?? 'You',
      },
    };
  }

  /** The Contact log's Log button, and the Call button (which logs itself). */
  async contact(mapId: number, dto: ContactDto, userId: number) {
    const a = await this.appOrThrow(mapId);
    const roundId = dto.roundId ?? latestRound(a)?.id ?? null;
    if (dto.roundId && !a.InterviewRound.some((r) => Number(r.id) === dto.roundId)) {
      throw new NotFoundException('Interview round not found');
    }
    await this.log(mapId, Q3ActivityKind.CONTACT, { roundId, channel: dto.channel, note: dto.note.trim(), userId });
    const attempts = roundId
      ? await this.db.q3Activity.count({ where: { kind: Q3ActivityKind.CONTACT, interviewRoundID: BigInt(roundId) } })
      : 0;
    return { logged: true, attempts };
  }

  /**
   * "Candidate unavailable" on a company slot. A slot the candidate cannot make is kept on
   * screen (the company offered it) but can no longer be confirmed.
   */
  async setSlotUnavailable(roundId: number, slotId: number, unavailable: boolean, userId: number) {
    const { round } = await this.roundOrThrow(roundId);
    const slot = round.slots.find((s) => Number(s.id) === slotId);
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.isSelected && round.status === RoundStatus.SCHEDULED) {
      throw new ConflictException('This slot is confirmed — reschedule the interview instead');
    }
    await this.db.interviewSlot.update({
      where: { id: slot.id },
      data: { isUnavailable: unavailable, ...(unavailable ? { isSelected: false } : {}) },
    });
    await this.audit.record({ userId, action: 'q3.slot_availability', entity: 'InterviewSlot', entityId: slotId, detail: { unavailable } });
    return { slotId, isUnavailable: unavailable };
  }

  /** "No slot works for the candidate? Ask the company for fresh slots." */
  async requestSlots(roundId: number, userId: number) {
    const { app, round } = await this.roundOrThrow(roundId);
    if (!SCHEDULABLE.includes(round.status)) {
      throw new ConflictException('This round is already confirmed — reschedule it first');
    }
    const now = new Date();
    await this.db.interviewRound.update({ where: { id: round.id }, data: { slotsRequestedAt: now, updatedAt: now } });
    const c = candidateOf(app);
    const j = jobOf(app);
    const to = this.companyContact(app, round);
    const mailed = this.mail(to, `New interview slots needed: ${c.name} — ${j.title}`, {
      previewText: `Please share fresh interview slots for ${c.name}`,
      greetingName: round.hrName,
      paragraphs: [
        `None of the slots shared for ${c.name}'s ${roundTitle(round)} interview (${j.title}) work for the candidate.`,
        'Please reply with three or four new slots and we will confirm one with the candidate straight away.',
      ],
    });
    await this.log(app.jobSubscriberMapID, Q3ActivityKind.SLOT_REQUEST, {
      roundId: round.id,
      channel: 'Mail',
      note: mailed ? `New slots requested from ${j.company}` : `New slots requested from ${j.company} (no company email on file)`,
      userId,
    });
    return { requested: true, mailed, company: j.company };
  }

  /**
   * A working meeting room for the confirmation mail. The designs show a Google Meet link;
   * creating one needs Google Workspace credentials this deployment does not have, so the
   * Generate button issues a Jitsi Meet room — real, free and needing no account — and the
   * field still accepts a pasted Meet or Teams link.
   */
  meetingLink() {
    const part = () => randomBytes(3).toString('hex');
    return { link: `https://meet.jit.si/aajiveka-${part()}-${part()}-${part()}` };
  }

  /** "Confirm & send invites". */
  async confirm(roundId: number, dto: ConfirmSlotDto, userId: number) {
    const { app, round } = await this.roundOrThrow(roundId);
    if (!SCHEDULABLE.includes(round.status)) {
      throw new ConflictException('This interview is already confirmed');
    }
    const slot = round.slots.find((s) => Number(s.id) === dto.slotId);
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.isUnavailable) throw new BadRequestException('The candidate is unavailable for that slot');
    if (slot.slotDateTime.getTime() < Date.now()) throw new BadRequestException('That slot has already passed');
    const inPerson = isInPersonMode(round.interviewModeID);
    const link = dto.meetingLink?.trim() || round.meetingLink || null;
    if (modeLabel(round.interviewModeID) === 'Virtual' && !link) {
      throw new BadRequestException('Add a meeting link for a virtual interview');
    }
    const r = dto.recipients;
    if (!r.candidate && !r.interviewers && !r.hr && !r.q3) {
      throw new BadRequestException('Pick at least one recipient');
    }

    const now = new Date();
    // Conditional on the round still being schedulable, so a double click cannot send the
    // invites twice.
    const { count } = await this.db.interviewRound.updateMany({
      where: { id: round.id, status: { in: SCHEDULABLE } },
      data: {
        scheduledAt: slot.slotDateTime,
        status: RoundStatus.SCHEDULED,
        meetingLink: inPerson ? round.meetingLink : link,
        invitesSentAt: now,
        reminderSentAt: null,
        candidateConfirmedAt: null,
        candidateJoinedAt: null,
        updatedAt: now,
      },
    });
    if (!count) throw new ConflictException('This interview is already confirmed');
    await this.db.$transaction([
      this.db.interviewSlot.updateMany({ where: { interviewRoundID: round.id }, data: { isSelected: false } }),
      this.db.interviewSlot.update({ where: { id: slot.id }, data: { isSelected: true } }),
    ]);
    await this.applications.transitionStatus(Number(app.jobSubscriberMapID), interviewStatusFor(round), userId);

    // ── Invites ──
    const c = candidateOf(app);
    const j = jobOf(app);
    const interviewers = parseInterviewers(round);
    const staff = await staffDirectory(this.db, [userId]);
    const where = inPerson ? j.officeAddress || 'Office address to follow' : link!;
    const details: Array<[string, string]> = [
      ['When', mailDateTime(slot.slotDateTime)],
      ['Duration', `${round.durationMins} min`],
      ['Mode', modeLabel(round.interviewModeID) ?? 'Interview'],
      ['Candidate', c.name],
      ...(interviewers.length ? [['With', interviewers.map((i) => i.name).join(', ')] as [string, string]] : []),
      ...(round.hrName ? [['HR', round.hrName] as [string, string]] : []),
      [inPerson ? 'Address' : 'Link', where],
    ];
    const subject = `Interview confirmed: ${j.company} — ${j.title} (${roundTitle(round)})`;
    const body = (who?: string | null) => ({
      previewText: `${roundTitle(round)} on ${mailDateTime(slot.slotDateTime)}`,
      greetingName: who,
      paragraphs: [`The ${roundTitle(round)} interview for ${j.title} at ${j.company} is confirmed.`],
      details,
      link: inPerson ? null : { label: 'Join the interview', href: link! },
    });
    let sent = 0;
    if (r.candidate && this.mail(c.email, subject, body(c.name))) sent++;
    if (r.interviewers) for (const i of interviewers) if (this.mail(i.email, subject, body(i.name))) sent++;
    if (r.hr && this.mail(round.hrEmail, subject, body(round.hrName))) sent++;
    if (r.q3 && this.mail(staff.get(userId)?.email, subject, body(staff.get(userId)?.name))) sent++;

    await this.log(app.jobSubscriberMapID, Q3ActivityKind.INVITES, {
      roundId: round.id,
      channel: 'Mail',
      note: `Invites sent for ${mailDateTime(slot.slotDateTime)} (${sent} recipient${sent === 1 ? '' : 's'})`,
      userId,
    });
    await this.audit.record({ userId, action: 'q3.interview_confirmed', entity: 'InterviewRound', entityId: roundId, detail: { slotId: dto.slotId, sent } });
    return { confirmed: true, sent, scheduledAt: slot.slotDateTime.toISOString() };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 04b · Interviews
  // ──────────────────────────────────────────────────────────────────────────

  async interviews(week: string | undefined, now = new Date()) {
    // `week` is a calendar date; noon IST keeps it inside that day whatever the server zone.
    const anchor = week ? new Date(`${week}T12:00:00+05:30`) : now;
    if (Number.isNaN(anchor.getTime())) throw new BadRequestException('Invalid week');
    const weekStart = startOfWeek(anchor);
    const weekEnd = addDays(weekStart, 7);
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);

    const apps = await this.read.loadApps({ InterviewRound: { some: {} } });
    const all = apps.flatMap((a) => a.InterviewRound.map((r) => ({ a, r })));
    const live = all.filter(({ a }) => stageFor(a) !== 'Returned');

    const rowOf = ({ a, r }: { a: AppRow; r: RoundRow }) => {
      const c = candidateOf(a);
      const j = jobOf(a);
      return {
        mapId: Number(a.jobSubscriberMapID),
        name: c.name,
        designation: c.designation,
        company: j.company,
        jobTitle: j.title,
        isLatest: latestRound(a)?.id === r.id,
        round: roundView(r, now),
      };
    };

    const rows = live
      .filter(({ r }) => r.scheduledAt && r.scheduledAt >= weekStart && r.scheduledAt < weekEnd && r.status !== RoundStatus.CANCELLED)
      .sort((x, y) => x.r.scheduledAt!.getTime() - y.r.scheduledAt!.getTime())
      .map(rowOf);

    const todays = live
      .filter(({ r }) => r.scheduledAt && r.scheduledAt >= today && r.scheduledAt < tomorrow && r.status !== RoundStatus.CANCELLED)
      .sort((x, y) => x.r.scheduledAt!.getTime() - y.r.scheduledAt!.getTime());
    const nextToday = todays.find(({ r }) => r.status === RoundStatus.SCHEDULED && r.scheduledAt! > now);
    const awaiting = live.filter(({ a, r }) => latestRound(a)?.id === r.id && r.status === RoundStatus.COMPLETED && !r.decision);
    const resched = live.filter(
      ({ a, r }) => latestRound(a)?.id === r.id && (r.status === RoundStatus.NO_SHOW || r.status === RoundStatus.RESCHEDULE_REQUESTED),
    );
    const weekLabels = rows.map((x) => x.round);
    const order = (l: { isFinal: boolean; roundNumber: number }) => (l.isFinal ? 99 : l.roundNumber);
    const lo = weekLabels.length ? weekLabels.reduce((m, x) => (order(x) < order(m) ? x : m)) : null;
    const hi = weekLabels.length ? weekLabels.reduce((m, x) => (order(x) > order(m) ? x : m)) : null;

    const kpis = {
      today: {
        value: todays.length,
        nextAt: nextToday?.r.scheduledAt?.toISOString() ?? null,
        who: todays.map(({ a, r }) => `${firstName(candidateOf(a).name)} ${roundLabel(r)}`),
      },
      week: {
        value: rows.length,
        range: lo && hi ? (lo.label === hi.label ? lo.label : `${lo.label} → ${hi.label}`) : null,
        companies: new Set(rows.map((x) => x.company)).size,
      },
      awaiting: {
        value: awaiting.length,
        overdue: awaiting.filter(({ r }) => r.resultDueAt && r.resultDueAt < now).length,
      },
      needsReschedule: {
        value: resched.length,
        noShow: resched.filter(({ r }) => r.status === RoundStatus.NO_SHOW).length,
      },
    };

    // Up next: the soonest confirmed interview that has not finished yet.
    const upcoming = live
      .filter(
        ({ r }) =>
          r.status === RoundStatus.SCHEDULED &&
          r.scheduledAt &&
          r.scheduledAt.getTime() + r.durationMins * 60_000 > now.getTime(),
      )
      .sort((x, y) => x.r.scheduledAt!.getTime() - y.r.scheduledAt!.getTime())[0];
    const upNext = upcoming
      ? {
          ...rowOf(upcoming),
          phone: candidateOf(upcoming.a).phone,
          email: candidateOf(upcoming.a).email,
          officeAddress: jobOf(upcoming.a).officeAddress,
        }
      : null;

    return {
      weekStart: weekStart.toISOString(),
      weekEnd: addDays(weekEnd, -1).toISOString(),
      kpis,
      rows,
      upNext,
      companies: [...new Set(rows.map((r) => r.company))].sort(),
    };
  }

  /** "Remind" — the day-before reminder to the candidate. */
  async remind(roundId: number, userId: number) {
    const { app, round } = await this.roundOrThrow(roundId);
    if (round.status !== RoundStatus.SCHEDULED || !round.scheduledAt) {
      throw new ConflictException('Only a confirmed interview can be reminded');
    }
    const c = candidateOf(app);
    const j = jobOf(app);
    const inPerson = isInPersonMode(round.interviewModeID);
    const mailed = this.mail(c.email, `Reminder: your interview with ${j.company}`, {
      previewText: `${roundTitle(round)} at ${mailTime(round.scheduledAt)}`,
      greetingName: c.name,
      paragraphs: [`A reminder that your ${roundTitle(round)} interview for ${j.title} at ${j.company} is coming up.`],
      details: [
        ['When', mailDateTime(round.scheduledAt)],
        ['Mode', modeLabel(round.interviewModeID) ?? 'Interview'],
        [inPerson ? 'Address' : 'Link', (inPerson ? j.officeAddress : round.meetingLink) || 'Shared in your invite'],
      ],
      link: !inPerson && round.meetingLink ? { label: 'Join the interview', href: round.meetingLink } : null,
    });
    if (!mailed) throw new BadRequestException(`${c.name} has no email address on file`);
    const now = new Date();
    await this.db.interviewRound.update({ where: { id: round.id }, data: { reminderSentAt: now, updatedAt: now } });
    await this.log(app.jobSubscriberMapID, Q3ActivityKind.REMINDER, {
      roundId: round.id,
      channel: 'Mail',
      note: `Reminder for ${roundTitle(round)} at ${mailDateTime(round.scheduledAt)}`,
      userId,
    });
    return { reminded: true, name: c.name, round: roundTitle(round), at: round.scheduledAt.toISOString() };
  }

  /** The day-of checklist's two manual ticks. */
  async checklist(roundId: number, dto: ChecklistDto, userId: number) {
    const { round } = await this.roundOrThrow(roundId);
    if (round.status !== RoundStatus.SCHEDULED) throw new ConflictException('This interview is not on the schedule');
    const field = dto.item === 'candidateConfirmed' ? 'candidateConfirmedAt' : 'candidateJoinedAt';
    if (dto.item === 'candidateJoined' && dto.done && round.scheduledAt && round.scheduledAt.getTime() - Date.now() > 15 * 60_000) {
      throw new BadRequestException('The candidate can only join once the interview is about to start');
    }
    const now = new Date();
    await this.db.interviewRound.update({ where: { id: round.id }, data: { [field]: dto.done ? now : null, updatedAt: now } });
    await this.audit.record({ userId, action: 'q3.checklist', entity: 'InterviewRound', entityId: roundId, detail: { ...dto } });
    return { item: dto.item, done: dto.done };
  }

  /**
   * "Reschedule". Before the start time it is a reschedule request; once the interview has
   * started without the candidate it is a no-show. Either way the confirmed slot is released
   * and the round goes back to Slot Scheduling.
   */
  async reschedule(roundId: number, userId: number) {
    const { app, round } = await this.roundOrThrow(roundId);
    if (round.status !== RoundStatus.SCHEDULED) throw new ConflictException('Only a confirmed interview can be rescheduled');
    const started = !!round.scheduledAt && round.scheduledAt.getTime() <= Date.now();
    const noShow = started && !round.candidateJoinedAt;
    const status = noShow ? RoundStatus.NO_SHOW : RoundStatus.RESCHEDULE_REQUESTED;
    const now = new Date();
    await this.db.$transaction([
      this.db.interviewRound.update({ where: { id: round.id }, data: { status, updatedAt: now } }),
      // The confirmed time no longer works; keep it on screen but out of reach.
      this.db.interviewSlot.updateMany({
        where: { interviewRoundID: round.id, isSelected: true },
        data: { isSelected: false, isUnavailable: true },
      }),
    ]);
    await this.applications.transitionStatus(
      Number(app.jobSubscriberMapID),
      noShow ? JobMapStatus.INTERVIEW_NOT_ATTENDED : JobMapStatus.RESCHEDULE_REQUESTED,
      userId,
    );
    await this.audit.record({ userId, action: 'q3.interview_rescheduled', entity: 'InterviewRound', entityId: roundId, detail: { status } });
    return { status, mapId: Number(app.jobSubscriberMapID) };
  }

  /** "Mark conducted" — the round now waits on the company's result. */
  async conducted(roundId: number, userId: number) {
    const { app, round } = await this.roundOrThrow(roundId);
    if (round.status !== RoundStatus.SCHEDULED) throw new ConflictException('Only a confirmed interview can be marked conducted');
    if (round.scheduledAt && round.scheduledAt.getTime() > Date.now()) {
      throw new BadRequestException("The interview hasn't started yet");
    }
    const now = new Date();
    await this.db.interviewRound.update({
      where: { id: round.id },
      data: {
        status: RoundStatus.COMPLETED,
        conductedAt: now,
        resultDueAt: new Date(now.getTime() + RESULT_DUE_HOURS * 60 * 60 * 1000),
        updatedAt: now,
      },
    });
    await this.applications.transitionStatus(Number(app.jobSubscriberMapID), JobMapStatus.INTERVIEW_ATTENDED, userId);
    await this.audit.record({ userId, action: 'q3.interview_conducted', entity: 'InterviewRound', entityId: roundId });
    return { mapId: Number(app.jobSubscriberMapID) };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 05 · Interview Rounds
  // ──────────────────────────────────────────────────────────────────────────

  async rounds(mapId: number, now = new Date()) {
    const a = await this.appOrThrow(mapId);
    const c = candidateOf(a);
    const j = jobOf(a);
    const r = latestRound(a);
    const nudges = await this.db.q3Activity.findMany({
      where: { jobSubscriberMapID: BigInt(mapId), kind: Q3ActivityKind.NUDGE },
      orderBy: { createdAt: 'desc' },
    });
    const lastNudge = (roundId: bigint) => nudges.find((n) => n.interviewRoundID === roundId)?.createdAt.toISOString() ?? null;
    const overdueDays =
      r && r.status === RoundStatus.COMPLETED && !r.decision && r.resultDueAt && r.resultDueAt < now
        ? Math.max(1, calendarDaysBetween(r.resultDueAt, now))
        : 0;
    const canRecord = !!r && r.status === RoundStatus.COMPLETED && (!r.decision || r.decision === RoundDecision.HOLD);

    return {
      mapId,
      stage: stageFor(a),
      candidate: { ...c, maskedEmail: c.email ? maskEmail(c.email) : null },
      company: j.company,
      jobTitle: j.title,
      overdueDays,
      canRecord,
      latestRoundId: r ? Number(r.id) : null,
      hasFinal: a.InterviewRound.some((x) => x.isFinal),
      selected: !!a.ApplicationHiring?.selectedAt,
      rounds: a.InterviewRound.map((x) => ({ ...roundView(x, now), lastNudgeAt: lastNudge(x.id) })),
    };
  }

  /** "Nudge company" — chase the company for an overdue result. */
  async nudge(mapId: number, userId: number) {
    const a = await this.appOrThrow(mapId);
    const r = latestRound(a);
    if (!r || r.status !== RoundStatus.COMPLETED || r.decision) {
      throw new ConflictException('There is no result to chase for this candidate');
    }
    const c = candidateOf(a);
    const j = jobOf(a);
    const to = this.companyContact(a, r);
    const mailed = this.mail(to, `Result pending: ${c.name} — ${roundTitle(r)}`, {
      previewText: `Waiting on ${c.name}'s ${roundTitle(r)} result`,
      greetingName: r.hrName,
      paragraphs: [
        `${c.name}'s ${roundTitle(r)} interview for ${j.title} was conducted${r.conductedAt ? ` on ${mailDate(r.conductedAt)}` : ''}, and we are still waiting for the result.`,
        'Could you share the decision — next round, final round, hold or not selected — so we can let the candidate know?',
      ],
    });
    if (!mailed) throw new BadRequestException(`${j.company} has no HR or company email on file`);
    await this.log(mapId, Q3ActivityKind.NUDGE, { roundId: r.id, channel: 'Mail', note: `Nudged ${j.company} for ${roundTitle(r)} result`, userId });
    return { nudged: true, company: j.company, name: c.name, round: roundTitle(r) };
  }

  /** "Save decision & send mail". */
  async decide(roundId: number, dto: Q3RoundDecisionDto, userId: number) {
    const { app, round } = await this.roundOrThrow(roundId);
    const latest = latestRound(app)!;
    if (latest.id !== round.id) throw new ConflictException('A later round already exists');
    if (round.status !== RoundStatus.COMPLETED) {
      throw new ConflictException('Record the decision once the interview has been conducted');
    }
    if (round.decision && round.decision !== RoundDecision.HOLD) {
      throw new ConflictException('A decision is already recorded for this round');
    }
    if (dto.decision === RoundDecision.SELECTED && !round.isFinal) {
      throw new BadRequestException('Selected is recorded after the final round');
    }
    if ((dto.decision === RoundDecision.NEXT_ROUND || dto.decision === RoundDecision.FINAL_ROUND) && round.isFinal) {
      throw new BadRequestException('This was the final round');
    }

    const mapId = Number(app.jobSubscriberMapID);
    const now = new Date();
    const { count } = await this.db.interviewRound.updateMany({
      where: { id: round.id, OR: [{ decision: null }, { decision: RoundDecision.HOLD }] },
      data: {
        decision: dto.decision,
        decidedAt: now,
        result: RESULT_FOR_DECISION[dto.decision],
        companyFeedback: dto.feedback?.trim() || round.companyFeedback,
        // A Hold's mail must not count as this decision's: left set, the dashboard dropped
        // the "send mail" action and decision-mail answered 409 "already sent".
        decisionMailSentAt: null,
        updatedAt: now,
      },
    });
    if (!count) throw new ConflictException('A decision is already recorded for this round');

    let nextRoundId: number | null = null;
    const ensureHiring = (data: Record<string, unknown>) =>
      this.db.applicationHiring.upsert({
        where: { jobSubscriberMapID: BigInt(mapId) },
        create: { jobSubscriberMapID: BigInt(mapId), ...data },
        update: { ...data, timestampUpd: now },
      });

    switch (dto.decision) {
      case RoundDecision.NEXT_ROUND:
      case RoundDecision.FINAL_ROUND: {
        const isFinal = dto.decision === RoundDecision.FINAL_ROUND;
        const next = await this.db.interviewRound.create({
          data: {
            jobSubscriberMapID: BigInt(mapId),
            roundNumber: round.roundNumber + 1,
            isFinal,
            status: RoundStatus.PENDING,
            result: 'Pending',
            // The company usually keeps the panel and mode; Q3 edits them when slots arrive.
            interviewers: round.interviewers,
            interviewerName: round.interviewerName,
            interviewerEmail: round.interviewerEmail,
            hrName: round.hrName,
            hrTitle: round.hrTitle,
            hrEmail: round.hrEmail,
            interviewModeID: round.interviewModeID,
            durationMins: round.durationMins,
            ...(dto.requestSlots ? { slotsRequestedAt: now } : {}),
          },
        });
        nextRoundId = Number(next.id);
        await this.applications.transitionStatus(mapId, interviewStatusFor(next), userId);
        if (app.ApplicationHiring?.onHoldAt) await ensureHiring({ onHoldAt: null });
        if (dto.requestSlots) await this.requestSlotsMail(app, next, userId);
        break;
      }
      case RoundDecision.HOLD:
        await ensureHiring({ onHoldAt: now });
        break;
      case RoundDecision.REJECTED:
        await this.applications.transitionStatus(mapId, JobMapStatus.REJECTED, userId, undefined, dto.feedback);
        break;
      case RoundDecision.SELECTED:
        await ensureHiring({
          selectedAt: now,
          onHoldAt: null,
          docsRequestedAt: now,
          docsDueAt: istDateAfter(now, DOCS_DUE_DAYS),
        });
        await this.requestDefaultDocuments(app, userId);
        await this.applications.transitionStatus(mapId, JobMapStatus.SELECTED, userId);
        break;
    }

    let mailed = false;
    if (dto.sendMail) mailed = await this.sendDecisionMailFor(app, round, dto.decision, userId);

    await this.audit.record({
      userId,
      action: 'q3.round_decision',
      entity: 'InterviewRound',
      entityId: roundId,
      detail: { decision: dto.decision, mailed, requestSlots: !!dto.requestSlots },
    });
    return { decision: dto.decision, mailed, nextRoundId };
  }

  /** "Send Round 2 congrats mail" — the decision mail for a round, if it was not sent. */
  async sendDecisionMail(roundId: number, userId: number) {
    const { app, round } = await this.roundOrThrow(roundId);
    if (!round.decision) throw new ConflictException('No decision has been recorded for this round');
    if (round.decisionMailSentAt) throw new ConflictException('The mail for this round has already been sent');
    const mailed = await this.sendDecisionMailFor(app, round, round.decision as RoundDecisionValue, userId);
    if (!mailed) throw new BadRequestException(`${candidateOf(app).name} has no email address on file`);
    return { sent: true, name: candidateOf(app).name, company: jobOf(app).company, round: roundTitle(round) };
  }

  /**
   * The candidate's mail for a decision, per "What each decision triggers": congratulations
   * (round cleared / final round), hold, rejection, or selection with the documents to send.
   */
  private async sendDecisionMailFor(app: AppRow, round: RoundRow, decision: RoundDecisionValue, userId: number) {
    const c = candidateOf(app);
    const j = jobOf(app);
    const content: Record<RoundDecisionValue, { subject: string; paragraphs: string[] }> = {
      NextRound: {
        subject: `Congratulations — you cleared ${roundTitle(round)} at ${j.company}`,
        paragraphs: [
          `Great news: you have cleared the ${roundTitle(round)} interview for ${j.title} at ${j.company}.`,
          'We will be in touch shortly with slots for the next round.',
        ],
      },
      FinalRound: {
        subject: `Congratulations — you are through to the final round at ${j.company}`,
        paragraphs: [
          `Great news: ${j.company} would like to meet you for the final round for ${j.title}.`,
          'We will be in touch shortly with slots for the final interview.',
        ],
      },
      Hold: {
        subject: `An update on your application at ${j.company}`,
        paragraphs: [
          `${j.company} has put your application for ${j.title} on hold for now. Nothing is needed from you — we will let you know as soon as there is news.`,
        ],
      },
      Rejected: {
        subject: `An update on your application at ${j.company}`,
        paragraphs: [
          `Thank you for interviewing for ${j.title} at ${j.company}. After the ${roundTitle(round)} interview, the company has decided not to move forward.`,
          'Your profile stays active with us, and we will keep matching you to new openings.',
        ],
      },
      Selected: {
        subject: `Congratulations — you have been selected at ${j.company}`,
        paragraphs: [
          `Congratulations! ${j.company} has selected you for ${j.title}.`,
          'Next, please upload your documents from your Aajiveka dashboard so we can prepare your offer.',
        ],
      },
    };
    const m = content[decision];
    const mailed = this.mail(c.email, m.subject, { previewText: m.subject, greetingName: c.name, paragraphs: m.paragraphs });
    if (!mailed) return false;
    const now = new Date();
    await this.db.interviewRound.update({ where: { id: round.id }, data: { decisionMailSentAt: now } });
    await this.log(app.jobSubscriberMapID, Q3ActivityKind.DECISION_MAIL, { roundId: round.id, channel: 'Mail', note: m.subject, userId });
    return true;
  }

  private async requestSlotsMail(app: AppRow, round: { id: bigint; roundNumber: number; isFinal: boolean; hrName: string | null; hrEmail: string | null }, userId: number) {
    const c = candidateOf(app);
    const j = jobOf(app);
    const to = round.hrEmail || j.companyEmail;
    const mailed = this.mail(to, `Slots needed: ${c.name} — ${roundTitle(round)}`, {
      previewText: `Please share ${roundTitle(round)} slots for ${c.name}`,
      greetingName: round.hrName,
      paragraphs: [
        `Thank you for the decision on ${c.name} (${j.title}).`,
        `Please share three or four slots for the ${roundTitle(round)} interview and we will confirm one with the candidate.`,
      ],
    });
    await this.log(app.jobSubscriberMapID, Q3ActivityKind.SLOT_REQUEST, {
      roundId: round.id,
      channel: 'Mail',
      note: mailed ? `${roundTitle(round)} slots requested from ${j.company}` : `${roundTitle(round)} slots requested (no company email on file)`,
      userId,
    });
  }

  /**
   * "Selected (final only) — candidate selected → document collection": ask for the default
   * hiring documents. Rows are scoped to this application; a document the candidate was
   * already asked for (by QC2, or another application) is not asked for twice.
   */
  private async requestDefaultDocuments(app: AppRow, userId: number) {
    if (app.subscriberID == null) return;
    const existing = await this.db.candidateDocumentMap.findMany({
      where: { subscriberID: app.subscriberID },
      select: { documentTypeID: true },
    });
    const have = new Set(existing.map((e) => e.documentTypeID));
    const now = new Date();
    const toCreate = DEFAULT_HIRING_DOCUMENTS.filter((id) => !have.has(id));
    if (toCreate.length) {
      await this.db.candidateDocumentMap.createMany({
        data: toCreate.map((documentTypeID) => ({
          subscriberID: app.subscriberID,
          jobSubscriberMapID: app.jobSubscriberMapID,
          documentTypeID,
          flgStatus: 0,
          timestampIns: now,
          loginIDIns: userId,
        })),
      });
    }
    await this.log(app.jobSubscriberMapID, Q3ActivityKind.DOC_REQUEST, {
      channel: 'Mail',
      note: `Documents requested after selection (${DEFAULT_HIRING_DOCUMENTS.length})`,
      userId,
    });
  }
}
