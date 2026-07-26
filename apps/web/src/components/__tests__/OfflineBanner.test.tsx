import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock the useOnlineStatus hook so we can control the online state
const mockUseOnlineStatus = vi.fn(() => ({ isOnline: true }));
vi.mock('@/hooks/useOffline', () => ({
  useOnlineStatus: () => mockUseOnlineStatus(),
}));

import OfflineBanner from '../OfflineBanner';

describe('OfflineBanner', () => {
  beforeEach(() => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: true });
  });

  it('hides banner (translate-y-full) when online', () => {
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('translate-y-full');
  });

  it('shows banner (translate-y-0) when offline', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false });
    render(<OfflineBanner />);
    const banner = screen.getByRole('alert');
    expect(banner.className).toContain('translate-y-0');
    expect(banner.className).not.toContain('translate-y-full');
  });

  it('has role="alert"', () => {
    render(<OfflineBanner />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('displays the offline message key', () => {
    mockUseOnlineStatus.mockReturnValue({ isOnline: false });
    render(<OfflineBanner />);
    expect(screen.getByText('offline.message')).toBeInTheDocument();
  });
});
