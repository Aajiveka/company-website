import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { PersonalStep } from '../PersonalStep';
import type { CvEditProfile, CvMasters } from '../../../candidate.types';

/**
 * Step 1's save errors. It used to answer every failure with "Could not save. Please try
 * again." — which told a candidate nothing when the real cause was a list of skills typed into
 * the one-skill Primary Skill field, or a field the API rejected.
 */

const personalSave = vi.fn();
const professionalSave = vi.fn();
const pending = { isPending: false };

vi.mock('../../../candidate.api', () => ({
  useUpdatePersonal: () => ({ ...pending, mutateAsync: personalSave }),
  useUpdateHeadline: () => ({ ...pending, mutateAsync: vi.fn() }),
  useUpdateProfessional: () => ({ ...pending, mutateAsync: professionalSave }),
  useUpsertAccomplishment: () => ({ ...pending, mutateAsync: vi.fn() }),
}));

vi.mock('@/components/ui', () => ({ LocationSelect: () => null }));

const cv = {
  personal: { fullName: 'Rahul Sharma', mobile: '9000010001', email: 'rahul@x.in', dob: '', gender: 'M', address: '', cityId: null, photoUrl: null },
  professional: { totalExp: 3, totalExpMonths: 5, subFunctionId: null, skillId: null, tagNames: [], preferredCityIds: [] },
  employment: [{ subscriberEmployerId: 1 }],
  accomplishments: [],
  headline: '',
} as unknown as CvEditProfile;

const masters = { skills: [{ id: 1, label: 'Algorithms' }], subFunctions: [], states: [], cities: [] } as unknown as CvMasters;

const renderStep = () =>
  render(
    <PersonalStep
      cv={cv}
      masters={masters}
      onBack={vi.fn()}
      onNext={vi.fn()}
      onFresherChange={vi.fn()}
      isFirst
      isLast={false}
      stepIndex={0}
      totalSteps={8}
    />,
  );

describe('PersonalStep save errors', () => {
  beforeEach(() => {
    personalSave.mockReset().mockResolvedValue({ ok: true });
    professionalSave.mockReset().mockResolvedValue({ ok: true });
  });

  it('stops a list typed into Primary Skill and says where the rest belongs', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByLabelText('Primary Skill'));
    await user.keyboard('React.js, Node.js, Next.js, TypeScript, MongoDB, PostgreSQL, Express.js, REST APIs, Tailwind CSS, Docker, Redis');
    await user.click(await screen.findByRole('option', { name: /add/i }));
    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(await screen.findByText(/Add the rest as Key Skills in the Skills step/)).toBeInTheDocument();
    expect(personalSave).not.toHaveBeenCalled();
  });

  it("shows the API's reason, naming the field by its label", async () => {
    const user = userEvent.setup();
    personalSave.mockRejectedValue(
      new AxiosError('Bad Request', 'ERR_BAD_REQUEST', undefined, null, {
        status: 400,
        statusText: 'Bad Request',
        data: { message: ['mobile should not be empty'] },
        headers: new AxiosHeaders(),
        config: { headers: new AxiosHeaders() },
      }),
    );
    renderStep();

    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    expect(
      await screen.findByText('Could not save your personal details. Phone Number is required.'),
    ).toBeInTheDocument();
  });

  it('sends a blank date of birth through, rather than blocking the step on it', async () => {
    const user = userEvent.setup();
    renderStep();

    await user.click(screen.getByRole('button', { name: /save & continue/i }));

    await waitFor(() => expect(personalSave).toHaveBeenCalled());
    expect(personalSave.mock.calls[0][0]).toMatchObject({ dob: '' });
  });
});
