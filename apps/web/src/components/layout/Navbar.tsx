import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

/**
 * Public site header — mirrors FrontMaster.Master:
 * fixed, transparent at top, turns solid primary (#005985) after 100px scroll.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();

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
      <nav aria-label="Main" className="container flex items-center justify-between px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3">
          <Link to="/" className="shrink-0">
            <img src="/image/logo.svg" alt="Aajiveka" className="h-12 w-auto sm:h-16" />
          </Link>
          <span className="hidden font-bold text-white md:inline">
            {t('nav.tollFree')} <span className="font-normal">{t('nav.tollFreeNumber')}</span>
          </span>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <LanguageSwitcher />
          <Link to="/">
            <Button variant="accent" size="sm">
              {t('nav.home')}
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="accent" size="sm">
              {t('nav.findJobs')}
            </Button>
          </Link>
          <Link to="/register" className="hidden sm:block">
            <Button variant="accent" size="sm">
              {t('nav.registerNow')}
            </Button>
          </Link>
          <Link to="/login" className="hidden md:block">
            <Button variant="accent" size="sm">
              {t('nav.employerLogin')}
            </Button>
          </Link>
          <Link to="/pricing" className="hidden sm:block">
            <Button variant="accent" size="sm">
              {t('nav.subscribeNow')}
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
