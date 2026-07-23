import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('renders nothing when pageCount <= 1', () => {
    const { container } = render(
      <Pagination page={1} pageCount={1} onChange={() => {}} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders page buttons for a small page count', () => {
    render(<Pagination page={1} pageCount={3} onChange={() => {}} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('marks the active page with aria-current', () => {
    render(<Pagination page={2} pageCount={5} onChange={() => {}} />);
    expect(screen.getByText('2')).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('1')).toHaveAttribute('aria-current', 'false');
  });

  it('disables previous button on first page', () => {
    render(<Pagination page={1} pageCount={5} onChange={() => {}} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination page={5} pageCount={5} onChange={() => {}} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('calls onChange when a page button is clicked', async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} pageCount={5} onChange={onChange} />);

    await userEvent.click(screen.getByText('4'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('calls onChange with page-1 on previous click', async () => {
    const onChange = vi.fn();
    render(<Pagination page={3} pageCount={5} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Previous page'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange with page+1 on next click', async () => {
    const onChange = vi.fn();
    render(<Pagination page={3} pageCount={5} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Next page'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('shows ellipsis when pages are windowed', () => {
    render(<Pagination page={5} pageCount={10} onChange={() => {}} />);
    const ellipses = screen.getAllByText('…');
    // Should have ellipsis on both sides (before 3 and after 7)
    expect(ellipses.length).toBe(2);
  });

  it('shows leading ellipsis only when at the end', () => {
    render(<Pagination page={10} pageCount={10} onChange={() => {}} />);
    const ellipses = screen.getAllByText('…');
    expect(ellipses.length).toBe(1);
  });

  it('shows trailing ellipsis only when at the start', () => {
    render(<Pagination page={1} pageCount={10} onChange={() => {}} />);
    const ellipses = screen.getAllByText('…');
    expect(ellipses.length).toBe(1);
  });
});
