import type { Meta, StoryObj } from '@storybook/react';
import FormField from './FormField';

const meta: Meta<typeof FormField> = {
  title: 'UI/FormField',
  component: FormField,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Full Name',
    children: (
      <input
        type="text"
        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none"
        placeholder="Enter your name"
      />
    ),
  },
};

export const Required: Story = {
  args: {
    label: 'Email Address',
    required: true,
    children: (
      <input
        type="email"
        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none"
        placeholder="you@example.com"
      />
    ),
  },
};

export const WithError: Story = {
  args: {
    label: 'Email Address',
    required: true,
    touched: true,
    error: 'Please enter a valid email address',
    children: (
      <input
        type="email"
        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none"
        value="not-valid"
        readOnly
      />
    ),
  },
};

export const WithSuccess: Story = {
  args: {
    label: 'Username',
    touched: true,
    children: (
      <input
        type="text"
        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none"
        value="john_doe"
        readOnly
      />
    ),
  },
};

export const WithHint: Story = {
  args: {
    label: 'Password',
    required: true,
    hint: 'Must be at least 8 characters with one uppercase letter.',
    children: (
      <input
        type="password"
        className="h-10 w-full rounded-md border border-gray-300 px-3 text-sm outline-none"
        placeholder="Enter password"
      />
    ),
  },
};
