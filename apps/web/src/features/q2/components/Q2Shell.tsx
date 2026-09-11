import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  LogOut,
  Menu,
  Search,
  Send,
  ShieldCheck,
  Target,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useQ2NavCounts, useQ2Sla } from '../q2.api';
import { initialsOf } from '../q2.format';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: 'employerJobs' | 'allApplicants';
}

/**
 * The sidebar, in the Figma's order. "Match Analytics" sits below a rule, exactly as
 * "Analytics & Reports" does in the Q1 designs.
 */
const NAV: NavItem[] = [
  { to: '/q2/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/q2/jobs', label: 'Employer Jobs', icon: Briefcase, badge: 'employerJobs' },
  { to: '/q2/applicants', label: 'All Applicants', icon: Users, badge: 'allApplicants' },
  { to: '/q2/forwarded', label: 'Forwarded to Q3', icon: ShieldCheck },
  { to: '/q2/sent-back', label: 'Sent back to Q1', icon: Send },
];

const ANALYTICS: NavItem = { to: '/q2/analytics', label: 'Match Analytics', icon: BarChart3 };

/** Where the sidebar-collapse preference lives. Per-viewer, per-browser. */
const COLLAPSE_KEY = 'aajiveka.q2.sidebarCollapsed';

/**
 * The Q2 workspace chrome: fixed sidebar, sticky topbar, canvas.
 *
 * Deliberately not DashboardLayout, for the same reason Q1Shell is not: that shell renders
 * its own `useBreadcrumbs()` row on top of whatever the page draws, and its sidebar comes
 * from the shared role menu. The Q2 designs have no breadcrumbs, a sidebar with count badges,
 * and a "Matching SLA" card pinned to the bottom.
 *
 * It is a sibling of Q1Shell rather than a generalisation of it. The two look alike today but
 * are driven by different nav, badges and SLA copy, and folding them together would mean one
 * component branching on role in six places — which is how the guard bug in 2eb4db7 started.
 */
export function Q2Shell({
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
  const { data: counts } = useQ2NavCounts();
  const [mobileOpen, setMobileOpen] = useState(false);
  /**
   * The Figma's 32px circular chevron straddling the sidebar edge (node 166:4892) collapses
   * the desktop sidebar.
   *
   * Persisted rather than kept in component state: every Q2 page renders its own Q2Shell, so
   * a plain useState would spring the sidebar back open on each navigation and make the
   * control useless. Reads and writes are guarded — a private window or blocked site data
   * makes localStorage throw, and that must not take the workspace down with it.
   */
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () =>
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        // Preference simply does not persist; the toggle still works for this page view.
      }
      return next;
    });

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
    k === 'employerJobs'
      ? counts?.employerJobs
      : k === 'allApplicants'
        ? counts?.allApplicants
        : undefined;

  const navLink = ({ to, label, icon: Icon, badge }: NavItem) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setMobileOpen(false)}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q2-blue/40',
          isActive
            ? 'bg-q2-blue-soft text-q2-blue dark:bg-q2-blue/20'
            : 'text-q2-ink-soft hover:bg-q2-chip dark:text-gray-300 dark:hover:bg-gray-700',
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {badgeFor(badge) != null && (
        <span className="rounded-full bg-q2-chip px-2 py-0.5 text-[11px] font-bold text-q2-ink-soft dark:bg-gray-700 dark:text-gray-200">
          {badgeFor(badge)}
        </span>
      )}
    </NavLink>
  );

  const sidebar = (
    <div className="flex h-full flex-col gap-1 overflow-y-auto px-4 pb-4">
      <div className="flex items-center gap-2.5 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-q2-blue text-sm font-bold text-white">
          A
        </span>
        <span className="font-display text-lg font-extrabold text-q2-ink dark:text-white">
          Aajiveka
        </span>
      </div>
      <nav className="flex flex-col gap-1">{NAV.map(navLink)}</nav>
      <hr className="my-3 border-q2-line dark:border-gray-700" />
      <nav className="flex flex-col gap-1">{navLink(ANALYTICS)}</nav>
      <div className="mt-auto pt-6">
        <SlaCard />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-q2-canvas dark:bg-gray-900">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-q2-line bg-q2-surface dark:border-gray-700 dark:bg-gray-800',
          collapsed ? 'lg:hidden' : 'lg:block',
        )}
      >
        {sidebar}
      </aside>

      {/* The collapse toggle, centred on the sidebar's edge exactly as the design places it. */}
      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        className={cn(
          'fixed top-4 z-40 hidden h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full',
          'border border-q2-line bg-q2-surface text-q2-ink-soft shadow-q2-card transition',
          'hover:bg-q2-chip focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q2-blue/40',
          'lg:flex dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
          collapsed ? 'left-4 translate-x-0' : 'left-60',
        )}
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        )}
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-q2-line bg-q2-surface lg:hidden dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-full p-1.5 text-q2-muted hover:bg-q2-chip"
              aria-label={t('actions.close')}
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </>
      )}

      <div className={collapsed ? undefined : 'lg:pl-60'}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b border-q2-line bg-q2-surface/95 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-q2-ink-soft hover:bg-q2-chip lg:hidden"
              aria-label={t('q2.openMenu')}
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-lg font-extrabold text-q2-ink dark:text-white">
                {title}
              </h1>
              <p className="truncate text-[13px] text-q2-muted">{subtitle}</p>
            </div>

            <label className="relative hidden md:block">
              <span className="sr-only">{t('q2.quickSearch')}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-q2-muted" />
              <input
                type="search"
                placeholder={t('q2.quickSearch')}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (v.length > 2) navigate(`/q2/applicants?search=${encodeURIComponent(v)}`);
                }}
                className="h-10 w-52 rounded-full border border-q2-line bg-q2-canvas pl-9 pr-4 text-sm text-q2-ink outline-none transition focus:border-q2-blue focus:ring-2 focus:ring-q2-blue/20 lg:w-64 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
              />
            </label>

            <NotificationBell />

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex items-center gap-2 rounded-full border border-q2-line py-1.5 pl-1.5 pr-3 transition hover:bg-q2-chip dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-q2-amber-soft font-display text-xs font-bold text-q2-amber">
                  {initialsOf(user?.fullName ?? 'Q2')}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block text-xs font-bold text-q2-ink dark:text-gray-100">
                    {user?.fullName ?? t('q2.matcher')}
                  </span>
                  <span className="block text-[11px] text-q2-muted">{t('q2.matcher')}</span>
                </span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-q2-line bg-q2-surface p-1 shadow-q2-pop dark:border-gray-700 dark:bg-gray-800"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-q2-ink-soft hover:bg-q2-chip dark:text-gray-200 dark:hover:bg-gray-700"
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

/**
 * The blue card pinned to the bottom of the sidebar: "Matching SLA — 7 of 10 applicants
 * matched today. 3 awaiting review."
 */
function SlaCard() {
  const { t } = useTranslation('common');
  const { data } = useQ2Sla();
  const total = data?.total ?? 0;
  const matched = data?.matched ?? 0;
  const awaiting = data?.awaiting ?? 0;
  const percent = total ? Math.round((matched / total) * 100) : 0;

  return (
    <div className="rounded-xl bg-q2-blue p-4 text-white">
      <p className="flex items-center gap-1.5 font-display text-sm font-bold">
        <Target className="h-4 w-4" aria-hidden />
        {t('q2.sla.title')}
      </p>
      <p className="mt-1.5 text-xs text-white/85">
        {t('q2.sla.body', { matched, total, awaiting })}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
        <div className="h-full rounded-full bg-white" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
