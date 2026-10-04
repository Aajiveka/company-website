import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CalendarClock,
  ChevronDown,
  ClipboardCheck,
  GraduationCap,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, Dropdown, buttonVariants } from '@/components/ui';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { ThemeToggle } from '@/components/ThemeToggle';
import { hasHeroBehindHeader } from './publicChrome';
import {
  LOGIN_PORTALS,
  LOGIN_PORTAL_ORDER,
  LOGIN_PORTAL_PARAM,
} from '@/features/auth/loginPortals';

const PORTAL_ICON = {
  candidate: User,
  employer: Building2,
  // The three recruitment stages, in pipeline order: screen → refer → interview.
  qc1: ClipboardCheck,
  qc2: Send,
  q3: CalendarClock,
  admin: ShieldCheck,
} as const;

/**
 * Public site header — mirrors FrontMaster.Master:
 * fixed, transparent at top, turns solid primary (#005985) after 100px scroll.
 *
 * The transparent state assumes a dark hero underneath, so it is reserved for the routes that
 * have one (see `hasHeroBehindHeader`). Everywhere else the header starts solid rather than
 * waiting for a scroll that never comes — on a pale page, white-on-white left the logo and
 * toll-free number unreadable. Solid is the default so a new route is right without being
 * listed anywhere.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const solid = scrolled || !hasHeroBehindHeader(pathname);

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
        solid ? 'bg-primary shadow-md' : 'bg-transparent',
      )}
    >
      <nav
        aria-label="Main"
        className="container flex items-center justify-between px-3 py-3 sm:px-4"
      >
        <Link to="/" className="shrink-0">
          <img
            src="/image/logo.svg"
            alt="Aajiveka"
            className="h-12 w-auto sm:h-16"
            width={120}
            height={64}
            decoding="async"
          />
        </Link>

        <div className="flex items-center gap-1 sm:gap-2 md:gap-3">
          <ThemeToggle />
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
          <div className="hidden md:block">
            <Dropdown
              trigger={
                <span className={cn(buttonVariants({ variant: 'accent', size: 'sm' }))}>
                  {t('nav.login')}
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </span>
              }
              items={LOGIN_PORTAL_ORDER.map((portal) => {
                const Icon = PORTAL_ICON[portal];
                return {
                  label: t(LOGIN_PORTALS[portal].labelKey),
                  icon: <Icon className="h-4 w-4" aria-hidden />,
                  onSelect: () => navigate(`/login?${LOGIN_PORTAL_PARAM}=${portal}`),
                };
              })}
            />
          </div>
          {/* <Link to="/pricing" className="hidden sm:block">
            <Button variant="accent" size="sm">
              {t('nav.subscribeNow')}
            </Button>
          </Link> */}
          {/* The handbook is a public resource, not a login door — it sits with the other links. */}
          <Link to="/student">
            <Button variant="accent" size="sm">
              <GraduationCap className="h-4 w-4" aria-hidden />
              {t('nav.student')}
            </Button>
          </Link>
        </div>
      </nav>
    </header>
  );
}
