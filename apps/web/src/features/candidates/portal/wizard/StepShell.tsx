import type { ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Btn } from '../components/primitives';

/* ------------------------------------------------------------------ */
/* Step chrome                                                         */
/* ------------------------------------------------------------------ */

export interface StepProps {
  onBack: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  /** Rendered under the footer buttons when a save fails. */
  stepIndex: number;
  totalSteps: number;
}

/**
 * The white wizard card: numbered heading, the step's fields, then the shared
 * footer with the progress dots and Back / Save & Continue.
 * (Figma: r=12, border #D1DDF0, header + body 16/20 padding, footer border-top #E8F0FE.)
 */
export function StepShell({
  number,
  title,
  blurb,
  children,
  onSubmit,
  onBack,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
  saving,
  error,
}: {
  number: number;
  title: string;
  blurb: string;
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
  stepIndex: number;
  totalSteps: number;
  saving: boolean;
  error?: string | null;
}) {
  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="rounded-xl border border-aj-line bg-white shadow-aj-card dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-aj-blue text-[13px] font-bold text-white">
            {number}
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-slate-800 dark:text-gray-100">{title}</h2>
            <p className="text-[13px] text-slate-500 dark:text-gray-400">{blurb}</p>
          </div>
        </div>

        <div className="mt-5">{children}</div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-aj-line-soft px-5 py-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          {!isFirst && (
            <Btn variant="ghost" onClick={onBack}>
              <ArrowLeft className="size-4" aria-hidden /> Back
            </Btn>
          )}
          <StepDots current={stepIndex} total={totalSteps} />
        </div>

        <div className="flex items-center gap-3">
          {error && <p className="text-xs text-red-600">{error}</p>}
          <Btn type="submit" disabled={saving}>
            {saving ? 'Saving…' : isLast ? 'Complete Profile' : 'Save & Continue'}
            {saving ? null : isLast ? (
              <Check className="size-4" aria-hidden />
            ) : (
              <ArrowRight className="size-4" aria-hidden />
            )}
          </Btn>
        </div>
      </div>
    </form>
  );
}

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="hidden items-center gap-1.5 sm:flex" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-1 rounded-full transition-all',
            i === current ? 'w-6 bg-aj-blue' : i < current ? 'w-3 bg-blue-300' : 'w-3 bg-aj-line',
          )}
        />
      ))}
    </div>
  );
}

/** A saved row in a repeatable step (experience, education, projects). */
export function SavedRow({
  title,
  subtitle,
  meta,
  onEdit,
  onDelete,
  deleting,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-aj-line bg-aj-surface-soft px-3.5 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">{title}</p>
        {subtitle && <p className="truncate text-xs text-aj-blue">{subtitle}</p>}
        {meta && <p className="mt-0.5 truncate text-xs text-slate-500">{meta}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`Remove ${title}`}
          className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
        >
          <Trash2 className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** "＋ Add another …" link that opens a blank sub-form. */
export function AddAnother({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-aj-blue transition-colors hover:text-aj-blue-hover"
    >
      <Plus className="size-4" aria-hidden />
      {label}
    </button>
  );
}

/** Two- and three-up field grids, matching the wizard's column rhythm. */
export function FieldGrid({ cols = 3, children }: { cols?: 2 | 3; children: ReactNode }) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', cols === 3 && 'lg:grid-cols-3')}>{children}</div>
  );
}
