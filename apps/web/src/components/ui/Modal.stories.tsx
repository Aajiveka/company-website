import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Modal } from './Modal';
import { Button } from './Button';

const meta: Meta<typeof Modal> = {
  title: 'UI/Modal',
  component: Modal,
  tags: ['autodocs'],
  argTypes: {
    open: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<typeof Modal>;

export const Default: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Modal Title',
    children: <p className="text-sm text-gray-600">This is the modal body content.</p>,
  },
};

export const WithActions: Story = {
  args: {
    open: true,
    onClose: () => {},
    title: 'Confirm Action',
    children: (
      <div className="space-y-4">
        <p className="text-sm text-gray-600">Are you sure you want to proceed?</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm">Cancel</Button>
          <Button variant="primary" size="sm">Confirm</Button>
        </div>
      </div>
    ),
  },
};

function InteractiveModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Open Modal</Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Interactive Modal">
        <p className="text-sm text-gray-600">Click the X or press Escape to close.</p>
      </Modal>
    </>
  );
}

export const Interactive: Story = {
  render: () => <InteractiveModal />,
};

export const WithoutTitle: Story = {
  args: {
    open: true,
    onClose: () => {},
    children: <p className="text-sm text-gray-600">This modal has no visible title (uses sr-only fallback).</p>,
  },
};
