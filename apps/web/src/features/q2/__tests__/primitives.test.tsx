import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchRing, ProfileBadge, RelevancePill, ScoreRow, StatusPill } from '../components/primitives';

/**
 * The Q2 atoms that carry meaning rather than decoration.
 *
 * The match ring and the relevance pill are how a matcher reads a row at a glance, and the
 * scoring checkbox is the only interactive control on the detail panel — so each is pinned to
 * what the Figma shows rather than left to visual review.
 */

describe('MatchRing', () => {
  it('exposes the score as a progressbar, not just as painted text', () => {
    render(<MatchRing score={94} />);
    const bar = screen.getByRole('progressbar', { name: 'JD match' });
    expect(bar).toHaveAttribute('aria-valuenow', '94');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('prints the number with the design’s smaller percent sign', () => {
    const { container } = render(<MatchRing score={50} />);
    expect(container.textContent).toBe('50%');
  });

  it('clamps the arc so an out-of-range score cannot overdraw the circle', () => {
    const { container } = render(<MatchRing score={140} />);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke-dasharray')).toBe('100 100');
  });

  it('draws no arc at zero rather than a full circle', () => {
    const { container } = render(<MatchRing score={0} />);
    const arc = container.querySelectorAll('circle')[1];
    expect(arc.getAttribute('stroke-dasharray')).toBe('0 100');
  });
});

describe('RelevancePill', () => {
  it('says Relevant or Not Relevant, as the ranking rows do', () => {
    const { rerender } = render(<RelevancePill relevant />);
    expect(screen.getByText('Relevant')).toBeInTheDocument();
    rerender(<RelevancePill relevant={false} />);
    expect(screen.getByText('Not Relevant')).toBeInTheDocument();
  });
});

describe('StatusPill', () => {
  it('labels each review status the way the sidebar names it', () => {
    const { rerender } = render(<StatusPill status="New" />);
    expect(screen.getByText('New')).toBeInTheDocument();
    rerender(<StatusPill status="Forwarded" />);
    expect(screen.getByText('Forwarded to Q3')).toBeInTheDocument();
    rerender(<StatusPill status="SentBackToQ1" />);
    expect(screen.getByText('Sent back to Q1')).toBeInTheDocument();
    rerender(<StatusPill status="Rejected" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();
  });
});

describe('ProfileBadge', () => {
  it('renders the "Profile n%" line the ranking rows show', () => {
    render(<ProfileBadge value={90} />);
    expect(screen.getByText('Profile 90%')).toBeInTheDocument();
  });
});

describe('ScoreRow', () => {
  const base = {
    label: 'Skill Match',
    score: 96,
    weight: 0.3,
    included: false,
    onToggle: vi.fn(),
  };

  it('shows the criterion, its weight chip and its sub-score', () => {
    render(<ScoreRow {...base} />);
    expect(screen.getByText('Skill Match')).toBeInTheDocument();
    expect(screen.getByText('w 30%')).toBeInTheDocument();
    expect(screen.getByText('96')).toBeInTheDocument();
  });

  it('ticks and unticks, reporting the next value', async () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ScoreRow {...base} onToggle={onToggle} />);
    const box = screen.getByRole('checkbox', { name: 'Skill Match' });
    expect(box).not.toBeChecked();

    await userEvent.click(box);
    expect(onToggle).toHaveBeenCalledWith(true);

    rerender(<ScoreRow {...base} included onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'Skill Match' }));
    expect(onToggle).toHaveBeenLastCalledWith(false);
  });

  it('is not clickable while a previous tick is still in flight', async () => {
    const onToggle = vi.fn();
    render(<ScoreRow {...base} disabled onToggle={onToggle} />);
    const box = screen.getByRole('checkbox', { name: 'Skill Match' });
    expect(box).toBeDisabled();
    await userEvent.click(box);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('labels the checkbox by its criterion, so seven rows are distinguishable', () => {
    render(
      <>
        <ScoreRow {...base} label="Skill Match" />
        <ScoreRow {...base} label="Notice Period" weight={0.05} score={82} />
      </>,
    );
    expect(screen.getByRole('checkbox', { name: 'Skill Match' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Notice Period' })).toBeInTheDocument();
  });
});
