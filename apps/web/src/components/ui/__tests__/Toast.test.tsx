import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider, useToast } from '../Toast';

function TestConsumer() {
  const { notify } = useToast();
  return (
    <div>
      <button onClick={() => notify('Success!', 'success')}>success</button>
      <button onClick={() => notify('Error!', 'error')}>error</button>
      <button onClick={() => notify('Info!')}>info</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>,
  );
}

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('throws when useToast is used outside provider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow(
      'useToast must be used within <ToastProvider>',
    );
    spy.mockRestore();
  });

  it('shows a success toast when notify is called', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText('success'));
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('shows an error toast', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText('error'));
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('defaults to info kind', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText('info'));
    expect(screen.getByText('Info!')).toBeInTheDocument();
  });

  it('auto-dismisses toast after 4 seconds', async () => {
    vi.useFakeTimers();
    renderWithProvider();

    // Trigger notify directly via act to avoid userEvent + fake timers conflict
    const button = screen.getByText('success');
    act(() => {
      button.click();
    });
    expect(screen.getByText('Success!')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4000);
    });

    expect(screen.queryByText('Success!')).not.toBeInTheDocument();
  });

  it('dismisses toast on close button click', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText('success'));
    expect(screen.getByText('Success!')).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText('Dismiss'));
    expect(screen.queryByText('Success!')).not.toBeInTheDocument();
  });

  it('can show multiple toasts', async () => {
    renderWithProvider();
    await userEvent.click(screen.getByText('success'));
    await userEvent.click(screen.getByText('error'));

    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });
});
