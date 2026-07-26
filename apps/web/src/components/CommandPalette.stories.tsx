import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import CommandPalette from './CommandPalette';

// Minimal i18n instance for stories
const storyI18n = i18n.createInstance();
storyI18n.init({
  lng: 'en',
  resources: {
    en: {
      common: {
        nav: { home: 'Home', findJobs: 'Find Jobs' },
        sidebar: {
          myProfile: 'My Profile',
          cvManager: 'CV Manager',
          appliedJobs: 'Applied Jobs',
          savedJobs: 'Saved Jobs',
          messages: 'Messages',
          postAJob: 'Post a Job',
          changePassword: 'Change Password',
        },
        breadcrumbs: { settings: 'Settings', notifications: 'Notifications' },
        actions: { search: 'Search' },
        commandPalette: {
          placeholder: 'Search commands...',
          noResults: 'No results found.',
          pages: 'Pages',
          actions: 'Actions',
        },
      },
    },
  },
});

const meta: Meta<typeof CommandPalette> = {
  title: 'Components/CommandPalette',
  component: CommandPalette,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <I18nextProvider i18n={storyI18n}>
        <MemoryRouter>
          <div className="min-h-[400px]">
            <p className="mb-4 text-sm text-gray-500">
              Press <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">Ctrl+K</kbd> or{' '}
              <kbd className="rounded bg-gray-200 px-1.5 py-0.5 text-xs">Cmd+K</kbd> to open the
              command palette.
            </p>
            <Story />
          </div>
        </MemoryRouter>
      </I18nextProvider>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof CommandPalette>;

export const Default: Story = {};
