import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle } from './Card';

const meta: Meta<typeof Card> = {
  title: 'UI/Card',
  component: Card,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: 'This is a basic card with some content inside.',
  },
};

export const WithTitle: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
      </CardHeader>
      <p className="text-sm text-gray-600">Card body content goes here.</p>
    </Card>
  ),
};

export const WithCustomContent: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Job Applications</CardTitle>
        <span className="text-sm text-gray-500">Last 30 days</span>
      </CardHeader>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Total Applications</span>
          <span className="font-semibold">24</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Interviews Scheduled</span>
          <span className="font-semibold">5</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Offers Received</span>
          <span className="font-semibold">2</span>
        </div>
      </div>
    </Card>
  ),
};
