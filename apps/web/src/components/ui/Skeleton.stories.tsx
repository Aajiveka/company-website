import type { Meta, StoryObj } from '@storybook/react';
import { Skeleton, CardSkeleton, ProfileSkeleton } from './Skeleton';

const meta: Meta<typeof Skeleton> = {
  title: 'UI/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Skeleton>;

export const Default: Story = {
  args: { className: 'h-4 w-48' },
};

export const Circle: Story = {
  args: { className: 'h-12 w-12 rounded-full' },
};

export const Wide: Story = {
  args: { className: 'h-4 w-full' },
};

export const Tall: Story = {
  args: { className: 'h-32 w-full' },
};

export const MultipleLines: Story = {
  render: () => (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  ),
};

export const CardSkeletonStory: Story = {
  name: 'Card Skeleton',
  render: () => <CardSkeleton />,
};

export const ProfileSkeletonStory: Story = {
  name: 'Profile Skeleton',
  render: () => <ProfileSkeleton />,
};
