import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from './Breadcrumbs';

const meta: Meta<typeof Breadcrumbs> = {
  title: 'UI/Breadcrumbs',
  component: Breadcrumbs,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof Breadcrumbs>;

export const WithLinks: Story = {
  args: {
    items: [
      { label: 'Home', to: '/' },
      { label: 'Jobs', to: '/jobs' },
      { label: 'Software Engineer' },
    ],
  },
};

export const TwoLevels: Story = {
  args: {
    items: [
      { label: 'Dashboard', to: '/dashboard' },
      { label: 'Profile' },
    ],
  },
};

export const CurrentPageOnly: Story = {
  args: {
    items: [{ label: 'Home' }],
  },
};

export const DeepNesting: Story = {
  args: {
    items: [
      { label: 'Home', to: '/' },
      { label: 'Candidates', to: '/candidates' },
      { label: 'Profile', to: '/candidates/123' },
      { label: 'CV Manager' },
    ],
  },
};
