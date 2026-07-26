import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createQueryWrapper } from '@/test-utils/QueryWrapper';
import type { PublicJob } from '../jobs.types';

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

beforeAll(() => {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() { /* noop */ }
    observe() { return null; }
    unobserve() { return null; }
    disconnect() { return null; }
  } as unknown as typeof global.IntersectionObserver;
});

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Mock i18n — return the key as the translation
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (key === 'search.jobsFound' && opts?.count !== undefined)
        return `${opts.count} jobs found`;
      return key;
    },
  }),
}));

// Mock the API hooks used by JobSearchPage
const mockJobs: PublicJob[] = [
  {
    jobId: 1,
    designation: 'Frontend Developer',
    company: 'TechCorp',
    industry: 'IT',
    city: 'Mumbai',
    workMode: 'Remote',
    employmentType: 'Full Time',
    minExp: 2,
    minCtc: 400000,
    maxCtc: 800000,
    postedOn: '2024-01-15',
  },
  {
    jobId: 2,
    designation: 'Backend Engineer',
    company: 'DataSoft',
    industry: 'IT',
    city: 'Pune',
    workMode: 'Hybrid',
    employmentType: 'Full Time',
    minExp: 3,
    minCtc: 600000,
    maxCtc: 1200000,
    postedOn: '2024-01-10',
  },
];

vi.mock('../jobs.api', () => ({
  useInfinitePublicJobs: () => ({
    data: { pages: [{ rows: mockJobs, total: mockJobs.length }] },
    isLoading: false,
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  }),
}));

vi.mock('@/features/candidates/candidate.api', () => ({
  useSavedJobIds: () => ({ data: [] }),
  useSaveJob: () => ({ mutate: vi.fn() }),
  useUnsaveJob: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/features/auth/auth.store', () => ({
  useAuth: () => ({ isAuthenticated: false }),
}));

vi.mock('@/components/Seo', () => ({
  Seo: () => null,
}));

vi.mock('@/features/public/components/PageBanner', () => ({
  PageBanner: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/JobSearchBar', () => ({
  JobSearchBar: () => <div data-testid="job-search-bar" />,
}));

vi.mock('@/features/candidates/components/SavedSearches', () => ({
  SavedSearches: () => <div data-testid="saved-searches" />,
}));

vi.mock('../components/JobFilters', () => ({
  JobFiltersPanel: () => <div data-testid="job-filters" />,
  DEFAULT_FILTERS: {
    workMode: '',
    employmentType: '',
    industry: '',
    minExp: undefined,
    maxExp: undefined,
    minCtc: 0,
    maxCtc: 5_000_000,
    sortBy: 'newest',
    workModes: [],
    employmentTypes: [],
    locationsList: [],
    skills: [],
    postedWithin: '',
  },
}));

vi.mock('../components/CompareDrawer', () => ({
  CompareBar: () => null,
}));

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JobSearchPage', () => {
  const QueryWrapper = createQueryWrapper();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders job cards for each returned job', async () => {
    // Dynamic import so mocks are registered first
    const { default: JobSearchPage } = await import('../pages/JobSearchPage');

    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <QueryWrapper>
          <JobSearchPage />
        </QueryWrapper>
      </MemoryRouter>,
    );

    // Each job card displays the designation as a heading
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  });

  it('displays the total job count', async () => {
    const { default: JobSearchPage } = await import('../pages/JobSearchPage');

    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <QueryWrapper>
          <JobSearchPage />
        </QueryWrapper>
      </MemoryRouter>,
    );

    expect(screen.getByText('2 jobs found')).toBeInTheDocument();
  });

  it('renders company names in job cards', async () => {
    const { default: JobSearchPage } = await import('../pages/JobSearchPage');

    render(
      <MemoryRouter initialEntries={['/jobs']}>
        <QueryWrapper>
          <JobSearchPage />
        </QueryWrapper>
      </MemoryRouter>,
    );

    expect(screen.getByText('TechCorp')).toBeInTheDocument();
    expect(screen.getByText('DataSoft')).toBeInTheDocument();
  });
});
