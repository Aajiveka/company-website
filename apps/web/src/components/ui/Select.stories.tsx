import type { Meta, StoryObj } from '@storybook/react';
import { Select } from './Select';

const sampleOptions = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular' },
  { label: 'Svelte', value: 'svelte' },
];

const meta: Meta<typeof Select> = {
  title: 'UI/Select',
  component: Select,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: { options: sampleOptions },
};

export const WithLabel: Story = {
  args: { label: 'Framework', options: sampleOptions },
};

export const WithPlaceholder: Story = {
  args: { label: 'Framework', options: sampleOptions, placeholder: 'Choose a framework...' },
};

export const Required: Story = {
  args: { label: 'Framework', options: sampleOptions, placeholder: 'Select one', required: true },
};

export const WithError: Story = {
  args: { label: 'Framework', options: sampleOptions, error: 'This field is required' },
};

export const Disabled: Story = {
  args: { label: 'Framework', options: sampleOptions, disabled: true },
};
