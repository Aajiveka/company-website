import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Radix Dialog behind the same props the app already passes.
 *
 * The hand-rolled version looked accessible — it set role="dialog" and aria-modal — but it
 * never trapped focus, so Tab walked straight out of the open dialog into the page behind
 * it, and focus was never returned to the trigger on close. Radix handles focus trapping,
 * focus restore, Esc, scroll lock and inert-ing the background.
 */
export function Modal({ open, onClose, title, children, className }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-black/50" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-[1001] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-2xl bg-white p-4 shadow-xl outline-none dark:bg-gray-900 dark:ring-1 dark:ring-gray-800 sm:p-6',
            className,
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            {title ? (
              <Dialog.Title className="text-lg font-semibold text-navy dark:text-gray-100 sm:text-xl">{title}</Dialog.Title>
            ) : (
              // Radix requires a title for screen readers even where the design shows none.
              <Dialog.Title className="sr-only">Dialog</Dialog.Title>
            )}
            <Dialog.Close
              className="ml-auto rounded-full p-1 text-gray-400 outline-none transition hover:bg-gray-100 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-primary/40"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
