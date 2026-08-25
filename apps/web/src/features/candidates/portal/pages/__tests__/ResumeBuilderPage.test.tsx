import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { CvEditProfile } from '../../../candidate.types';

/**
 * The resume builder's Download.
 *
 * It used to export whatever the middle card happened to be showing, which in the editor is a
 * single section — and on the Certifications tab is a form with no sheet at all, so the button
 * silently did nothing. The export node is now rendered separately and always holds the whole CV.
 */

const cv = {
  personal: {
    fullName: 'Swati Kumari',
    email: 'swati@example.com',
    mobile: '7654893567',
    address: 'Chandigarh',
    cityId: 1,
    dob: '',
    gender: 'F',
  },
  professional: { tagNames: ['React', 'Node.js'] },
  headline: 'Full-stack engineer',
  summary: 'Builds hiring products.',
  employment: [
    { subscriberEmployerId: 1, employer: 'Infosys', designationId: 1, joiningDate: '2021-01-01', releavingDate: null, flgCurrent: true, jobDescr: 'Led the portal rewrite.' },
  ],
  education: [
    { subscriberEducationId: 1, degreeId: 1, courseTypeId: null, instituteName: 'Panjab University', startYear: 2014, passingYear: 2018, specialization: '', marks: '' },
  ],
  projects: [
    { subscriberProjectId: 1, title: 'HRMS Portal', clientName: 'Acme', projectStatus: 'Completed', workedFromYear: 2022, workedTillYear: 2023, projectSite: 'Onsite', natureOfEmployment: 'Full Time', teamSize: 4, roleDescr: '', skillsUsed: ['reactjs'], details: 'Payroll module.' },
  ],
  itSkills: [{ subscriberItSkillId: 1, skillName: 'PostgreSQL', version: '16', lastUsedYear: 2026, expYears: 3, expMonths: 6 }],
  certificates: [
    { subscriberCertificateId: 1, certificateName: 'AWS Solutions Architect', certificateUrl: '', certificationId: 'AWS-12345', validFromYear: 2024, validTillYear: 2027, neverExpires: false },
  ],
  accomplishments: [
    { subscriberAccomplishmentId: 1, kind: 'ONLINE_PROFILE', title: 'LinkedIn', url: 'https://linkedin.com/in/swati', descr: '', eventYear: null },
    { subscriberAccomplishmentId: 2, kind: 'PUBLICATION', title: 'Scaling Postgres', url: '', descr: 'A talk on partitioning.', eventYear: 2025 },
  ],
  languages: [{ subscriberLanguageId: 1, languageName: 'Hindi', proficiencyId: 3 }],
} as unknown as CvEditProfile;

vi.mock('../../../candidate.api', () => ({
  useCvEditProfile: () => ({ data: cv, isLoading: false }),
  useCvMasters: () => ({ data: { designations: [{ id: 1, label: 'Engineer' }], degrees: [{ id: 1, label: 'B.Tech' }], courses: [], cities: [{ id: 1, label: 'Chandigarh' }] } }),
  useUpsertCertificate: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCertificate: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/ui')>()),
  useToast: () => ({ notify: vi.fn() }),
}));

const { default: ResumeBuilderPage } = await import('../ResumeBuilderPage');

/** The off-screen node Download rasterises. */
const exportSheet = () => {
  const node = document.querySelector('[aria-hidden="true"] .bg-white');
  if (!node) throw new Error('export sheet not rendered');
  return node as HTMLElement;
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResumeBuilderPage />
    </MemoryRouter>,
  );

describe('ResumeBuilderPage export sheet', () => {
  it('holds every filled section, not just the one the editor shows', () => {
    renderPage();
    const sheet = exportSheet();

    expect(sheet).toHaveTextContent('Swati Kumari');
    expect(sheet).toHaveTextContent('Builds hiring products.');
    expect(sheet).toHaveTextContent('Infosys');
    expect(sheet).toHaveTextContent('Panjab University');
    expect(sheet).toHaveTextContent('HRMS Portal');
    expect(sheet).toHaveTextContent('React');
    expect(sheet).toHaveTextContent('PostgreSQL');
    expect(sheet).toHaveTextContent('AWS Solutions Architect');
    expect(sheet).toHaveTextContent('Scaling Postgres');
  });

  it('carries the details each section captured, not just its title', () => {
    renderPage();
    const sheet = exportSheet();

    expect(sheet).toHaveTextContent('Chandigarh');
    expect(sheet).toHaveTextContent('https://linkedin.com/in/swati');
    expect(sheet).toHaveTextContent('AWS-12345');
    expect(sheet).toHaveTextContent('Payroll module.');
    expect(sheet).toHaveTextContent('Hindi — Expert');
    expect(sheet).toHaveTextContent('3 yrs 6 mos');
  });

  // The regression that started this: the Certifications tab replaces the sheet with a form.
  it('still holds the whole resume while the Certifications editor is open', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Certifications' }));

    const sheet = exportSheet();
    expect(sheet).toHaveTextContent('Swati Kumari');
    expect(sheet).toHaveTextContent('Infosys');
    expect(sheet).toHaveTextContent('HRMS Portal');
  });
});
