import type { Meta, StoryObj } from '@storybook/react';
import { Mail } from 'lucide-react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'outline', 'ghost', 'danger', 'accent'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: { children: 'Primary Button', variant: 'primary' },
};

export const Secondary: Story = {
  args: { children: 'Secondary Button', variant: 'secondary' },
};

export const Danger: Story = {
  args: { children: 'Delete', variant: 'danger' },
};

export const Ghost: Story = {
  args: { children: 'Ghost Button', variant: 'ghost' },
};

export const Outline: Story = {
  args: { children: 'Outline Button', variant: 'outline' },
};

export const Accent: Story = {
  args: { children: 'Accent Button', variant: 'accent' },
};

export const Small: Story = {
  args: { children: 'Small', size: 'sm' },
};

export const Medium: Story = {
  args: { children: 'Medium', size: 'md' },
};

export const Large: Story = {
  args: { children: 'Large', size: 'lg' },
};

export const Loading: Story = {
  args: { children: 'Saving...', isLoading: true },
};

export const Disabled: Story = {
  args: { children: 'Disabled', disabled: true },
};

export const WithIcon: Story = {
  args: {
    children: (
      <>
        <Mail className="h-4 w-4" />
        Send Email
      </>
    ),
  },
};
