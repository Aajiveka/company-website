import { Modal } from '@/components/ui/Modal';
import { PrimaryButton, SecondaryButton } from '@/employer/components/Cards/ui';
import { cn } from '@/lib/cn';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** danger = rose confirm button (delete) */
  tone?: 'primary' | 'danger';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** In-app confirm modal — replaces browser `window.confirm`. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} className="max-w-sm">
      {description && <p className="text-xs leading-relaxed text-slate-600">{description}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <SecondaryButton type="button" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </SecondaryButton>
        <PrimaryButton
          type="button"
          disabled={loading}
          onClick={onConfirm}
          className={cn(tone === 'danger' && '!bg-rose-600 hover:!bg-rose-700')}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
