import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

import DarkModeToggle from '../DarkModeToggle';

describe('DarkModeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('cycles through light -> dark -> system modes on click', () => {
    // Start with 'system' default (nothing stored)
    render(<DarkModeToggle />);
    const button = screen.getByRole('button');

    // Initial mode is 'system', so label should be theme.system
    expect(button).toHaveAttribute('aria-label', 'theme.system');

    // Click: system -> light
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'theme.light');

    // Click: light -> dark
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'theme.dark');

    // Click: dark -> system
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-label', 'theme.system');
  });

  it('persists preference to localStorage', () => {
    render(<DarkModeToggle />);
    const button = screen.getByRole('button');

    // system -> light
    fireEvent.click(button);
    expect(localStorage.getItem('theme')).toBe('light');

    // light -> dark
    fireEvent.click(button);
    expect(localStorage.getItem('theme')).toBe('dark');

    // dark -> system
    fireEvent.click(button);
    expect(localStorage.getItem('theme')).toBe('system');
  });

  it('applies "dark" class on documentElement when mode is dark', () => {
    render(<DarkModeToggle />);
    const button = screen.getByRole('button');

    // system -> light
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // light -> dark
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('removes "dark" class when mode is light', () => {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    render(<DarkModeToggle />);
    const button = screen.getByRole('button');

    // dark -> system
    fireEvent.click(button);
    // system: matchMedia returns false by default in test-setup, so dark class removed
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // system -> light
    fireEvent.click(button);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});
