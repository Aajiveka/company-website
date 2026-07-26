import type { Meta, StoryObj } from '@storybook/react';
import { Settings, User, LogOut } from 'lucide-react';
import { Dropdown } from './Dropdown';

const meta: Meta<typeof Dropdown> = {
  title: 'UI/Dropdown',
  component: Dropdown,
  tags: ['autodocs'],
};
export default meta;
type Story = StoryObj<typeof Dropdown>;

export const Default: Story = {
  args: {
    trigger: (
      <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        Menu
      </button>
    ),
    items: [
      { label: 'Profile', onSelect: () => {} },
      { label: 'Settings', onSelect: () => {} },
      { label: 'Help', onSelect: () => {} },
    ],
  },
};

export const WithIcons: Story = {
  args: {
    trigger: (
      <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        Account
      </button>
    ),
    items: [
      { label: 'My Profile', onSelect: () => {}, icon: <User className="h-4 w-4" /> },
      { label: 'Settings', onSelect: () => {}, icon: <Settings className="h-4 w-4" /> },
      { label: 'Logout', onSelect: () => {}, icon: <LogOut className="h-4 w-4" />, danger: true },
    ],
  },
};

export const WithDangerItem: Story = {
  args: {
    trigger: (
      <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        Actions
      </button>
    ),
    items: [
      { label: 'Edit', onSelect: () => {} },
      { label: 'Duplicate', onSelect: () => {} },
      { label: 'Delete', onSelect: () => {}, danger: true },
    ],
  },
};

export const AlignLeft: Story = {
  args: {
    trigger: (
      <button className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
        Left-aligned
      </button>
    ),
    items: [
      { label: 'Option A', onSelect: () => {} },
      { label: 'Option B', onSelect: () => {} },
    ],
    align: 'left',
  },
};
