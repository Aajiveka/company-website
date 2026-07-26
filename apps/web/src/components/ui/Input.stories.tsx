import type { Meta, StoryObj } from '@storybook/react';
import { Input } from './Input';

const meta: Meta<typeof Input> = {
  title: 'UI/Input',
  component: Input,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {},
};

export const WithLabel: Story = {
  args: { label: 'Email Address' },
};

export const WithPlaceholder: Story = {
  args: { label: 'Full Name', placeholder: 'Enter your full name' },
};

export const Required: Story = {
  args: { label: 'Email', required: true, placeholder: 'you@example.com' },
};

export const WithError: Story = {
  args: { label: 'Email', error: 'Please enter a valid email address', value: 'not-an-email' },
};

export const Disabled: Story = {
  args: { label: 'Username', disabled: true, value: 'john_doe' },
};
