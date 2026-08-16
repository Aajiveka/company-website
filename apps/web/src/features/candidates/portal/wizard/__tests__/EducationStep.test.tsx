import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EducationStep } from '../EducationStep';
import type { CvEditProfile, CvEducationEntry, CvMasters } from '../../../candidate.types';

/**
 * The wizard's Education step.
 *
 * The step's job is three cascades — qualification narrows the Course list, the candidate's
 * location prioritises institution suggestions, and free text always beats the master list —
 * plus the validation that keeps impossible qualifications out of the database. Every case here
 * covers one of those; the cascade cases exist because the master data was four education
 * levels until it became ~90 qualifications, and a Course list that does not narrow would offer
 * an MBBS candidate a choice of engineering branches.
 */

const mutateAsync = vi.fn();
const deleteMutate = vi.fn();
const instituteSearch = vi.fn();

vi.mock('../../../candidate.api', () => ({
  useUpsertEducation: () => ({ mutateAsync, isPending: false }),
  useDeleteEducation: () => ({ mutate: deleteMutate, isPending: false }),
  useInstituteSearch: (query: string, stateId: number | null, enabled: boolean) =>
    instituteSearch(query, stateId, enabled),
}));

const MASTERS = {
  states: [
    { id: 5, label: 'Bihar' },
    { id: 21, label: 'Maharashtra' },
  ],
  cities: [
    { id: 101, label: 'Patna', stateId: 5 },
    { id: 202, label: 'Pune', stateId: 21 },
  ],
  degrees: [
    { id: 2, label: '12th', category: 'School' },
    { id: 136, label: 'B.Tech', category: 'Undergraduate' },
    { id: 132, label: 'B.Com.', category: 'Undergraduate' },
    { id: 145, label: 'MBBS', category: 'Undergraduate' },
    { id: 183, label: 'MBA', category: 'Postgraduate' },
  ],
  courses: [
    { id: 900, label: 'Science (PCM)', degreeId: 2 },
    { id: 1020, label: 'Computer Science and Engineering', degreeId: 136 },
    { id: 1021, label: 'Information Technology', degreeId: 136 },
    { id: 1022, label: 'Mechanical Engineering', degreeId: 136 },
    { id: 1010, label: 'Accounting and Finance', degreeId: 132 },
    { id: 1011, label: 'Taxation', degreeId: 132 },
    { id: 1030, label: 'Medicine and Surgery', degreeId: 145 },
    { id: 1040, label: 'Finance', degreeId: 183 },
  ],
} as unknown as CvMasters;

const entry = (overrides: Partial<CvEducationEntry> = {}): CvEducationEntry => ({
  subscriberEducationId: 1,
  courseTypeId: 1020,
  degreeId: 136,
  instituteName: 'Patna University',
  passingYear: 2020,
  startYear: 2016,
  specialization: 'Computer Science',
  courseMode: 'Full Time',
  marks: '78.5',
  ...overrides,
});

const cvWith = (education: CvEducationEntry[], cityId: number | null = 101) =>
  ({ education, personal: { cityId } } as unknown as CvEditProfile);

const renderStep = (cv: CvEditProfile) =>
  render(
    <EducationStep
      cv={cv}
      masters={MASTERS}
      onBack={vi.fn()}
      onNext={vi.fn()}
      isFirst={false}
      isLast={false}
      stepIndex={3}
      totalSteps={8}
    />,
  );

/** Fills everything the step requires, so a test can then break exactly one field. */
async function fillValidDraft(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/^education/i), '136');
  await user.type(screen.getByLabelText(/institution/i), 'Patna University');
  await user.selectOptions(screen.getByLabelText(/^course \*/i), '1020');
  await user.type(screen.getByLabelText(/specialization/i), 'Computer Science');
}

const courseOptions = () =>
  within(screen.getByLabelText(/^course \*/i))
    .getAllByRole('option')
    .map((o) => o.textContent);

describe('EducationStep', () => {
  beforeEach(() => {
    mutateAsync.mockReset();
    deleteMutate.mockReset();
    instituteSearch.mockReset();
    mutateAsync.mockResolvedValue({ subscriberEducationId: 1 });
    instituteSearch.mockReturnValue({ data: [], isFetching: false });
  });

  it('groups the ~90 qualifications into categories rather than one flat list', () => {
    renderStep(cvWith([]));
    const education = screen.getByLabelText(/^education/i);
    // <optgroup> labels, which is what keeps the list navigable at this length.
    const groups = within(education).getAllByRole('group').map((g) => g.getAttribute('label'));
    expect(groups).toEqual(['School', 'Undergraduate', 'Postgraduate']);
  });

  it('offers B.Tech branches once B.Tech is chosen', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await user.selectOptions(screen.getByLabelText(/^education/i), '136');

    expect(courseOptions()).toEqual([
      'Select',
      'Computer Science and Engineering',
      'Information Technology',
      'Mechanical Engineering',
    ]);
  });

  it('offers B.Com courses, not engineering branches, once B.Com is chosen', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await user.selectOptions(screen.getByLabelText(/^education/i), '132');

    expect(courseOptions()).toEqual(['Select', 'Accounting and Finance', 'Taxation']);
  });

  it('never offers an engineering branch under MBBS', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await user.selectOptions(screen.getByLabelText(/^education/i), '145');

    expect(courseOptions()).toEqual(['Select', 'Medicine and Surgery']);
  });

  it('resets the chosen course when the qualification changes', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await user.selectOptions(screen.getByLabelText(/^education/i), '136');
    await user.selectOptions(screen.getByLabelText(/^course \*/i), '1021');
    expect(screen.getByLabelText(/^course \*/i)).toHaveValue('1021');

    // Keeping it would file an Information Technology branch under a B.Com.
    await user.selectOptions(screen.getByLabelText(/^education/i), '132');
    expect(screen.getByLabelText(/^course \*/i)).toHaveValue('');
  });

  it('keeps the Course dropdown closed until a qualification is picked', () => {
    renderStep(cvWith([]));
    expect(screen.getByLabelText(/^course \*/i)).toBeDisabled();
  });

  it("searches institutions against the candidate's own state", () => {
    renderStep(cvWith([], 101)); // Patna -> Bihar
    expect(instituteSearch).toHaveBeenCalledWith('', 5, true);
  });

  it('falls back to a nationwide search when the profile has no city yet', () => {
    renderStep(cvWith([], null));
    expect(instituteSearch).toHaveBeenCalledWith('', null, true);
  });

  it('saves an institution that is not in the master list', async () => {
    const user = userEvent.setup();
    instituteSearch.mockReturnValue({ data: [], isFetching: false });
    renderStep(cvWith([]));

    await user.selectOptions(screen.getByLabelText(/^education/i), '136');
    await user.type(screen.getByLabelText(/institution/i), 'A College Nobody Listed');
    await user.selectOptions(screen.getByLabelText(/^course \*/i), '1020');
    await user.type(screen.getByLabelText(/specialization/i), 'Computer Science');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ instituteName: 'A College Nobody Listed' });
  });

  it('fills the institution field from a suggestion', async () => {
    const user = userEvent.setup();
    instituteSearch.mockReturnValue({
      data: [{ id: 4, label: 'Patna University', kind: 'University', city: 'Patna', stateId: 5 }],
      isFetching: false,
    });
    renderStep(cvWith([]));

    await user.type(screen.getByLabelText(/institution/i), 'Patna');
    await user.click(await screen.findByRole('option', { name: /Patna University/ }));

    expect(screen.getByLabelText(/institution/i)).toHaveValue('Patna University');
  });

  it('rejects a percentage above 100', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await fillValidDraft(user);
    await user.type(screen.getByLabelText(/percentage/i), '101');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText('Percentage must be between 0 and 100.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a negative percentage', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await fillValidDraft(user);
    await user.type(screen.getByLabelText(/percentage/i), '-1');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText(/Enter a percentage \(0-100\)/)).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('accepts a CGPA, which the column already holds', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await fillValidDraft(user);
    await user.type(screen.getByLabelText(/percentage/i), '8.5 CGPA');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ marks: '8.5 CGPA' });
  });

  it('rejects an end year earlier than the start year', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await fillValidDraft(user);
    await user.type(screen.getByLabelText(/start year/i), '2020');
    await user.type(screen.getByLabelText(/end year/i), '2016');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText('End year cannot be earlier than start year.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('allows an end year in the near future, for a course still being studied', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));
    const nextYear = String(new Date().getFullYear() + 1);

    await fillValidDraft(user);
    await user.type(screen.getByLabelText(/start year/i), '2024');
    await user.type(screen.getByLabelText(/end year/i), nextYear);
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ passingYear: Number(nextYear) });
  });

  it('requires the fields the form marks with an asterisk', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await user.selectOptions(screen.getByLabelText(/^education/i), '136');
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText('Enter your institution or university.')).toBeInTheDocument();
    expect(screen.getByText('Select a course.')).toBeInTheDocument();
    expect(screen.getByText('Enter your specialization.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('saves the current entry before opening a blank one, so the two stay independent', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([]));

    await fillValidDraft(user);
    await user.click(screen.getByRole('button', { name: /add another education/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledTimes(1));
    expect(mutateAsync.mock.calls[0][0]).toMatchObject({ degreeId: 136, courseTypeId: 1020 });
    // The second form starts empty rather than inheriting the first entry's values.
    await waitFor(() => expect(screen.getByLabelText(/^education/i)).toHaveValue(''));
    expect(screen.getByLabelText(/institution/i)).toHaveValue('');
    expect(screen.getByLabelText(/specialization/i)).toHaveValue('');
  });

  it('loads a saved qualification back into the form for editing', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([entry()]));

    await user.click(screen.getByRole('button', { name: /edit/i }));

    expect(screen.getByLabelText(/^education/i)).toHaveValue('136');
    expect(screen.getByLabelText(/^course \*/i)).toHaveValue('1020');
    expect(screen.getByLabelText(/institution/i)).toHaveValue('Patna University');
    expect(screen.getByLabelText(/start year/i)).toHaveValue('2016');
    expect(screen.getByLabelText(/end year/i)).toHaveValue('2020');
    expect(screen.getByLabelText(/specialization/i)).toHaveValue('Computer Science');
    expect(screen.getByLabelText(/percentage/i)).toHaveValue('78.5');
  });

  it('titles a saved row with the qualification, not the branch', () => {
    renderStep(cvWith([entry()]));
    // "Computer Science and Engineering" alone never says what was awarded.
    expect(screen.getByText('B.Tech')).toBeInTheDocument();
  });

  it('refuses the same qualification from the same institution twice', async () => {
    const user = userEvent.setup();
    renderStep(cvWith([entry()]));

    await user.click(screen.getByRole('button', { name: /add another education/i }));
    await fillValidDraft(user);
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(
      await screen.findByText('You have already added this qualification from this institution.'),
    ).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('surfaces the rule the API rejected rather than a bare retry prompt', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValue({
      response: { data: { message: 'That course does not belong to B.Tech.' } },
    });
    renderStep(cvWith([]));

    await fillValidDraft(user);
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText('That course does not belong to B.Tech.')).toBeInTheDocument();
  });

  it('does not advance the wizard when the save fails', async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    mutateAsync.mockRejectedValue(new Error('Network Error'));

    render(
      <EducationStep
        cv={cvWith([])}
        masters={MASTERS}
        onBack={vi.fn()}
        onNext={onNext}
        isFirst={false}
        isLast={false}
        stepIndex={3}
        totalSteps={8}
      />,
    );

    await fillValidDraft(user);
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled());
    expect(onNext).not.toHaveBeenCalled();
  });
});
