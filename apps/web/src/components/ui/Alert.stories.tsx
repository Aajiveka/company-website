import type { Meta, StoryObj } from '@storybook/react';
import { Alert } from './Alert';

const meta: Meta<typeof Alert> = {
  title: 'UI/Alert',
  component: Alert,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['info', 'success', 'warning', 'error'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof Alert>;

export const Info: Story = {
  args: { variant: 'info', children: 'This is an informational message.' },
};

export const Success: Story = {
  args: { variant: 'success', children: 'Your profile has been updated successfully.' },
};

export const Warning: Story = {
  args: { variant: 'warning', children: 'Your session will expire in 5 minutes.' },
};

export const Error: Story = {
  args: { variant: 'error', children: 'Failed to save changes. Please try again.' },
};
