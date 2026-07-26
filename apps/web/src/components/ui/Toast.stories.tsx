import type { Meta, StoryObj } from '@storybook/react';
import { ToastProvider, useToast } from './Toast';
import { Button } from './Button';

function ToastDemo({ kind, message }: { kind: 'success' | 'error' | 'info'; message: string }) {
  const { notify } = useToast();
  return (
    <Button onClick={() => notify(message, kind)} variant="primary" size="sm">
      Show {kind} toast
    </Button>
  );
}

const meta: Meta = {
  title: 'UI/Toast',
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <Story />
      </ToastProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj;

export const Success: Story = {
  render: () => <ToastDemo kind="success" message="Profile saved successfully!" />,
};

export const Error: Story = {
  render: () => <ToastDemo kind="error" message="Failed to save changes." />,
};

export const Info: Story = {
  render: () => <ToastDemo kind="info" message="Your session will expire soon." />,
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <ToastDemo kind="success" message="Operation completed." />
      <ToastDemo kind="error" message="Something went wrong." />
      <ToastDemo kind="info" message="Here is some info." />
    </div>
  ),
};
