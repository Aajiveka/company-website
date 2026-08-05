import { Pencil, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui';
import { cn } from '@/lib/cn';

/**
 * Shared furniture for the profile page.
 *
 * Every section is the same object: a titled card, an inline edit affordance, and a dialog
 * that saves one section on its own. Keeping the shell here is what makes the sections
 * readable — otherwise each of the twelve repeats forty lines of card/pencil/dialog wiring.
 */

export interface SectionProps {
  /** Anchor target for the quick-links rail. */
  id: string;
  title: string;
  /** Pencil beside the title, for sections that always have something to edit. */
  onEdit?: () => void;
  /** Right-hand "Add …" action, for repeating sections. */
  addLabel?: string;
  onAdd?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Section({ id, title, onEdit, addLabel, onAdd, children, className }: SectionProps) {
  const { t } = useTranslation('dashboard');
  return (
    <Card id={id} className={cn('scroll-mt-24', className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-navy">
          {title}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              aria-label={t('profile.editSection', { section: title })}
              className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
        </h2>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            {addLabel}
          </button>
        )}
      </div>
      {children}
    </Card>
  );
}

/** The "nothing here yet" line, doubling as the call to action. */
export function EmptyHint({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  if (!onClick) return <p className="text-sm text-gray-500 dark:text-gray-400">{children}</p>;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm text-primary hover:underline"
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}

/** A label-above-value pair, as used by the career-profile and personal-details grids. */
export function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="font-medium text-navy dark:text-gray-100">{value || '—'}</p>
    </div>
  );
}

/** Small pencil used on individual rows inside a repeating section. */
export function RowEdit({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-primary dark:hover:bg-gray-700"
    >
      <Pencil className="h-3.5 w-3.5" />
    </button>
  );
}
