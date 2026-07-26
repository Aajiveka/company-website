import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResumeUpload from '../ResumeUpload';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock toast
const mockNotify = vi.fn();
vi.mock('@/components/ui', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/components/ui');
  return {
    ...actual,
    useToast: () => ({ notify: mockNotify }),
  };
});

// Mock candidate API hooks
const mockMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/features/candidates/candidate.api', () => ({
  useCandidateProfile: vi.fn(() => ({ data: null })),
  useUploadResume: vi.fn(() => ({
    mutate: mockMutate,
    isPending: false,
  })),
  useDeleteResume: vi.fn(() => ({
    mutate: mockDeleteMutate,
    isPending: false,
  })),
}));

// We need to import the mock to change return values
import { useCandidateProfile } from '@/features/candidates/candidate.api';

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock');
  URL.revokeObjectURL = vi.fn();
});

describe('ResumeUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useCandidateProfile as ReturnType<typeof vi.fn>).mockReturnValue({ data: null });
  });

  it('renders upload area when no resume exists', () => {
    render(<ResumeUpload />);
    expect(screen.getByText('upload.resumeHeading')).toBeInTheDocument();
    expect(screen.getByText('fileUpload.dragDrop')).toBeInTheDocument();
  });

  it('does not show download/delete buttons when no resume', () => {
    render(<ResumeUpload />);
    expect(screen.queryByText('actions.download')).not.toBeInTheDocument();
  });

  it('shows existing resume with download and delete buttons', () => {
    (useCandidateProfile as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        resumeUrl: 'https://example.com/resume.pdf',
        resumeFileName: 'my-resume.pdf',
        resumeUploadedAt: '2025-06-01',
      },
    });

    render(<ResumeUpload />);
    expect(screen.getByText('my-resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('actions.download')).toBeInTheDocument();

    // Download link
    const downloadLink = screen.getByText('actions.download').closest('a');
    expect(downloadLink).toHaveAttribute('href', 'https://example.com/resume.pdf');
    expect(downloadLink).toHaveAttribute('download');
  });

  it('calls upload mutation on file select', () => {
    render(<ResumeUpload />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['resume content'], 'resume.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [file] } });

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const callArgs = mockMutate.mock.calls[0];
    expect(callArgs[0].file).toBe(file);
    expect(typeof callArgs[0].onProgress).toBe('function');
  });

  it('calls delete mutation when delete button is clicked', () => {
    (useCandidateProfile as ReturnType<typeof vi.fn>).mockReturnValue({
      data: {
        resumeUrl: 'https://example.com/resume.pdf',
        resumeFileName: 'my-resume.pdf',
      },
    });

    render(<ResumeUpload />);

    // The delete button has text-red-600 in its className
    const buttons = screen.getAllByRole('button');
    const deleteBtn = buttons.find((btn) => btn.className.includes('text-red-600'));
    expect(deleteBtn).toBeDefined();
    fireEvent.click(deleteBtn!);
    expect(mockDeleteMutate).toHaveBeenCalledTimes(1);
  });

  it('renders the file upload component with correct accept and maxSize', () => {
    render(<ResumeUpload />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.pdf,.doc,.docx');
  });

  it('shows resume hint text', () => {
    render(<ResumeUpload />);
    expect(screen.getByText('upload.resumeHint')).toBeInTheDocument();
  });
});
