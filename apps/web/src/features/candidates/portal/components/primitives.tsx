import { forwardRef, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Building blocks for the candidate portal, matching the "Aajiveka UI" Figma.
 *
 * These sit alongside `components/ui/*` rather than replacing it: the shared kit is
 * skinned for the teal public site and is used by ~50 routes that have no design
 * coverage, so re-skinning it in place would have restyled all of them. Everything
 * here is scoped to the portal and built from the `aj-*` tokens.
 *
 * Figma reference values baked in below:
 *   card    r=12  bg #FFF  border #D1DDF0 0.8px  shadow 0 1 3 rgb(0 0 0 /.08)
 *   header  pad 16/20      border-b #E8F0FE 1px
 *   input   h=43 pad 10/14 r=8  border #D1DDF0  placeholder #94A3B8
 *   label   Inter 600 12/18 #475569
 *   button  pad 9/20 r=8   Inter 600 14/21
 */

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */

/** `id` doubles as the anchor for `/candidate/profile#employment`-style deep links. */
export function Card({ id, className, children }: { id?: string; className?: string; children: ReactNode }) {
  return (
    <div
      id={id}
      className={cn(
        'scroll-mt-24 rounded-xl border border-aj-line bg-white shadow-aj-card dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Card header — title on the left, an optional action (Edit / Add) on the right. */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 border-b border-aj-line-soft px-5 py-4 dark:border-gray-700',
        className,
      )}
    >
      <h2 className="font-display text-sm font-bold text-slate-800 dark:text-gray-100">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

/** The small blue "＋ Edit" / "＋ Add" affordance in card headers. */
export function CardAction({
  icon,
  label,
  onClick,
  type = 'button',
}: {
  icon?: ReactNode;
  label: string;
  onClick?: () => void;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="inline-flex shrink-0 items-center gap-1 rounded text-xs font-semibold text-aj-blue transition-colors hover:text-aj-blue-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aj-blue/40"
    >
      {icon}
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'onBlue' | 'onBlueOutline';

const BTN: Record<BtnVariant, string> = {
  primary: 'bg-aj-blue text-white shadow-aj-raised hover:bg-aj-blue-hover',
  secondary: 'border border-aj-line bg-white text-slate-600 hover:bg-aj-canvas dark:bg-gray-800 dark:text-gray-200',
  ghost: 'text-slate-500 hover:bg-aj-canvas hover:text-slate-700',
  danger: 'bg-red-600 text-white shadow-aj-raised hover:bg-red-700',
  onBlue: 'bg-white text-aj-blue shadow-aj-raised hover:bg-blue-50',
  onBlueOutline: 'border border-white/40 text-white hover:bg-white/10',
};

export interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  /** `pill` is the rounded-full hero button; `md` the standard 8px-radius form button. */
  shape?: 'md' | 'pill';
  block?: boolean;
}

export const Btn = forwardRef<HTMLButtonElement, BtnProps>(function Btn(
  { variant = 'primary', shape = 'md', block, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aj-blue/50',
        'disabled:pointer-events-none disabled:opacity-50',
        shape === 'pill' ? 'rounded-full' : 'rounded-lg',
        block && 'w-full',
        BTN[variant],
        className,
      )}
      {...rest}
    />
  );
});

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Label({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-xs font-semibold text-slate-600 dark:text-gray-300"
    >
      {children}
      {required && <span className="text-red-600"> *</span>}
    </label>
  );
}

/** Wraps a control with its label and (when present) its validation message. */
export function Field({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      )}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL =
  'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors ' +
  'placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-aj-ring focus:border-aj-blue ' +
  'disabled:bg-aj-canvas disabled:text-slate-400 ' +
  'dark:bg-gray-900 dark:text-gray-100 dark:placeholder:text-gray-500';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(CONTROL, invalid ? 'border-red-500' : 'border-aj-line dark:border-gray-700', className)}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, rows = 4, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        CONTROL,
        'resize-y leading-relaxed',
        invalid ? 'border-red-500' : 'border-aj-line dark:border-gray-700',
        className,
      )}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          CONTROL,
          'appearance-none pr-9',
          invalid ? 'border-red-500' : 'border-aj-line dark:border-gray-700',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
      />
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Chips, pills, tiles                                                 */
/* ------------------------------------------------------------------ */

/** Blue skill chip — `onRemove` turns it into a removable token. */
export function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-aj-blue dark:border-blue-900 dark:bg-blue-950">
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="text-aj-blue/60 transition-colors hover:text-red-600"
        >
          ×
        </button>
      )}
    </span>
  );
}

export type Tone = 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'slate';

const TONE: Record<Tone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-aj-blue',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-600',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  slate: 'border-slate-200 bg-slate-100 text-slate-600',
};

export function Pill({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        TONE[tone],
      )}
    >
      {children}
    </span>
  );
}

/** The tinted metric tile used by Profile Activity and the tracker summary row. */
export function StatTile({ value, label, tone = 'blue' }: { value: ReactNode; label: string; tone?: Tone }) {
  const surface: Record<Tone, string> = {
    blue: 'border-blue-100 bg-blue-50/70 text-aj-blue',
    green: 'border-emerald-100 bg-emerald-50/70 text-emerald-600',
    amber: 'border-orange-100 bg-orange-50/70 text-orange-500',
    red: 'border-red-100 bg-red-50/70 text-red-600',
    violet: 'border-violet-100 bg-violet-50/70 text-violet-600',
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
  };
  return (
    <div className={cn('rounded-xl border px-4 py-3.5 text-center', surface[tone])}>
      <div className="font-display text-2xl font-bold leading-tight">{value}</div>
      <div className="mt-0.5 text-xs text-slate-500 dark:text-gray-400">{label}</div>
    </div>
  );
}

/**
 * Square icon avatar — company / institution initial on cards.
 *
 * One letter for a company (the design's "S" for Stripe, "I" for Infosys); `letters={2}`
 * for people and institutions, where two initials are what distinguishes them.
 */
export function InitialAvatar({
  text,
  className,
  size = 'md',
  letters = 1,
}: {
  text: string;
  className?: string;
  size?: 'sm' | 'md';
  letters?: 1 | 2;
}) {
  const initials =
    letters === 1
      ? text.trim().slice(0, 1)
      : text
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join('');

  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-lg font-display font-bold text-white',
        size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm',
        className ?? 'bg-aj-blue',
      )}
    >
      {initials.toUpperCase()}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* States                                                              */
/* ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="mb-1 text-slate-300">{icon}</div>}
      <p className="font-display text-sm font-bold text-slate-700 dark:text-gray-200">{title}</p>
      {description && <p className="max-w-sm text-xs text-slate-500 dark:text-gray-400">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** Skeleton row used while a module's data loads. */
export function SkeletonRows({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-xl bg-aj-canvas dark:bg-gray-700" />
      ))}
    </div>
  );
}

/** Inline error with a retry, for a module whose query failed. */
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
      <p className="text-sm text-slate-600 dark:text-gray-300">{message}</p>
      {onRetry && (
        <Btn variant="secondary" onClick={onRetry}>
          Try again
        </Btn>
      )}
    </div>
  );
}
