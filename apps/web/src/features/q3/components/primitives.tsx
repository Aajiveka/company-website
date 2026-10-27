import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Check, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TONE_PILL, TONE_TEXT, avatarTone, initialsOf, type Tone } from '../q3.format';

/**
 * Shared Q3 atoms. Every size and colour is read off the Figma "Q3" nodes — card radius 14,
 * buttons 36/29px with a 7px icon gap, pills 23px with a 6px dot, table heads 11px tracked.
 */

/** The white, hairline-bordered card every Q3 surface is built from. */
export function Q3Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[14px] border border-q3-line bg-q3-surface', className)} {...rest} />;
}

/** A card's title row: "Candidate Pipeline / 7 candidates · sorted by next due". */
export function CardHeader({
  title,
  subtitle,
  children,
  className,
  bordered,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2.5 px-5 py-[18px]',
        bordered && 'border-b border-q3-line',
        className,
      )}
    >
      {/* The 220px floor makes the controls wrap below the title on a phone instead of
          squeezing it into a one-word column. */}
      <div className="min-w-[220px] flex-1">
        <h2 className="text-base font-semibold leading-[19px] text-q3-ink">{title}</h2>
        {subtitle && <p className="mt-[3px] text-[12.5px] leading-[15px] text-q3-muted">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'soft' | 'ghost' | 'danger';
type ButtonSize = 'md' | 'sm';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-q3-blue text-white hover:bg-q3-blue-hover disabled:bg-q3-blue/45',
  secondary: 'border border-q3-line bg-q3-surface text-q3-ink-soft hover:bg-q3-field disabled:text-q3-muted-light',
  soft: 'bg-q3-blue-soft text-q3-blue hover:bg-q3-blue/15 disabled:opacity-55',
  ghost: 'text-q3-ink-soft hover:bg-q3-chip disabled:opacity-55',
  danger: 'border border-q3-line bg-q3-surface text-q3-red hover:bg-q3-red-soft disabled:opacity-55',
};

const BUTTON_SIZE: Record<ButtonSize, string> = {
  md: 'min-h-9 gap-[7px] px-4 py-2.5 text-[13px] [&_svg]:h-4 [&_svg]:w-4',
  sm: 'min-h-[27px] gap-[7px] px-[11px] py-1.5 text-xs [&_svg]:h-3.5 [&_svg]:w-3.5',
};

export interface Q3ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: LucideIcon;
  loading?: boolean;
}

export const Q3Button = forwardRef<HTMLButtonElement, Q3ButtonProps>(function Q3Button(
  { variant = 'secondary', size = 'md', icon: Icon, loading, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-lg font-semibold leading-none whitespace-nowrap transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40 disabled:cursor-not-allowed',
        BUTTON_VARIANT[variant],
        BUTTON_SIZE[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : Icon ? <Icon aria-hidden /> : null}
      {children}
    </button>
  );
});

/** A status pill with its leading dot: "● Interview", "● Awaiting result". */
export function Pill({
  tone,
  children,
  dot = true,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-[15px] whitespace-nowrap',
        TONE_PILL[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

/** The ROUND column's outlined tag: "R2", "Final", "—". */
export function RoundTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md border border-q3-line px-2 py-[3px] text-xs font-semibold leading-[15px] text-q3-ink-soft">
      {children}
    </span>
  );
}

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold', TONE_PILL[avatarTone(name)], className)}
      style={{ width: size, height: size, fontSize: size >= 48 ? 17 : size >= 36 ? 13 : size >= 30 ? 12 : 11 }}
      aria-hidden
    >
      {initialsOf(name)}
    </span>
  );
}

/** A square tinted icon tile — KPI cards (38px) and list rows (32px). */
export function IconTile({
  icon: Icon,
  tone,
  size = 38,
  className,
}: {
  icon: LucideIcon;
  tone: Tone;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', TONE_PILL[tone], className)}
      style={{ width: size, height: size, borderRadius: size >= 38 ? 9 : 8 }}
      aria-hidden
    >
      <Icon style={{ width: size >= 38 ? 18 : 16, height: size >= 38 ? 18 : 16 }} />
    </span>
  );
}

/** One of the four KPI cards: icon tile, "5 from Q2", title, help line. */
export function KpiCard({
  icon,
  tone,
  value,
  badge,
  badgeTone,
  title,
  help,
  to,
  loading,
}: {
  icon: LucideIcon;
  tone: Tone;
  value: number;
  badge?: string | null;
  badgeTone?: Tone;
  title: string;
  help: string;
  to?: string;
  loading?: boolean;
}) {
  const body = (
    <>
      <IconTile icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {loading ? (
            <span className="inline-block h-[31px] w-8 animate-pulse rounded bg-q3-chip" />
          ) : (
            <span className="text-[26px] font-bold leading-[31px] tracking-[-0.5px] text-q3-ink">{value}</span>
          )}
          {badge && !loading && (
            <span className={cn('truncate text-[11.5px] font-semibold', TONE_TEXT[badgeTone ?? tone])}>{badge}</span>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm font-semibold leading-[17px] text-q3-ink">{title}</p>
        <p className="mt-0.5 truncate text-xs leading-[15px] text-q3-muted">{help}</p>
      </div>
    </>
  );
  const cls =
    'flex items-start gap-3.5 rounded-[14px] border border-q3-line bg-q3-surface p-[18px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40';
  return to ? (
    <Link to={to} className={cn(cls, 'hover:border-q3-line-strong')}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** A filter chip — the stage tabs ("All · Referred · …") and the counted tabs ("In review 9"). */
export function TabChip({
  active,
  onClick,
  children,
  count,
  variant = 'filled',
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  count?: number;
  /** 'filled' = grey chips (pipeline); 'outlined' = white chips with a count (Company Review). */
  variant?: 'filled' | 'outlined';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-2 rounded-lg px-[11px] py-1.5 text-[12.5px] leading-[15px] transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
        active
          ? 'bg-q3-blue font-semibold text-white'
          : variant === 'filled'
            ? 'bg-q3-chip font-medium text-q3-ink-soft hover:bg-q3-track'
            : 'border border-q3-line bg-q3-surface font-medium text-q3-ink-soft hover:bg-q3-field',
      )}
    >
      {children}
      {count != null && (
        <span
          className={cn(
            'rounded-full px-[7px] py-px text-[11px] font-semibold',
            active ? 'bg-white/25 text-white' : 'bg-q3-chip text-q3-ink-soft',
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/** 11px, uppercase, tracked — section labels and table heads. */
export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('text-[11px] font-semibold uppercase leading-[13px] tracking-[0.6px] text-q3-muted', className)}>
      {children}
    </p>
  );
}

/** The 18px (or 16px) blue checkbox. A real <input>, styled. */
export function Q3Checkbox({
  checked,
  onChange,
  disabled,
  label,
  size = 18,
  className,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  size?: 16 | 18;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <label className={cn('inline-flex items-center gap-2', disabled ? 'cursor-not-allowed' : 'cursor-pointer', className)}>
      <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
        <input
          type="checkbox"
          className="peer absolute inset-0 h-full w-full cursor-[inherit] opacity-0"
          checked={checked}
          disabled={disabled}
          aria-label={ariaLabel}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          className={cn(
            'pointer-events-none flex h-full w-full items-center justify-center transition peer-focus-visible:ring-2 peer-focus-visible:ring-q3-blue/40',
            size === 18 ? 'rounded-[5px]' : 'rounded',
            disabled
              ? 'border border-q3-line bg-q3-chip'
              : checked
                ? 'bg-q3-blue text-white'
                : 'border-[1.5px] border-q3-line-strong bg-q3-surface',
          )}
          aria-hidden
        >
          {checked && !disabled && <Check className={size === 18 ? 'h-3 w-3' : 'h-2.5 w-2.5'} strokeWidth={3} />}
        </span>
      </span>
      {label}
    </label>
  );
}

/** The green on/off switch in the Record decision modal. */
export function Q3Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-[22px] w-9 shrink-0 items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-green/40',
        'disabled:cursor-not-allowed disabled:opacity-55',
        checked ? 'bg-q3-green' : 'bg-q3-line-strong',
      )}
    >
      <span
        className={cn('h-[18px] w-[18px] rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')}
      />
    </button>
  );
}

/**
 * The horizontal progress stepper (Schedule Interview's four steps, Documents & Offer's eight).
 * Done steps are a green tick, the current step a filled blue number, later steps outlined.
 */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className={cn('flex min-w-0 items-center gap-2', i < steps.length - 1 && 'flex-1')}>
            <span
              className={cn(
                'inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                done && 'bg-q3-green text-white',
                active && 'bg-q3-blue text-white',
                !done && !active && 'border border-q3-line-strong text-q3-muted',
              )}
              aria-hidden
            >
              {done ? <Check className="h-3 w-3" strokeWidth={3} /> : n}
            </span>
            <span
              className={cn(
                'whitespace-nowrap text-[13px] leading-4',
                active ? 'font-semibold text-q3-ink' : done ? 'font-medium text-q3-ink-soft' : 'text-q3-muted',
              )}
              aria-current={active ? 'step' : undefined}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span className={cn('hidden h-0.5 min-w-6 flex-1 rounded-full sm:block', done ? 'bg-q3-green' : 'bg-q3-track')} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A table header row: 11px tracked labels on the #FAFBFC band. */
export function TableHead({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'border-y border-q3-line bg-q3-head px-5 py-2.5 text-[11px] font-semibold uppercase leading-[13px] tracking-[0.6px] text-q3-muted',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Loading rows for a table or list. */
export function SkeletonRows({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('divide-y divide-q3-line', className)} aria-busy>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-5 py-[13px]">
          <span className="h-9 w-9 animate-pulse rounded-full bg-q3-chip" />
          <div className="flex-1 space-y-1.5">
            <span className="block h-3.5 w-1/3 animate-pulse rounded bg-q3-chip" />
            <span className="block h-3 w-1/4 animate-pulse rounded bg-q3-chip" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** An in-card empty or error state. */
export function CardMessage({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      {Icon && <IconTile icon={Icon} tone="gray" className="mb-3" />}
      <p className="text-sm font-semibold text-q3-ink">{title}</p>
      {body && <p className="mt-1 max-w-sm text-[12.5px] text-q3-muted">{body}</p>}
      {action && (
        <Q3Button size="sm" variant="soft" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Q3Button>
      )}
    </div>
  );
}

/** A labelled text field in Q3's style (#FAFBFC fill, #E7E9F0 hairline, radius 8). */
export const fieldClass =
  'w-full rounded-lg border border-q3-line bg-q3-head px-3 py-2.5 text-[12.5px] leading-[15px] text-q3-ink-soft placeholder:text-q3-muted-light outline-none transition focus:border-q3-blue focus:bg-q3-surface focus:ring-2 focus:ring-q3-blue/15 aria-[invalid=true]:border-q3-red';
