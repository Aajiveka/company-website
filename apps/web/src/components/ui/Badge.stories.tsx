import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'UI/Badge',
  component: Badge,
  tags: ['autodocs'],
  argTypes: {
    tone: {
      control: 'select',
      options: ['gray', 'blue', 'green', 'amber', 'red', 'purple'],
    },
  },
};
export default meta;
type Story = StoryObj<typeof Badge>;

export const Gray: Story = {
  args: { tone: 'gray', children: 'Closed' },
};

export const Blue: Story = {
  args: { tone: 'blue', children: 'Applied' },
};

export const Green: Story = {
  args: { tone: 'green', children: 'Active' },
};

export const Amber: Story = {
  args: { tone: 'amber', children: 'Pending' },
};

export const Red: Story = {
  args: { tone: 'red', children: 'Rejected' },
};

export const Purple: Story = {
  args: { tone: 'purple', children: 'Interview' },
};
