import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

/**
 * Public site header — mirrors FrontMaster.Master:
 * fixed, transparent at top, turns solid primary (#005985) after 100px scroll.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY >= 100);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[999] transition-colors duration-300',
        scrolled ? 'bg-primary shadow-md' : 'bg-transparent',
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

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <Link to="/">
            <Button variant="accent" size="sm">
              Home
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="accent" size="sm">
              Find Jobs
            </Button>
          </Link>
          <Link to="/register" className="hidden sm:block">
            <Button variant="accent" size="sm">
              Register Now
            </Button>
          </Link>
          <Link to="/login" className="hidden md:block">
            <Button variant="accent" size="sm">
              Employer Login
            </Button>
          </Link>
          <Link to="/pricing" className="hidden sm:block">
            <Button variant="accent" size="sm">
              Subscribe Now
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
