import { cn } from '@/lib/cn';
import type { InterviewMode } from '../q3.types';

const INTERVIEW_MODES: InterviewMode[] = ['Virtual', 'Telephonic', 'Face-to-Face', 'Walk-in'];

/**
 * The INTERVIEW MODE segmented control (Company Review's shortlist panel). Without `onChange`
 * it is a read-out of the round's mode; with it, a radio group the setup modal edits.
 */
export function ModeSegmented({
  value,
  onChange,
  label = 'Interview mode',
}: {
  value: InterviewMode | null;
  onChange?: (mode: InterviewMode) => void;
  label?: string;
}) {
  const editable = !!onChange;
  return (
    <div
      role={editable ? 'radiogroup' : 'group'}
      aria-label={label}
      className="grid grid-cols-2 gap-[3px] rounded-[9px] bg-q3-chip p-[3px] sm:grid-cols-4"
    >
      {INTERVIEW_MODES.map((mode) => {
        const active = mode === value;
        const cls = cn(
          'flex min-h-7 items-center justify-center rounded-[7px] px-1 py-[7px] text-[11.5px] leading-[14px] whitespace-nowrap',
          active ? 'bg-q3-surface font-semibold text-q3-blue shadow-[0_1px_3px_rgb(18_26_51/0.10)]' : 'font-medium text-q3-muted',
        );
        return editable ? (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(mode)}
            className={cn(
              cls,
              'transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
              !active && 'hover:text-q3-ink-soft',
            )}
          >
            {mode}
          </button>
        ) : (
          <span key={mode} className={cls} aria-current={active || undefined}>
            {mode}
          </span>
        );
      })}
    </div>
  );
}
