import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../ui/FileUpload';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

beforeAll(() => {
  URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  URL.revokeObjectURL = vi.fn();
});

function makeFile(name: string, size: number, type: string): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

describe('FileUpload', () => {
  let onUpload: (files: File[]) => void;

  beforeEach(() => {
    onUpload = vi.fn();
  });

  it('renders drop zone with correct text', () => {
    render(<FileUpload onUpload={onUpload} />);
    expect(screen.getByText('fileUpload.dragDrop')).toBeInTheDocument();
    expect(screen.getByText('fileUpload.clickBrowse')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<FileUpload onUpload={onUpload} label="Upload your resume" />);
    expect(screen.getByText('Upload your resume')).toBeInTheDocument();
  });

  it('renders hint when provided and no error', () => {
    render(<FileUpload onUpload={onUpload} hint="Max 5 MB" />);
    expect(screen.getByText('Max 5 MB')).toBeInTheDocument();
  });

  it('accepts valid file types', () => {
    render(<FileUpload onUpload={onUpload} accept=".pdf,.docx" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const validFile = makeFile('resume.pdf', 1000, 'application/pdf');
    fireEvent.change(input, { target: { files: [validFile] } });

    expect(onUpload).toHaveBeenCalledWith([validFile]);
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
  });

  it('rejects invalid file types and shows error', () => {
    render(<FileUpload onUpload={onUpload} accept=".pdf" />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const invalidFile = makeFile('photo.png', 1000, 'image/png');
    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(onUpload).not.toHaveBeenCalled();
    // The error message uses the translation key
    expect(screen.getByText(/fileUpload.invalidType/)).toBeInTheDocument();
  });

  it('rejects files exceeding maxSize', () => {
    const maxSize = 1024; // 1 KB
    render(<FileUpload onUpload={onUpload} maxSize={maxSize} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const bigFile = makeFile('big.pdf', 2048, 'application/pdf');
    fireEvent.change(input, { target: { files: [bigFile] } });

    expect(onUpload).not.toHaveBeenCalled();
    expect(screen.getByText(/fileUpload.maxSize/)).toBeInTheDocument();
  });

  it('handles multiple file selection when multiple=true', () => {
    render(<FileUpload onUpload={onUpload} multiple />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('multiple');

    const file1 = makeFile('a.pdf', 100, 'application/pdf');
    const file2 = makeFile('b.pdf', 200, 'application/pdf');

    fireEvent.change(input, { target: { files: [file1, file2] } });

    expect(onUpload).toHaveBeenCalledWith([file1, file2]);
    expect(screen.getByText('a.pdf')).toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  it('removes a file from the list', () => {
    render(<FileUpload onUpload={onUpload} multiple />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file1 = makeFile('a.pdf', 100, 'application/pdf');
    const file2 = makeFile('b.pdf', 200, 'application/pdf');
    fireEvent.change(input, { target: { files: [file1, file2] } });

    const removeButtons = screen.getAllByLabelText('fileUpload.removeFile');
    expect(removeButtons).toHaveLength(2);

    // Remove the first file
    fireEvent.click(removeButtons[0]);
    expect(screen.queryByText('a.pdf')).not.toBeInTheDocument();
    expect(screen.getByText('b.pdf')).toBeInTheDocument();
  });

  it('calls onChange (onUpload) with updated file list', () => {
    render(<FileUpload onUpload={onUpload} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;

    const file = makeFile('doc.pdf', 500, 'application/pdf');
    fireEvent.change(input, { target: { files: [file] } });

    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(onUpload).toHaveBeenCalledWith([file]);
  });

  it('disables interaction when isUploading=true', () => {
    render(<FileUpload onUpload={onUpload} isUploading />);
    const dropZone = screen.getByRole('button');
    expect(dropZone.className).toContain('pointer-events-none');
  });

  it('shows progress bar when isUploading with progress', () => {
    const { container } = render(
      <FileUpload onUpload={onUpload} isUploading progress={50} />,
    );
    // progress bar track
    const progressBar = container.querySelector('[style*="width: 50%"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('handles drag and drop', () => {
    render(<FileUpload onUpload={onUpload} />);
    const dropZone = screen.getByRole('button');

    const file = makeFile('drop.pdf', 100, 'application/pdf');
    const dataTransfer = { files: [file] };

    fireEvent.dragOver(dropZone, { dataTransfer });
    fireEvent.drop(dropZone, { dataTransfer });

    expect(onUpload).toHaveBeenCalledWith([file]);
  });

  it('displays external error', () => {
    render(<FileUpload onUpload={onUpload} error="Upload failed" />);
    expect(screen.getByText('Upload failed')).toBeInTheDocument();
  });
});
