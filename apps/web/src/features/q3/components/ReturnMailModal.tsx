import { AlertCircle, Send } from 'lucide-react';
import { getErrorMessage } from '@/lib/axios';
import { Q3Modal } from './Q3Modal';
import { useQ3Toast } from './q3-toast-context';
import { Avatar, CardMessage, Q3Button, SectionLabel } from './primitives';
import { Q2StatePill, ReturnReasonPill } from './ReturnedPills';
import { useQ3ReturnMail, useResendReturnMail } from '../q3.api';
import { dot, relativeDayTime } from '../q3.format';

/**
 * "View mail" on Returned to Q2: the status mail Q2 got (or should have got) for one returned
 * CV, with a re-send. No Figma frame exists for it, so it borrows the "Return CVs to Q2"
 * modal's language — tracked section labels, a hairline candidate card, the #FAFBFC note box.
 */
export function ReturnMailModal({ referralId, onClose }: { referralId: number | null; onClose: () => void }) {
  const toast = useQ3Toast();
  const { data, isPending, isError, error, refetch } = useQ3ReturnMail(referralId);
  const resend = useResendReturnMail();

  const onResend = () => {
    if (referralId == null) return;
    resend.mutate(referralId, {
      onSuccess: () => toast.success('Mail re-sent', 'Delivery is tracked in the Email Log'),
      onError: (err) => toast.error("Couldn't re-send the mail", getErrorMessage(err)),
    });
  };

  return (
    <Q3Modal
      open={referralId != null}
      onClose={onClose}
      title="Status mail to Q2"
      subtitle={data ? dot(data.candidate, data.company, data.jobTitle) : 'Returned CV'}
      footer={
        <>
          <Q3Button variant="secondary" onClick={onClose}>
            Close
          </Q3Button>
          <Q3Button
            variant="primary"
            icon={Send}
            onClick={onResend}
            loading={resend.isPending}
            disabled={!data || !data.to.email}
            title={data && !data.to.email ? 'Q2 has no email on file' : undefined}
          >
            Re-send mail
          </Q3Button>
        </>
      }
    >
      {isPending ? (
        <div className="space-y-4" aria-busy>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <span className="block h-3 w-20 animate-pulse rounded bg-q3-chip" />
              <span className="block h-4 w-2/3 animate-pulse rounded bg-q3-chip" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <CardMessage
          icon={AlertCircle}
          title="Couldn't load the mail"
          body={getErrorMessage(error)}
          action={{ label: 'Retry', onClick: () => void refetch() }}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="To">
              <p className="text-[13.5px] font-semibold leading-4 text-q3-ink">{data.to.name}</p>
              <p className="mt-[3px] text-[12.5px] leading-[15px] text-q3-muted">{data.to.email ?? 'No email on file'}</p>
            </Field>
            <Field label="Sent">
              <p className="text-[13.5px] font-medium leading-4 text-q3-ink">
                {data.sentAt ? relativeDayTime(data.sentAt) : <span className="text-q3-muted">Not sent yet</span>}
              </p>
            </Field>
          </div>

          <Field label="Candidate">
            <div className="flex items-center gap-2.5 rounded-[10px] border border-q3-line px-[11px] py-[9px]">
              <Avatar name={data.candidate} size={30} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-semibold leading-4 text-q3-ink">{data.candidate}</p>
                <p className="mt-px truncate text-xs leading-[15px] text-q3-muted">
                  Referred for {dot(data.company, data.jobTitle)}
                </p>
              </div>
              <Q2StatePill state={data.q2} />
            </div>
          </Field>

          <Field label="Reason">
            <ReturnReasonPill reason={data.reason} />
          </Field>

          <Field label="Note to Q2">
            <p className="rounded-lg border border-q3-line bg-q3-head px-3 py-2.5 text-[12.5px] leading-[15px] text-q3-ink-soft">
              {data.note || <span className="text-q3-muted-light">No note was added</span>}
            </p>
          </Field>
        </div>
      )}
    </Q3Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionLabel className="mb-2">{label}</SectionLabel>
      {children}
    </div>
  );
}
