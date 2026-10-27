import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, Check, Flag, Mail, PauseCircle, XCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { useRecordDecision } from '../q3.api';
import { TONE_PILL, firstName, type Tone } from '../q3.format';
import type { RoundDecision, RoundsDetail } from '../q3.types';
import { Q3Modal } from './Q3Modal';
import { Q3Button, Q3Checkbox, Q3Toggle, SectionLabel, fieldClass } from './primitives';
import { useQ3Toast } from './q3-toast-context';
import { roundTitle } from './round-labels';

interface Option {
  value: RoundDecision;
  title: string;
  sub: string;
  icon: LucideIcon;
  tone: Tone;
}

/** The mail each decision sends, as the modal's green box names it. */
const MAIL: Record<RoundDecision, { name: string; template: string }> = {
  NextRound: { name: 'Congratulations Mail (Round cleared)', template: 'Next round invite' },
  FinalRound: { name: 'Congratulations Mail (Final Round)', template: 'Final round invite' },
  Hold: { name: 'Hold Mail', template: 'On hold update' },
  Rejected: { name: 'Rejection Mail', template: 'Rejection' },
  Selected: { name: 'Selection Mail', template: 'Selection & documents' },
};

/**
 * "Record company decision" (Figma 05b). The options follow the round: after a regular round
 * the company can send the candidate on (next or final round), after the final round it can
 * only select — the API refuses the other combinations, so the modal never offers them.
 */
export function RecordDecisionModal({
  open,
  onClose,
  detail,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  detail: RoundsDetail;
  initial?: RoundDecision;
}) {
  const toast = useQ3Toast();
  const navigate = useNavigate();
  const record = useRecordDecision();
  const latest = detail.rounds.find((r) => r.roundId === detail.latestRoundId) ?? null;
  const isFinal = !!latest?.isFinal;
  const nextLabel = latest ? `Round ${latest.roundNumber + 1}` : 'Next round';
  const hasEmail = !!detail.candidate.maskedEmail;

  const [decision, setDecision] = useState<RoundDecision | null>(initial ?? null);
  const [sendMail, setSendMail] = useState(hasEmail);
  const [requestSlots, setRequestSlots] = useState(true);
  const [feedback, setFeedback] = useState('');

  const options: Option[] = [
    ...(isFinal
      ? [{ value: 'Selected', title: 'Selected', sub: 'Move to document collection', icon: Award, tone: 'green' } as const]
      : [
          { value: 'NextRound', title: 'Proceed to next round', sub: `${nextLabel} · dynamic`, icon: ArrowRight, tone: 'blue' } as const,
          { value: 'FinalRound', title: 'Proceed to final round', sub: 'Skip remaining rounds', icon: Flag, tone: 'violet' } as const,
        ]),
    { value: 'Hold', title: 'Hold', sub: 'Keep candidate on hold', icon: PauseCircle, tone: 'gray' },
    { value: 'Rejected', title: 'Rejected', sub: 'Close the application', icon: XCircle, tone: 'red' },
  ];

  const mail = decision ? MAIL[decision] : null;
  const asksSlots = decision === 'NextRound' || decision === 'FinalRound';
  const mailOn = sendMail && hasEmail;
  const name = detail.candidate.name;

  const submit = async () => {
    if (!decision || detail.latestRoundId == null) return;
    try {
      const res = await record.mutateAsync({
        roundId: detail.latestRoundId,
        decision,
        sendMail: mailOn,
        requestSlots: asksSlots ? requestSlots : undefined,
        feedback: feedback.trim() || undefined,
      });
      const mailLine = (what: string) => (res.mailed ? `${what} sent to ${name}` : 'No mail sent');
      switch (decision) {
        case 'NextRound':
          toast.success(`Moved to ${nextLabel}`, mailLine('Congratulations mail'));
          break;
        case 'FinalRound':
          toast.success('Moved to the final round', mailLine('Congratulations mail'));
          break;
        case 'Hold':
          toast.success('Candidate on hold', mailLine('Hold mail'));
          break;
        case 'Rejected':
          toast.success('Application closed', mailLine('Rejection mail'));
          break;
        case 'Selected':
          toast.success(`${firstName(name)} selected`, 'Document collection started');
          break;
      }
      onClose();
      if (decision === 'Selected') navigate(`/q3/documents/${detail.mapId}`);
    } catch (err) {
      toast.error("Couldn't save the decision", getErrorMessage(err));
    }
  };

  return (
    <Q3Modal
      open={open}
      onClose={onClose}
      width={600}
      title="Record company decision"
      subtitle={[name, latest ? roundTitle(latest) : null, detail.company].filter(Boolean).join(' · ')}
      footer={
        <>
          <Q3Button onClick={onClose} className="min-h-[38px]">
            Cancel
          </Q3Button>
          <Q3Button
            variant="primary"
            icon={Check}
            loading={record.isPending}
            disabled={!decision || detail.latestRoundId == null}
            title={decision ? undefined : 'Pick the company’s decision first'}
            onClick={() => void submit()}
          >
            {mailOn ? 'Save decision & send mail' : 'Save decision'}
          </Q3Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <SectionLabel>Company decision</SectionLabel>
        <div role="radiogroup" aria-label="Company decision" className="grid gap-3 sm:grid-cols-2">
          {options.map((o) => {
            const active = decision === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setDecision(o.value)}
                className={cn(
                  'flex min-h-16 items-center gap-3 rounded-[10px] p-3.5 text-left transition',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
                  active
                    ? 'border-[1.5px] border-q3-blue bg-q3-blue-tint'
                    : 'border border-q3-line bg-q3-surface hover:border-q3-line-strong',
                )}
              >
                <span
                  className={cn('inline-flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[9px]', TONE_PILL[o.tone])}
                  aria-hidden
                >
                  <o.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold leading-4 text-q3-ink">{o.title}</span>
                  <span className="mt-px block text-xs leading-[15px] text-q3-muted">{o.sub}</span>
                </span>
                <span
                  className={cn(
                    'h-[18px] w-[18px] shrink-0 rounded-full bg-q3-surface',
                    active ? 'border-[5px] border-q3-blue' : 'border-[1.5px] border-q3-line-strong',
                  )}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>

        {mail && (
          <div className="flex items-center gap-3 rounded-[10px] border border-q3-green-line bg-q3-green-tint px-3.5 py-3">
            <Mail className="h-[18px] w-[18px] shrink-0 text-q3-green" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold leading-4 text-q3-ink">Q3 sends {mail.name}</p>
              <p className="mt-0.5 text-xs leading-[15px] text-q3-muted">
                To {detail.candidate.maskedEmail ?? 'no email on file'} · template “{mail.template}”
              </p>
            </div>
            <Q3Toggle checked={mailOn} onChange={setSendMail} disabled={!hasEmail} label={`Send ${mail.name}`} />
          </div>
        )}

        {asksSlots && (
          <Q3Checkbox
            checked={requestSlots}
            onChange={setRequestSlots}
            label={
              <span className="text-[13px] font-medium leading-4 text-q3-ink-soft">
                Request {decision === 'FinalRound' ? 'Final Round' : nextLabel} slots from company right away
              </span>
            }
            className="gap-2.5"
          />
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="q3-decision-feedback" className="text-[12.5px] font-semibold leading-[15px] text-q3-ink-soft">
            Company feedback (internal)
          </label>
          <textarea
            id="q3-decision-feedback"
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Strong on distributed systems; final round with CTO next week."
            className={cn(fieldClass, 'resize-y rounded-[9px]')}
          />
        </div>
      </div>
    </Q3Modal>
  );
}
