import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { ProjectsStep } from '../ProjectsStep';
import type { CvEditProfile, CvProjectEntry } from '../../../candidate.types';

/**
 * The wizard's Projects step.
 *
 * Both cases here come from the same field report: saving a project failed with nothing but
 * "Please try again", because the draft was carrying a value the API's `@IsIn` rejects while
 * the select that owns it rendered blank — so the candidate could see no way to fix it and no
 * amount of retrying would.
 */

const mutateAsync = vi.fn();
const deleteMutate = vi.fn();

vi.mock('../../../candidate.api', () => ({
  useUpsertProject: () => ({ mutateAsync, isPending: false }),
  useDeleteProject: () => ({ mutate: deleteMutate, isPending: false }),
}));

const project = (overrides: Partial<CvProjectEntry> = {}): CvProjectEntry => ({
  subscriberProjectId: 1,
  title: 'HRMS',
  clientName: 'Infosys Ltd',
  projectStatus: 'In Progress',
  workedFromMonth: 1,
  workedFromYear: 2026,
  workedTillMonth: 8,
  workedTillYear: 2026,
  projectSite: 'Onsite',
  natureOfEmployment: 'Full Time',
  teamSize: 4,
  roleDescr: '',
  skillsUsed: ['reactjs'],
  details: 'test',
  ...overrides,
});

/** jsdom has no month picker for userEvent to drive, so the value is set as the picker would. */
const fireMonth = (input: HTMLElement, value: string) => fireEvent.change(input, { target: { value } });

const cvWith = (projects: CvProjectEntry[]) => ({ projects } as unknown as CvEditProfile);

const renderStep = (projects: CvProjectEntry[]) =>
  render(
    <ProjectsStep
      cv={cvWith(projects)}
      onBack={vi.fn()}
      onNext={vi.fn()}
      isFirst={false}
      isLast={false}
      stepIndex={6}
      totalSteps={8}
    />,
  );

const badRequest = (message: string[]) =>
  new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, null, {
    status: 400,
    statusText: 'Bad Request',
    data: { statusCode: 400, message, error: 'BadRequestException' },
    headers: new AxiosHeaders(),
    config: { headers: new AxiosHeaders() },
  });

describe('ProjectsStep', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    deleteMutate.mockReset();
    mutateAsync.mockResolvedValue({ subscriberProjectId: 1 });
  });

  it('clears a stored dropdown value the step no longer offers', async () => {
    const user = userEvent.setup();
    // 'Onsite' is a Project Site, not a Nature of Employment. Stored on the row it renders as
    // a blank select while the draft keeps sending it, and the API rejects it every time.
    renderStep([project({ natureOfEmployment: 'Onsite' })]);

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ natureOfEmployment: '' });
  });

  it('keeps a stored dropdown value that is still a valid option', async () => {
    const user = userEvent.setup();
    renderStep([project({ natureOfEmployment: 'Part Time', projectSite: 'Offsite' })]);

    await user.click(screen.getByRole('button', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({
      natureOfEmployment: 'Part Time',
      projectSite: 'Offsite',
    });
  });

  it('shows which field the API rejected instead of a bare "try again"', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(
      badRequest(['natureOfEmployment must be one of the following values: , Full Time, Part Time']),
    );
    renderStep([]);

    await user.type(screen.getByLabelText(/project title/i), 'HRMS');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    // Named by its on-screen label, with what to do about it — not the API's property name.
    expect(
      await screen.findByText('Could not save this project. Nature of Employment: choose one of the options in the list.'),
    ).toBeInTheDocument();
  });

  it('falls back to the generic message when the failure carries no field detail', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue(new Error('Network Error'));
    renderStep([]);

    await user.type(screen.getByLabelText(/project title/i), 'HRMS');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText('Could not save this project. Please try again.')).toBeInTheDocument();
  });

  it('refuses a Worked Till earlier than Worked From', async () => {
    const user = userEvent.setup();
    renderStep([]);

    await user.type(screen.getByLabelText(/project title/i), 'HRMS');
    fireMonth(screen.getByLabelText(/worked from/i), '2026-01');
    fireMonth(screen.getByLabelText(/worked till/i), '2025-01');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText('Worked Till cannot be earlier than Worked From.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('accepts a Worked Till in the same month as Worked From', async () => {
    const user = userEvent.setup();
    renderStep([]);

    await user.type(screen.getByLabelText(/project title/i), 'HRMS');
    fireMonth(screen.getByLabelText(/worked from/i), '2025-03');
    fireMonth(screen.getByLabelText(/worked till/i), '2025-03');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({
      workedFromMonth: 3,
      workedFromYear: 2025,
      workedTillMonth: 3,
      workedTillYear: 2025,
    });
  });

  it('greys out months before Worked From in the Worked Till picker', () => {
    renderStep([]);
    fireMonth(screen.getByLabelText(/worked from/i), '2026-01');
    expect(screen.getByLabelText(/worked till/i)).toHaveAttribute('min', '2026-01');
  });

  it('does not advance the wizard when the save fails', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    mutateAsync.mockRejectedValue(badRequest(['title should not be empty']));

    render(
      <ProjectsStep
        cv={cvWith([])}
        onBack={vi.fn()}
        onNext={onNext}
        isFirst={false}
        isLast={false}
        stepIndex={6}
        totalSteps={8}
      />,
    );

    await user.type(screen.getByLabelText(/project title/i), 'HRMS');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(onNext).not.toHaveBeenCalled();
  });
});
