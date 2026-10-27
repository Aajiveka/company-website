import type {
  EmployerInterviewRound,
  InterviewMode,
  InterviewScheduleInput,
} from '@/employer/services/employer.types';

/** The master stores In-person / Telephonic / Video; the form speaks the employer's words. */
function formMode(stored: string | null | undefined): InterviewMode {
  const s = stored?.toLowerCase() ?? '';
  if (/person|face/.test(s)) return 'Face to face';
  if (/tele|phone/.test(s)) return 'Telephonic';
  return 'Video call';
}

/** Contacts and mode carry over from the previous round; slots never do. */
export function scheduleDefaultsFrom(round: EmployerInterviewRound | undefined): Partial<InterviewScheduleInput> {
  if (!round) return {};
  return {
    hrName: round.hrName ?? '',
    hrEmail: round.hrEmail ?? '',
    interviewerName: round.interviewerName ?? '',
    interviewerEmail: round.interviewerEmail ?? '',
    guestName: round.guestName ?? '',
    guestEmail: round.guestEmail ?? '',
    mode: formMode(round.interviewMode),
    meetingLink: round.meetingLink ?? '',
    location: round.location ?? '',
  };
}
