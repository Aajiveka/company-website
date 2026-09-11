import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { UpdateStatusModal } from '../components/UpdateStatusModal';

/**
 * Update Candidate Status.
 *
 * Each of the three outcomes carries its own fields and its own validation. The cases below
 * cover what each branch must not be allowed to save: a follow-up with no date would never
 * surface on the Follow-ups screen, and a past date would surface immediately as overdue.
 */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const notify = vi.fn();
vi.mock('@/components/ui', () => ({
  useToast: () => ({ notify }),
}));

function renderModal(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <UpdateStatusModal
      open
      onClose={vi.fn()}
      candidateName="Anuranjan Kumar"
      candidateId={3}
      currentAttempts={1}
      onSubmit={onSubmit}
      isPending={false}
    />,
  );
  return onSubmit;
}

const save = () => screen.getByRole('button', { name: 'q1.status.save' });
const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

beforeEach(() => notify.mockClear());

describe('UpdateStatusModal', () => {
  it('opens on Follow-up with only that branch’s fields showing', () => {
    renderModal();

    expect(screen.getByText('q1.status.followUpDate')).toBeInTheDocument();
    // The other two branches' fields stay collapsed until selected.
    expect(screen.queryByText('q1.status.contactAttempts')).not.toBeInTheDocument();
    expect(screen.queryByText('q1.status.reason')).not.toBeInTheDocument();
  });

  it('refuses a follow-up with no date', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal();

    await user.click(save());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('q1.status.errors.followUpDate');
  });

  it('refuses a follow-up date in the past', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal();

    const input = screen.getByLabelText('q1.status.followUpDate');
    await user.type(input, '2020-01-01');
    await user.click(save());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('q1.status.errors.followUpPast');
  });

  it('saves a follow-up with its date and preferred time', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal();
    const date = tomorrow();

    await user.type(screen.getByLabelText('q1.status.followUpDate'), date);
    await user.click(save());

    expect(onSubmit).toHaveBeenCalledWith({
      status: 'FollowUp',
      followUpDate: date,
      followUpTime: 'Morning (10–12)',
    });
  });

  it('switches branches and sends only the No Response fields', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal();

    await user.click(screen.getByRole('radio', { name: /q1\.status\.option\.NoResponse/ }));
    await user.click(save());

    // No follow-up date rides along from the branch that was open a moment ago.
    expect(onSubmit).toHaveBeenCalledWith({ status: 'NoResponse', contactAttempts: 1 });
  });

  it('rejects an out-of-range attempt count', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal();

    await user.click(screen.getByRole('radio', { name: /q1\.status\.option\.NoResponse/ }));
    const attempts = screen.getByLabelText('q1.status.contactAttempts');
    await user.clear(attempts);
    await user.type(attempts, '500');
    await user.click(save());

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('q1.status.errors.attempts');
  });

  it('saves Not Interested with the chosen reason', async () => {
    const user = userEvent.setup();
    const onSubmit = renderModal();

    await user.click(screen.getByRole('radio', { name: /q1\.status\.option\.NotInterested/ }));
    await user.selectOptions(screen.getByLabelText('q1.status.reason'), 'Accepted another offer');
    await user.click(save());

    expect(onSubmit).toHaveBeenCalledWith({
      status: 'NotInterested',
      notInterestedReason: 'Accepted another offer',
    });
  });

  it('surfaces a failed save as an error toast', async () => {
    const user = userEvent.setup();
    renderModal(vi.fn().mockRejectedValue(new Error('boom')));

    await user.type(screen.getByLabelText('q1.status.followUpDate'), tomorrow());
    await user.click(save());

    expect(notify).toHaveBeenCalledWith('errors.somethingWrong', 'error');
  });
});
