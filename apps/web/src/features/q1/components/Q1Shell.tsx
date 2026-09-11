import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  BellOff,
  Clock,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Trash2,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useQ1NavCounts } from '../q1.api';
import { initialsOf } from '../q1.format';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'candidates' | 'followUps';
}

const NAV: NavItem[] = [
  { to: '/q1/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/q1/candidates', label: 'Candidates', icon: ListChecks, badge: 'candidates' },
  { to: '/q1/follow-ups', label: 'Follow-ups', icon: Clock, badge: 'followUps' },
  { to: '/q1/no-response', label: 'No Response', icon: BellOff },
  { to: '/q1/verified', label: 'Verified Candidates', icon: ShieldCheck },
  { to: '/q1/not-interested', label: 'Not Interested', icon: Trash2 },
];

const ANALYTICS: NavItem = { to: '/q1/analytics', label: 'Analytics & Reports', icon: BarChart3 };

/**
 * The Q1 workspace chrome: fixed sidebar, sticky topbar, canvas.
 *
 * Deliberately not DashboardLayout. That shell renders its own `useBreadcrumbs()` row on top
 * of whatever the page draws — which is why every existing recruitment screen shows two
 * stacked breadcrumb rows — and its sidebar is driven by the shared role menu. The Q1 designs
 * have no breadcrumbs at all, a section-labelled sidebar with count badges, and an SLA card
 * pinned to the bottom, so it gets its own chrome rather than DashboardLayout plus overrides.
 */
export function Q1Shell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { t } = useTranslation('common');
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: counts } = useQ1NavCounts();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the drawer on navigation — otherwise it stays over the page it just opened.
  useEffect(() => {
    if (!mobileOpen) return;
    const close = () => setMobileOpen(false);
    window.addEventListener('popstate', close);
    return () => window.removeEventListener('popstate', close);
  }, [mobileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const badgeFor = (k?: NavItem['badge']) =>
    k === 'candidates' ? counts?.candidates : k === 'followUps' ? counts?.followUps : undefined;

  const navLink = ({ to, label, icon: Icon, badge }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q1-blue/40',
          isActive
            ? 'bg-q1-blue-soft text-q1-blue dark:bg-q1-blue/20'
            : 'text-q1-ink-soft hover:bg-q1-chip dark:text-gray-300 dark:hover:bg-gray-700',
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {badgeFor(badge) != null && (
        <span className="rounded-full bg-q1-chip px-2 py-0.5 text-[11px] font-bold text-q1-ink-soft dark:bg-gray-700 dark:text-gray-200">
          {badgeFor(badge)}
        </span>
      )}
    </NavLink>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-1 overflow-y-auto px-4 pb-4">
      <div className="flex items-center gap-2.5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-q1-blue text-sm font-bold text-white">
          A
        </span>
        <span className="font-display text-lg font-extrabold text-q1-ink dark:text-white">Aajiveka</span>
      </div>
      <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-q1-muted">
        {t('q1.sectionLabel')}
      </p>
      <nav className="flex flex-col gap-1">{NAV.map(navLink)}</nav>
      <hr className="my-3 border-q1-line dark:border-gray-700" />
      <nav className="flex flex-col gap-1">{navLink(ANALYTICS)}</nav>
      <div className="mt-auto pt-6">
        <SlaCard />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-q1-canvas dark:bg-gray-900">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-q1-line bg-q1-surface lg:block dark:border-gray-700 dark:bg-gray-800">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-q1-line bg-q1-surface lg:hidden dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-full p-1.5 text-q1-muted hover:bg-q1-chip"
              aria-label={t('actions.close')}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </>
      )}

      <div className="lg:pl-60">
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-q1-line bg-q1-surface/95 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-q1-ink-soft hover:bg-q1-chip lg:hidden"
              aria-label={t('q1.openMenu')}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-extrabold text-q1-ink dark:text-white">
                {title}
              </h1>
              <p className="truncate text-[13px] text-q1-muted">{subtitle}</p>
            </div>

            <label className="relative hidden md:block">
              <span className="sr-only">{t('q1.quickSearch')}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q1-muted" />
              <input
                type="search"
                placeholder={t('q1.quickSearch')}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (v.length > 2) navigate(`/q1/candidates?search=${encodeURIComponent(v)}`);
                }}
                className="h-10 w-52 rounded-full border border-q1-line bg-q1-canvas pl-9 pr-4 text-sm text-q1-ink outline-none transition focus:border-q1-blue focus:ring-2 focus:ring-q1-blue/20 lg:w-64 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </label>

            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full border border-q1-line py-1.5 pl-1.5 pr-3 transition hover:bg-q1-chip dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-q1-amber-soft font-display text-xs font-bold text-q1-amber">
                  {initialsOf(user?.fullName ?? 'Q1')}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-bold text-q1-ink dark:text-gray-100">
                    {user?.fullName ?? t('q1.screener')}
                  </span>
                  <span className="block text-[11px] text-q1-muted">{t('q1.screener')}</span>
                </span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-q1-line bg-q1-surface p-1 shadow-q1-pop dark:border-gray-700 dark:bg-gray-800"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-q1-ink-soft hover:bg-q1-chip dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-5 sm:px-6 sm:py-6">{children}</main>
      </div>
    </div>
  );
}

/** The blue card pinned to the bottom of the sidebar. */
function SlaCard() {
  const { t } = useTranslation('common');
  const { data } = useQ1NavCounts();
  // The queue is what is left to clear; "cleared" is everything already off it.
  const left = data?.candidates ?? 0;
  const followUps = data?.followUps ?? 0;
  const totalToday = left + followUps;
  const cleared = totalToday ? Math.round((followUps / totalToday) * 100) : 100;

  return (
    <div className="rounded-xl bg-q1-blue p-4 text-white">
      <p className="font-display text-sm font-bold">{t('q1.sla.title')}</p>
      <p className="mt-1.5 text-xs text-white/85">{t('q1.sla.body', { percent: cleared, count: left })}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white" style={{ width: `${cleared}%` }} />
      </div>
    </div>
  );
}
