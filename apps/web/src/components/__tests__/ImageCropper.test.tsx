import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageCropper } from '../ui/ImageCropper';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock canvas context since jsdom doesn't support it
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
    clearRect: vi.fn(),
    drawImage: vi.fn(),
  })) as unknown as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = vi.fn(function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
  ) {
    cb(new Blob(['fake-image'], { type: 'image/jpeg' }));
  });
});

describe('ImageCropper', () => {
  const defaultProps = {
    src: 'blob:test-image-url',
    onCrop: vi.fn(),
    onCancel: vi.fn(),
  };

  it('renders image with crop source alt text', () => {
    render(<ImageCropper {...defaultProps} />);
    const img = screen.getByAltText('Image to crop');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'blob:test-image-url');
  });

  it('renders preview canvas', () => {
    const { container } = render(<ImageCropper {...defaultProps} />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders Preview label', () => {
    render(<ImageCropper {...defaultProps} />);
    expect(screen.getByText('imageCropper.preview')).toBeInTheDocument();
  });

  it('renders Cancel and Crop & Save buttons', () => {
    render(<ImageCropper {...defaultProps} />);
    expect(screen.getByText('imageCropper.cancel')).toBeInTheDocument();
    expect(screen.getByText('imageCropper.cropSave')).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ImageCropper {...defaultProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('imageCropper.cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCrop when Crop & Save button is clicked after image load', () => {
    const onCrop = vi.fn();
    render(<ImageCropper {...defaultProps} onCrop={onCrop} />);

    // Simulate image load to enable crop overlay
    const img = screen.getByAltText('Image to crop');
    fireEvent.load(img);

    fireEvent.click(screen.getByText('imageCropper.cropSave'));
    expect(onCrop).toHaveBeenCalledOnce();
    expect(onCrop.mock.calls[0][0]).toBeInstanceOf(Blob);
  });

  it('shows crop overlay after image loads', () => {
    const { container } = render(<ImageCropper {...defaultProps} />);
    const img = screen.getByAltText('Image to crop');

    // Before load: no crop rectangle with cursor-grab
    expect(container.querySelector('.cursor-grab')).toBeNull();

    fireEvent.load(img);

    // After load: crop rectangle appears
    expect(container.querySelector('.cursor-grab')).toBeInTheDocument();
  });
});
