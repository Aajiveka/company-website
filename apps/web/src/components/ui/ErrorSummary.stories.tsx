import type { Meta, StoryObj } from '@storybook/react';
import { ErrorSummary } from './ErrorSummary';
import type { FieldErrors } from 'react-hook-form';

const meta: Meta<typeof ErrorSummary> = {
  title: 'UI/ErrorSummary',
  component: ErrorSummary,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof ErrorSummary>;

const sampleErrors: FieldErrors = {
  email: { type: 'required', message: 'Email is required' },
  password: { type: 'minLength', message: 'Password must be at least 8 characters' },
  name: { type: 'required', message: 'Name is required' },
};

export const WithMultipleErrors: Story = {
  args: {
    errors: sampleErrors,
  },
};

export const WithLabels: Story = {
  args: {
    errors: sampleErrors,
    labels: {
      email: 'Email Address',
      password: 'Password',
      name: 'Full Name',
    },
  },
};

export const WithCustomHeading: Story = {
  args: {
    errors: sampleErrors,
    heading: 'There were problems with your submission:',
  },
};

export const SingleError: Story = {
  args: {
    errors: {
      email: { type: 'pattern', message: 'Please enter a valid email address' },
    } as FieldErrors,
  },
};

export const NoErrors: Story = {
  args: {
    errors: {},
  },
};
