import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders when open=true', () => {
    render(
      <Modal open onClose={vi.fn()} title="Test Modal">
        <p>Modal body</p>
      </Modal>,
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('does not render when open=false', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        <p>Should not show</p>
      </Modal>,
    );
    expect(screen.queryByText('Should not show')).not.toBeInTheDocument();
  });

  it('shows title', () => {
    render(
      <Modal open onClose={vi.fn()} title="My Title">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('shows a sr-only fallback title when no title is provided', () => {
    render(
      <Modal open onClose={vi.fn()}>
        <p>No title</p>
      </Modal>,
    );
    // Radix requires a title; component renders "Dialog" as sr-only
    expect(screen.getByText('Dialog')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Closable">
        <p>Close me</p>
      </Modal>,
    );
    await userEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledOnce();
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
});
