import type { Meta, StoryObj } from '@storybook/react';
import AnimatedCounter from './AnimatedCounter';

const meta: Meta<typeof AnimatedCounter> = {
  title: 'Components/AnimatedCounter',
  component: AnimatedCounter,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof AnimatedCounter>;

export const Default: Story = {
  args: { end: 100 },
};

export const LargeNumber: Story = {
  args: { end: 25000, duration: 2000 },
};

export const WithPrefix: Story = {
  args: { end: 500, prefix: '$' },
};

export const WithSuffix: Story = {
  args: { end: 98, suffix: '%' },
};

export const WithPrefixAndSuffix: Story = {
  args: { end: 1200, prefix: '$', suffix: '+' },
};

export const SlowAnimation: Story = {
  args: { end: 50, duration: 3000 },
};

export const StyledCounter: Story = {
  args: {
    end: 10000,
    duration: 1500,
    className: 'text-4xl font-bold text-primary',
  },
};
