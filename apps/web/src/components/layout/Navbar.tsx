import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/jobs', label: 'Find Jobs' },
  { to: '/register', label: 'Register Now' },
  { to: '/login', label: 'Employer Login' },
  { to: '/pricing', label: 'Subscribe Now' },
] as const;

/**
 * Public site header — mirrors FrontMaster.Master:
 * fixed, transparent at top, turns solid primary (#005985) after 100px scroll.
 * Hamburger menu on mobile shows all nav links in a drawer.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 100);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on navigation
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[999] transition-colors duration-300',
        scrolled || menuOpen ? 'bg-primary shadow-md' : 'bg-transparent',
      )}
    >
      <div className="container flex items-center justify-between px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="shrink-0">
            <img src="/image/logo.svg" alt="Aajiveka" className="h-12 w-auto sm:h-16" />
          </Link>
          <span className="hidden font-bold text-white md:inline">
            Toll Free No: <span className="font-normal">18003093346</span>
          </span>
        </div>

        {/* Desktop nav */}
        <nav aria-label="Main navigation" className="hidden items-center gap-2 md:flex md:gap-3">
          {NAV_LINKS.map((link) => (
            <Link key={link.to} to={link.to}>
              <Button variant="accent" size="sm">
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Hamburger toggle */}
        <button
          className="rounded-lg p-2 text-white hover:bg-white/10 md:hidden"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <nav aria-label="Main navigation" className="border-t border-white/15 bg-primary px-3 pb-4 pt-2 md:hidden">
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="rounded-lg px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="mt-3 border-t border-white/15 pt-3">
            <a href="tel:18003093346" className="flex items-center gap-2 px-4 text-sm text-white/80">
              Toll Free No: <span className="font-bold text-white">18003093346</span>
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
