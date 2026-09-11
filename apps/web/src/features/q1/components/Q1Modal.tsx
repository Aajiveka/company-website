import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Avatar } from './primitives';

/**
 * The Q1 dialog shell: avatar + title + subtitle header, a scrollable body, and a divided
 * footer holding Cancel and the primary action.
 *
 * Built on Radix directly rather than on `@/components/ui/Modal` because that component
 * always renders its own title row and close button above whatever it is given, which would
 * put an empty bar above this header. Radix still supplies focus trapping, focus restore,
 * Esc and scroll lock, so nothing accessible is given up by not reusing the wrapper.
 */
export function Q1Modal({
  open,
  onClose,
  title,
  subtitle,
  avatarName,
  avatarId,
  children,
  footer,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  avatarName?: string;
  avatarId?: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-q1-ink/50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[1001] flex max-h-[92vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-2xl border border-q1-line bg-q1-surface shadow-q1-pop outline-none dark:border-gray-700 dark:bg-gray-800',
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-q1-line p-5 dark:border-gray-700">
            {avatarName && <Avatar name={avatarName} id={avatarId ?? 0} className="h-10 w-10" />}
            <div className="min-w-0 flex-1">
              <Dialog.Title className="font-display text-lg font-bold text-q1-ink dark:text-white">
                {title}
              </Dialog.Title>
              {subtitle && (
                <Dialog.Description className="mt-0.5 text-sm text-q1-ink-soft dark:text-gray-300">
                  {subtitle}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="shrink-0 rounded-full p-1.5 text-q1-muted outline-none transition hover:bg-q1-chip hover:text-q1-ink focus-visible:ring-2 focus-visible:ring-q1-blue/40 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>

          {footer && (
            <div className="flex justify-end gap-2 border-t border-q1-line p-5 dark:border-gray-700">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** The two button styles the Q1 dialogs use. */
export function Q1Button({
  variant = 'primary',
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'success';
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variant === 'primary' &&
          'bg-q1-blue text-white hover:bg-q1-blue-hover focus-visible:ring-q1-blue/40',
        variant === 'success' &&
          'bg-q1-green text-white hover:brightness-95 focus-visible:ring-q1-green/40',
        variant === 'ghost' &&
          'border border-q1-line text-q1-ink-soft hover:bg-q1-chip focus-visible:ring-q1-blue/30 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700',
        className,
      )}
      {...rest}
    />
  );
}
