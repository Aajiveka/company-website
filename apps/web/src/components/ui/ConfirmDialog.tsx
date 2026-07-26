import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { Button } from './Button';

export interface ConfirmDialogProps {
  /** Whether the dialog is currently open. */
  isOpen: boolean;
  /** Dialog heading. */
  title: string;
  /** Body text explaining the action. */
  message: string;
  /** Label for the confirm button. Defaults to common confirm label. */
  confirmLabel?: string;
  /** Label for the cancel button. Defaults to common cancel label. */
  cancelLabel?: string;
  /** Visual variant that controls the confirm button style. */
  variant?: 'danger' | 'warning' | 'info';
  /** Called when the user confirms. */
  onConfirm: () => void;
  /** Called when the user cancels or closes the dialog. */
  onCancel: () => void;
  /** Whether the confirm action is in progress. */
  isLoading?: boolean;
}

const CONFIRM_VARIANT: Record<string, 'danger' | 'primary' | 'accent'> = {
  danger: 'danger',
  warning: 'accent',
  info: 'primary',
};

/**
 * A reusable confirmation dialog built on top of the existing Modal and Button
 * components. Use the `variant` prop to control the visual emphasis of the
 * confirm button (red for danger, accent for warning, primary for info).
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'danger',
  onConfirm,
  onCancel,
  isLoading,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');

  return (
    <Modal open={isOpen} onClose={onCancel} title={title}>
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>
            {cancelLabel ?? t('actions.cancel')}
          </Button>
          <Button
            variant={CONFIRM_VARIANT[variant]}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmLabel ?? t('actions.confirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
