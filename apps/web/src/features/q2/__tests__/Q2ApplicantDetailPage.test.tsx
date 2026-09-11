import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Q2ApplicantDetailPage from '../pages/Q2ApplicantDetailPage';
import { Q2_APPLICATION } from '@/mocks/data';
import type { Q2Application } from '../q2.types';

/**
 * The applicant detail screen is Q2's decision point, so the three things that must not go
 * wrong are pinned here: the header's three buttons fire the right mutation, a decision that
 * has already been made hides them (the server rejects a second decision, and leaving live
 * buttons would turn that into a mystery error), and ticking a criterion reports the change.
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const notify = vi.fn();
// Partial mock: EmptyState renders the real <Button>, so the module's other exports must survive.
vi.mock('@/components/ui', async (orig) => ({
  ...(await orig<typeof import('@/components/ui')>()),
  useToast: () => ({ notify }),
}));

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig<typeof import('react-router-dom')>()),
  useParams: () => ({ mapId: '102' }),
}));

const forwardMutate = vi.fn().mockResolvedValue({ status: 'Forwarded' });
const sendBackMutate = vi.fn().mockResolvedValue({ status: 'SentBackToQ1' });
const rejectMutate = vi.fn().mockResolvedValue({ status: 'Rejected' });
const criterionMutate = vi.fn();

let application: Q2Application = Q2_APPLICATION as unknown as Q2Application;
let queryState = { isLoading: false, isError: false };

vi.mock('../q2.api', () => ({
  useQ2Application: () => ({ data: application, ...queryState, refetch: vi.fn() }),
  useSetCriterion: () => ({ mutate: criterionMutate, isPending: false }),
  useForwardToQ3: () => ({ mutateAsync: forwardMutate }),
  useSendBackToQ1: () => ({ mutateAsync: sendBackMutate }),
  useRejectApplication: () => ({ mutateAsync: rejectMutate }),
  // The shell reads these two.
  useQ2NavCounts: () => ({ data: { employerJobs: 4, allApplicants: 10 } }),
  useQ2Sla: () => ({ data: { total: 10, matched: 7, awaiting: 3 } }),
}));

vi.mock('@/features/auth/auth.store', () => ({
  useAuth: () => ({ user: { fullName: 'Qadir Ahmed' }, logout: vi.fn() }),
}));

vi.mock('@/components/layout/NotificationBell', () => ({
  NotificationBell: () => null,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <Q2ApplicantDetailPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  notify.mockClear();
  forwardMutate.mockClear();
  sendBackMutate.mockClear();
  rejectMutate.mockClear();
  criterionMutate.mockClear();
  application = Q2_APPLICATION as unknown as Q2Application;
  queryState = { isLoading: false, isError: false };
});

describe('Q2ApplicantDetailPage', () => {
  it('renders the candidate, the job and the overall JD match', () => {
    renderPage();
    expect(screen.getByText('Jatinder Singh')).toBeInTheDocument();
    expect(screen.getByText('jatinder.singh@email.com')).toBeInTheDocument();
    expect(screen.getByText('Jatinder_Singh_Resume.pdf')).toBeInTheDocument();
    // The resume card's full meta line — the i18n mock returns the raw key as the prefix.
    expect(screen.getByText(/2 pages · 240 KB/)).toBeInTheDocument();
    // 98% appears as the header's overall match, the scoring heading and the coverage figure.
    expect(screen.getAllByText('98%').length).toBeGreaterThanOrEqual(2);
  });

  it('lists all seven scoring criteria with the Figma’s sub-scores', () => {
    renderPage();
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(7);
    for (const score of ['96', '95', '98', '90', '86', '82']) {
      expect(screen.getAllByText(score).length).toBeGreaterThan(0);
    }
  });

  it('starts with only Job Role Match ticked, as the design shows', () => {
    renderPage();
    expect(screen.getByRole('checkbox', { name: 'Job Role Match' })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Skill Match' })).not.toBeChecked();
  });

  it('reports a criterion tick so the subset total can be recomputed', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Skill Match' }));
    expect(criterionMutate).toHaveBeenCalledWith(
      { criterion: 'skill', included: true },
      expect.anything(),
    );
  });

  it('forwards to Q3 and confirms it', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /q2.decision.forward.label/ }));
    expect(forwardMutate).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith('q2.decision.forward.success', 'success');
  });

  it('sends back to Q1 and confirms it', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /q2.decision.sendBack.label/ }));
    expect(sendBackMutate).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith('q2.decision.sendBack.success', 'success');
  });

  it('rejects and confirms it', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /q2.decision.reject.label/ }));
    expect(rejectMutate).toHaveBeenCalledOnce();
    expect(notify).toHaveBeenCalledWith('q2.decision.reject.success', 'success');
  });

  it('surfaces a failed decision instead of silently doing nothing', async () => {
    forwardMutate.mockRejectedValueOnce(new Error('already Forwarded'));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /q2.decision.forward.label/ }));
    expect(notify).toHaveBeenCalledWith('q2.decision.forward.error', 'error');
  });

  /**
   * The server refuses a decision on an application that already has one. Hiding the buttons
   * is what keeps that from reaching the matcher as an unexplained failure.
   */
  it('hides the three decisions once one has been made, and says which', () => {
    application = { ...application, status: 'Forwarded' };
    renderPage();
    expect(
      screen.queryByRole('button', { name: /q2.decision.forward.label/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /q2.decision.reject.label/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('q2.detail.alreadyDecided')).toBeInTheDocument();
    // Also a sidebar nav label, hence getAllByText: the pill is the second occurrence.
    expect(screen.getAllByText('Forwarded to Q3').length).toBeGreaterThan(1);
  });

  it('shows an error state with a retry rather than an empty screen', () => {
    queryState = { isLoading: false, isError: true };
    renderPage();
    expect(screen.getByText('errors.couldNotLoad')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'actions.retry' })).toBeInTheDocument();
  });

  it('reports full JD coverage rather than an empty Missing column', () => {
    renderPage();
    expect(screen.getByText('q2.coverage.fullCoverage')).toBeInTheDocument();
    expect(screen.getByText(/Matched \(5\)/)).toBeInTheDocument();
    expect(screen.getByText(/Missing \(0\)/)).toBeInTheDocument();
  });
});
