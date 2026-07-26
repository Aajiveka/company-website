import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Pagination } from '../Pagination';

describe('Pagination', () => {
  it('renders page buttons within the window', () => {
    render(<Pagination page={3} pageCount={10} onChange={vi.fn()} />);
    // Window of 2 around page 3: pages 1,2,3,4,5
    for (const p of [1, 2, 3, 4, 5]) {
      expect(screen.getByRole('button', { name: String(p) })).toBeInTheDocument();
    }
  });

  it('highlights current page with aria-current', () => {
    render(<Pagination page={2} pageCount={5} onChange={vi.fn()} />);
    expect(screen.getByText('2')).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('1')).not.toHaveAttribute('aria-current');
  });

  it('calls onChange with correct page number on click', () => {
    const onChange = vi.fn();
    render(<Pagination page={3} pageCount={10} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('disables prev button on first page', () => {
    render(<Pagination page={1} pageCount={5} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Previous page')).toBeDisabled();
  });

  it('does not disable prev button on a middle page', () => {
    render(<Pagination page={3} pageCount={5} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Previous page')).not.toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination page={5} pageCount={5} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Next page')).toBeDisabled();
  });

  it('does not disable next button on a middle page', () => {
    render(<Pagination page={3} pageCount={5} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Next page')).not.toBeDisabled();
  });

  it('returns null when pageCount is 1', () => {
    const { container } = render(<Pagination page={1} pageCount={1} onChange={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onChange with page-1 when prev is clicked', () => {
    const onChange = vi.fn();
    render(<Pagination page={3} pageCount={5} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Previous page'));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('calls onChange with page+1 when next is clicked', () => {
    const onChange = vi.fn();
    render(<Pagination page={3} pageCount={5} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('shows ellipsis when pages are windowed in the middle', () => {
    render(<Pagination page={5} pageCount={10} onChange={vi.fn()} />);
    const ellipses = screen.getAllByText('\u2026');
    expect(ellipses.length).toBe(2);
  });

  it('shows trailing ellipsis only when at the start', () => {
    render(<Pagination page={1} pageCount={10} onChange={vi.fn()} />);
    const ellipses = screen.getAllByText('\u2026');
    expect(ellipses.length).toBe(1);
  });

  it('shows leading ellipsis only when at the end', () => {
    render(<Pagination page={10} pageCount={10} onChange={vi.fn()} />);
    const ellipses = screen.getAllByText('\u2026');
    expect(ellipses.length).toBe(1);
  });
});
