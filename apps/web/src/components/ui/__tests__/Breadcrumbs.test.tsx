import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

function renderBreadcrumbs(items: { label: string; to?: string }[]) {
  return render(
    <MemoryRouter>
      <Breadcrumbs items={items} />
    </MemoryRouter>,
  );
}

describe('Breadcrumbs', () => {
  it('renders a nav with aria-label', () => {
    renderBreadcrumbs([{ label: 'Home', to: '/' }]);
    expect(screen.getByLabelText('Breadcrumb')).toBeInTheDocument();
  });

  it('renders all breadcrumb labels', () => {
    renderBreadcrumbs([
      { label: 'Home', to: '/' },
      { label: 'Jobs', to: '/jobs' },
      { label: 'Details' },
    ]);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  it('renders links for non-last items with "to" prop', () => {
    renderBreadcrumbs([
      { label: 'Home', to: '/' },
      { label: 'Jobs', to: '/jobs' },
      { label: 'Details' },
    ]);
    const homeLink = screen.getByText('Home').closest('a');
    expect(homeLink).toHaveAttribute('href', '/');

    const jobsLink = screen.getByText('Jobs').closest('a');
    expect(jobsLink).toHaveAttribute('href', '/jobs');
  });

  it('renders the last item as a span, not a link', () => {
    renderBreadcrumbs([
      { label: 'Home', to: '/' },
      { label: 'Current' },
    ]);
    const current = screen.getByText('Current');
    expect(current.tagName).toBe('SPAN');
    expect(current.closest('a')).toBeNull();
  });

  it('renders chevron separators between items', () => {
    const { container } = renderBreadcrumbs([
      { label: 'A', to: '/' },
      { label: 'B', to: '/b' },
      { label: 'C' },
    ]);
    // There should be 2 separators for 3 items
    const separators = container.querySelectorAll('[aria-hidden]');
    expect(separators.length).toBe(2);
  });

  it('renders single item without separator', () => {
    const { container } = renderBreadcrumbs([{ label: 'Only' }]);
    const separators = container.querySelectorAll('[aria-hidden]');
    expect(separators.length).toBe(0);
  });
});
