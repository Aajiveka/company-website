import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * The Q3 dialog (Figma "Overlays · modals"): a 16px-radius white card over a #0B1020 @ 45%
 * scrim, a 17px title with a 12.5px subtitle and a 20px close glyph, a padded body, and a
 * hairline-divided footer with the actions right-aligned.
 *
 * On Radix for the same reason Q1Modal is — focus trap, focus restore, Esc, scroll lock —
 * without the generic Modal's own title bar.
 */
export function Q3Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 560,
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
  className?: string;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-q3-overlay" />
        <Dialog.Content
          style={{ maxWidth: width }}
          className={cn(
            'fixed left-1/2 top-1/2 z-[1001] flex max-h-[92vh] w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col',
            'rounded-2xl bg-q3-surface shadow-q3-modal outline-none',
            className,
          )}
        >
          <div className="flex items-start gap-3 border-b border-q3-line px-6 py-5">
            <div className="min-w-0 flex-1">
              <Dialog.Title className="text-[17px] font-semibold leading-[21px] text-q3-ink">{title}</Dialog.Title>
              {subtitle ? (
                <Dialog.Description className="mt-[3px] text-[12.5px] leading-[15px] text-q3-muted">{subtitle}</Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{typeof title === 'string' ? title : 'Dialog'}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="shrink-0 rounded-md p-0.5 text-q3-muted outline-none transition hover:bg-q3-chip hover:text-q3-ink focus-visible:ring-2 focus-visible:ring-q3-blue/40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-q3-line px-6 py-4">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
