import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders when open is true', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    render(
      <Modal open={false} onClose={vi.fn()}>
        <p>Modal content</p>
      </Modal>,
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Test">
        <p>Content</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose}>
        <p>Content</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the title when provided', () => {
    render(
      <Modal open onClose={vi.fn()} title="My Title">
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('renders children content', () => {
    render(
      <Modal open onClose={vi.fn()} title="Parent">
        <div data-testid="child">Child content</div>
      </Modal>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders a sr-only fallback title when title prop is omitted', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.getByText('Dialog')).toBeInTheDocument();
  });
});
