import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentGuidePage from '../StudentGuidePage';

/**
 * The student handbook page reached from the navbar's Login menu: the book has to be shown
 * inline AND offered as a download, since most mobile browsers refuse to embed a PDF.
 */
describe('StudentGuidePage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <StudentGuidePage />
      </MemoryRouter>,
    );

  it('embeds the handbook', () => {
    const { container } = renderPage();
    const embed = container.querySelector('object');
    expect(embed).toHaveAttribute('data', '/api/site-docs/aajivika-book');
    expect(embed).toHaveAttribute('type', 'application/pdf');
  });

  it('offers the download under the viewer, and again as the no-preview fallback', () => {
    const { container } = renderPage();
    const downloads = container.querySelectorAll('a[download]');
    expect(downloads.length).toBe(2);
    downloads.forEach((a) => {
      expect(a).toHaveAttribute('href', '/api/site-docs/aajivika-book/download');
      expect(a).toHaveAttribute('download', 'Aajivika-Book.pdf');
    });
  });

  it('links to the file in a new tab as well', () => {
    const { container } = renderPage();
    // Queried by attribute, not label: the test renderer has no translation bundle loaded.
    const external = container.querySelectorAll('a[target="_blank"]');
    expect(external.length).toBe(2);
    external.forEach((a) => {
      expect(a).toHaveAttribute('href', '/api/site-docs/aajivika-book');
      expect(a).toHaveAttribute('rel', 'noreferrer');
    });
  });
});
