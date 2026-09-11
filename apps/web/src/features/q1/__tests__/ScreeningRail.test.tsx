import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScreeningRail } from '../components/ScreeningRail';
import { Q1_PROFILE } from '@/mocks/data';
import type { Q1Profile } from '../q1.types';

/**
 * The "Q1 Initial Screening" rail.
 *
 * Its whole job is to look different in the two states the designs draw: a complete profile
 * offers "Mark as Verified", an incomplete one offers the missing list plus the two contact
 * actions. Getting that backwards would let a screener verify a candidate with no CV.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const notify = vi.fn();
vi.mock('@/components/ui', () => ({
  useToast: () => ({ notify }),
}));

const base = Q1_PROFILE as unknown as Q1Profile;

function renderRail(overrides: Partial<Q1Profile> = {}, handlers = {}) {
  const props = {
    profile: { ...base, ...overrides },
    onToggle: vi.fn().mockResolvedValue(undefined),
    onToggleAll: vi.fn().mockResolvedValue(undefined),
    onVerify: vi.fn().mockResolvedValue(undefined),
    onContact: vi.fn(),
    onRequestUpdate: vi.fn().mockResolvedValue(undefined),
    isBusy: false,
    ...handlers,
  };
  render(<ScreeningRail {...props} />);
  return props;
}

beforeEach(() => {
  notify.mockClear();
});

describe('ScreeningRail', () => {
  it('offers Mark as Verified only when the profile is complete', () => {
    renderRail({ profileCompleteness: 100, missingItems: [] });

    expect(screen.getByText('q1.rail.completeTitle')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /q1\.rail\.markVerified/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /q1\.rail\.requestUpdate/ })).not.toBeInTheDocument();
  });

  it('offers the contact actions and the missing list when it is not', () => {
    renderRail({
      profileCompleteness: 50,
      missingItems: ['Missing CV', 'Missing salary information'],
    });

    expect(screen.getByText('q1.rail.incompleteTitle')).toBeInTheDocument();
    expect(screen.getByText('Missing CV')).toBeInTheDocument();
    expect(screen.getByText('Missing salary information')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /q1\.rail\.requestUpdate/ })).toBeInTheDocument();
    // The one action that must NOT be reachable on an incomplete profile.
    expect(screen.queryByRole('button', { name: /q1\.rail\.markVerified/ })).not.toBeInTheDocument();
  });

  it('strikes through the checks that are done and leaves the rest plain', () => {
    // Q1_PROFILE has 5 of 7 checked; designation and location are the two outstanding.
    renderRail();

    const done = screen.getByText('q1.checklist.nameVerified');
    const todo = screen.getByText('q1.checklist.designationVerified');
    expect(done.className).toContain('line-through');
    expect(todo.className).not.toContain('line-through');
  });

  it('shows the 5/7 counter from the server rather than recomputing it', () => {
    renderRail();
    expect(screen.getByText('5/7 · 71%')).toBeInTheDocument();
  });

  it('sends the item key and the new value when a check is toggled', async () => {
    const user = userEvent.setup();
    const props = renderRail();

    await user.click(screen.getByRole('checkbox', { name: 'q1.checklist.designationVerified' }));

    expect(props.onToggle).toHaveBeenCalledWith('designationVerified', true);
  });

  it('unchecks an already-checked item rather than re-checking it', async () => {
    const user = userEvent.setup();
    const props = renderRail();

    await user.click(screen.getByRole('checkbox', { name: 'q1.checklist.nameVerified' }));

    expect(props.onToggle).toHaveBeenCalledWith('nameVerified', false);
  });

  it('select-all checks everything while any item is outstanding', async () => {
    const user = userEvent.setup();
    const props = renderRail();

    await user.click(screen.getByRole('checkbox', { name: 'q1.rail.selectAll' }));

    expect(props.onToggleAll).toHaveBeenCalledWith(true);
  });

  it('reports a failed verify as an error toast instead of silently doing nothing', async () => {
    const user = userEvent.setup();
    renderRail(
      { profileCompleteness: 100, missingItems: [] },
      { onVerify: vi.fn().mockRejectedValue(new Error('nope')) },
    );

    await user.click(screen.getByRole('button', { name: /q1\.rail\.markVerified/ }));

    expect(notify).toHaveBeenCalledWith('errors.somethingWrong', 'error');
  });

  it('disables the checklist while a mutation is in flight', () => {
    renderRail({}, { isBusy: true });
    expect(screen.getByRole('checkbox', { name: 'q1.checklist.nameVerified' })).toBeDisabled();
  });
});
