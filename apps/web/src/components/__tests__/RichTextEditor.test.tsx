import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import RichTextEditor from '@/components/RichTextEditor';

beforeAll(() => {
  // jsdom doesn't have execCommand / queryCommandState
  document.execCommand = vi.fn().mockReturnValue(true);
  document.queryCommandState = vi.fn().mockReturnValue(false);
});

describe('RichTextEditor', () => {
  it('renders the editor with a textbox role', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders toolbar buttons for bold, italic, underline', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Underline')).toBeInTheDocument();
  });

  it('renders list and link toolbar buttons', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Bullet list')).toBeInTheDocument();
    expect(screen.getByLabelText('Numbered list')).toBeInTheDocument();
    expect(screen.getByLabelText('Link')).toBeInTheDocument();
  });

  it('shows placeholder when value is empty', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} placeholder="Write here..." />);
    expect(screen.getByText('Write here...')).toBeInTheDocument();
  });

  it('shows default placeholder when none specified', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    expect(screen.getByText('Start typing...')).toBeInTheDocument();
  });

  it('hides placeholder when value has content', () => {
    render(<RichTextEditor value="<p>Hello</p>" onChange={vi.fn()} />);
    expect(screen.queryByText('Start typing...')).not.toBeInTheDocument();
  });

  it('calls execCommand when bold button is clicked', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText('Bold'));
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, undefined);
  });

  it('calls execCommand when italic button is clicked', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText('Italic'));
    expect(document.execCommand).toHaveBeenCalledWith('italic', false, undefined);
  });

  it('calls execCommand when underline button is clicked', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} />);
    fireEvent.mouseDown(screen.getByLabelText('Underline'));
    expect(document.execCommand).toHaveBeenCalledWith('underline', false, undefined);
  });

  it('applies custom minHeight to editor area', () => {
    render(<RichTextEditor value="" onChange={vi.fn()} minHeight="300px" />);
    const editor = screen.getByRole('textbox');
    expect(editor.style.minHeight).toBe('300px');
  });
});
