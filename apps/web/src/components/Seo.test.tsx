import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Seo } from './Seo';

describe('Seo', () => {
  it('renders title with site name', () => {
    render(<Seo title="Find Jobs" />);
    expect(document.title).toBe('Find Jobs | Aajiveka');
  });

  it('renders special title for Home', () => {
    render(<Seo title="Home" />);
    expect(document.title).toBe('Aajiveka | Your Ultimate Career Partner');
  });

  it('renders meta description', () => {
    render(<Seo title="Test" description="A test description" />);
    const meta = document.querySelector('meta[name="description"]');
    expect(meta).toHaveAttribute('content', 'A test description');
  });

  it('renders canonical URL', () => {
    render(<Seo title="About" path="/about" />);
    const link = document.querySelector('link[rel="canonical"]');
    expect(link).toHaveAttribute('href', 'https://aajiveka.com/about');
  });

  it('renders Open Graph tags', () => {
    render(<Seo title="Jobs" path="/jobs" />);
    const ogTitle = document.querySelector('meta[property="og:title"]');
    expect(ogTitle).toHaveAttribute('content', 'Jobs | Aajiveka');
  });

  it('renders noindex when specified', () => {
    render(<Seo title="Login" noIndex />);
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).toHaveAttribute('content', 'noindex,nofollow');
  });

  it('does not render noindex by default', () => {
    render(<Seo title="Home" />);
    const robots = document.querySelector('meta[name="robots"]');
    expect(robots).toBeNull();
  });
});
