import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Undo2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getErrorMessage } from '@/lib/axios';
import { useReturnCvs } from '../q3.api';
import type { ReferredRow, ReturnReason } from '../q3.types';
import { Avatar, Pill, Q3Button, Q3Checkbox, SectionLabel, fieldClass } from './primitives';
import { Q3Modal } from './Q3Modal';
import { useQ3Toast } from './q3-toast-context';

const REASONS: ReturnReason[] = ['CV missing', 'Incomplete profile', 'Role mismatch', 'Duplicate referral'];

const cvs = (n: number) => `${n} CV${n === 1 ? '' : 's'}`;

interface Props {
  open: boolean;
  onClose: () => void;
  batch: { batchId: string; referredBy: string };
  /** The rows going back — the batch's unselected rows, or one row from its action button. */
  rows: ReferredRow[];
}

/**
 * "overlay/modal · Return to Q2". Mounted only while open, so every opening starts from the
 * reasons the rows themselves suggest rather than whatever was picked last time.
 */
export function ReturnToQ2Modal(props: Props) {
  return props.open ? <ReturnDialog {...props} /> : null;
}

function ReturnDialog({ onClose, batch, rows }: Props) {
  const toast = useQ3Toast();
  const navigate = useNavigate();
  const returnCvs = useReturnCvs();

  const [reasons, setReasons] = useState<ReturnReason[]>(() => {
    const pre: ReturnReason[] = [];
    if (rows.some((r) => !r.hasCv)) pre.push('CV missing');
    if (rows.some((r) => r.hasCv)) pre.push('Role mismatch');
    return pre;
  });
  const [note, setNote] = useState('');
  const [emailQ2, setEmailQ2] = useState(true);
  const [tried, setTried] = useState(false);

  const n = rows.length;
  const reasonError = tried && reasons.length === 0;

  const toggle = (r: ReturnReason) =>
    setReasons((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : REASONS.filter((x) => x === r || cur.includes(x))));

  /** A missing CV is the row's own reason; otherwise it takes the first other reason picked. */
  function reasonFor(row: ReferredRow): ReturnReason {
    if (!row.hasCv && reasons.includes('CV missing')) return 'CV missing';
    return reasons.find((r) => r !== 'CV missing') ?? reasons[0];
  }

  async function submit() {
    setTried(true);
    if (!reasons.length || !n) return;
    try {
      await returnCvs.mutateAsync({
        items: rows.map((r) => ({ referralId: r.referralId, reason: reasonFor(r) })),
        note: note.trim() || undefined,
        emailQ2,
      });
      toast.success('Returned to Q2', `${cvs(n)} · ${emailQ2 ? `status mail sent to ${batch.referredBy}` : 'no mail sent'}`);
      onClose();
      navigate('/q3/returned');
    } catch (err) {
      toast.error('Could not return the CVs', getErrorMessage(err));
    }
  }

  return (
    <Q3Modal
      open
      onClose={onClose}
      title="Return CVs to Q2"
      subtitle={`Batch ${batch.batchId} · referred by ${batch.referredBy} (Q2)`}
      footer={
        <>
          <Q3Button onClick={onClose} disabled={returnCvs.isPending}>
            Cancel
          </Q3Button>
          <Q3Button variant="primary" icon={Undo2} loading={returnCvs.isPending} disabled={!n} onClick={submit}>
            Return {cvs(n)} to Q2
          </Q3Button>
        </>
      }
    >
      <div className="space-y-4">
        <section>
          <SectionLabel>Going back to Q2 ({n})</SectionLabel>
          <ul className="mt-2 space-y-2">
            {rows.map((r) => (
              <li key={r.referralId} className="flex items-center gap-2.5 rounded-[10px] border border-q3-line px-[11px] py-[9px]">
                <Avatar name={r.name} size={30} />
                <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold leading-4 text-q3-ink">{r.name}</span>
                {r.hasCv ? (
                  <Pill tone="gray" dot={false}>
                    Not selected for this role
                  </Pill>
                ) : (
                  <Pill tone="amber" dot={false}>
                    CV missing
                  </Pill>
                )}
              </li>
            ))}
          </ul>
        </section>

        <fieldset>
          <legend>
            <SectionLabel>Reason</SectionLabel>
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {REASONS.map((r) => {
              const on = reasons.includes(r);
              return (
                <button
                  key={r}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(r)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12.5px] leading-[15px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
                    on
                      ? 'border-q3-blue bg-q3-blue-soft font-semibold text-q3-blue'
                      : 'border-q3-line bg-q3-surface font-medium text-q3-ink-soft hover:bg-q3-field',
                  )}
                >
                  {r}
                </button>
              );
            })}
          </div>
          {reasonError && (
            <p role="alert" className="mt-1.5 text-xs text-q3-red">
              Pick at least one reason.
            </p>
          )}
        </fieldset>

        <div>
          <label htmlFor="q3-return-note">
            <SectionLabel>Note to Q2</SectionLabel>
          </label>
          <textarea
            id="q3-return-note"
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What should Q2 fix or know before re-referring?"
            className={cn(fieldClass, 'mt-2 min-h-[52px] resize-y')}
          />
        </div>

        <Q3Checkbox
          size={16}
          checked={emailQ2}
          onChange={setEmailQ2}
          label={
            <span className="text-[12.5px] font-medium leading-[15px] text-q3-ink-soft">
              Email the status update to {batch.referredBy} (Q2)
            </span>
          }
        />
      </div>
    </Q3Modal>
  );
}
