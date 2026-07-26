import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import { ConfirmDialog } from './ConfirmDialog';
import { Button } from './Button';

// Minimal i18n instance for stories
const storyI18n = i18n.createInstance();
storyI18n.init({
  lng: 'en',
  resources: {
    en: {
      common: {
        actions: { confirm: 'Confirm', cancel: 'Cancel' },
      },
    },
  },
});

const meta: Meta<typeof ConfirmDialog> = {
  title: 'UI/ConfirmDialog',
  component: ConfirmDialog,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <I18nextProvider i18n={storyI18n}>
        <Story />
      </I18nextProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof ConfirmDialog>;

export const Danger: Story = {
  args: {
    isOpen: true,
    title: 'Delete Account',
    message: 'This action cannot be undone. All your data will be permanently deleted.',
    variant: 'danger',
    confirmLabel: 'Delete',
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const Warning: Story = {
  args: {
    isOpen: true,
    title: 'Unsaved Changes',
    message: 'You have unsaved changes. Are you sure you want to leave?',
    variant: 'warning',
    confirmLabel: 'Leave',
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const InfoVariant: Story = {
  args: {
    isOpen: true,
    title: 'Submit Application',
    message: 'Are you sure you want to submit this application?',
    variant: 'info',
    confirmLabel: 'Submit',
    onConfirm: () => {},
    onCancel: () => {},
  },
};

export const WithLoading: Story = {
  args: {
    isOpen: true,
    title: 'Delete Item',
    message: 'Deleting this item...',
    variant: 'danger',
    confirmLabel: 'Delete',
    isLoading: true,
    onConfirm: () => {},
    onCancel: () => {},
  },
};

function InteractiveConfirm() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete
      </Button>
      <ConfirmDialog
        isOpen={open}
        title="Confirm Deletion"
        message="This will permanently delete the record."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveConfirm />,
};
