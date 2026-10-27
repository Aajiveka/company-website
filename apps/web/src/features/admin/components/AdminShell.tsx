import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Briefcase,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileText,
  GitBranch,
  History,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  UserCheck,
  Users,
  Waypoints,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { NotificationBell } from '@/components/layout/NotificationBell';
import DarkModeToggle from '@/components/DarkModeToggle';
import { Breadcrumbs, type Crumb } from '@/components/ui';
import { useAdminStats } from '../admin.api';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Matches only the exact path — the dashboard would otherwise light up on every page. */
  end?: boolean;
  badge?: 'pendingEmployers';
}

/**
 * Grouped by what the admin is doing: the business records first, then the content and
 * configuration the panel owns, then the read-only views, then the role workspaces Admin is
 * allowed into (router.tsx) — where every pipeline transition actually happens.
 */
const NAV: { heading?: string; items: NavItem[] }[] = [
  { items: [{ to: '/admin', label: 'Dashboard', icon: LayoutGrid, end: true }] },
  {
    heading: 'Manage',
    items: [
      { to: '/admin/users', label: 'Users & staff', icon: Users },
      { to: '/admin/employer-approvals', label: 'Employer approvals', icon: UserCheck, badge: 'pendingEmployers' },
      { to: '/admin/companies', label: 'Companies', icon: Building2 },
      { to: '/admin/jobs', label: 'Jobs', icon: Briefcase },
      { to: '/admin/applications', label: 'Applications', icon: GitBranch },
    ],
  },
  {
    heading: 'Content & settings',
    items: [
      { to: '/admin/blog', label: 'Blog', icon: FileText },
      { to: '/admin/settings', label: 'Settings', icon: Settings },
    ],
  },
  {
    heading: 'Insight',
    items: [
      { to: '/admin/reports', label: 'Reports & exports', icon: BarChart3 },
      { to: '/admin/audit', label: 'Audit log', icon: History },
    ],
  },
  {
    heading: 'Workspaces',
    items: [
      { to: '/q1/dashboard', label: 'Q1 · Screening', icon: ClipboardCheck },
      { to: '/q2/dashboard', label: 'Q2 · Matching', icon: Waypoints },
      { to: '/q3/dashboard', label: 'Q3 · Hiring ops', icon: ShieldCheck },
    ],
  },
];

/** Per-viewer, per-browser sidebar preference; every read and write is guarded. */
const COLLAPSE_KEY = 'aajiveka.admin.sidebarCollapsed';

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join('') || 'A'
  );
}

/**
 * The admin panel chrome: fixed sidebar (a drawer below lg), sticky header with title,
 * breadcrumbs, notifications and profile menu.
 *
 * A sibling of Q2Shell rather than DashboardLayout for the reason Q1–Q3 give: DashboardLayout
 * adds its own breadcrumb row on top of the page's, which is how every admin page ended up
 * with two, and its sidebar comes from the shared role menu, which had no room for the
 * panel's grouping or the pending-approvals badge.
 */
export function AdminShell({
  title,
  subtitle,
  crumbs,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const { data: stats } = useAdminStats();
  const [mobileOpen, setMobileOpen] = useState(false);
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
        // Preference does not persist; the toggle still works for this page view.
      }
      return next;
    });

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // A new page closes the drawer, otherwise it stays over the page it just opened.
  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false);
    document.addEventListener('keydown', onKey);
    // The page behind a modal drawer must not scroll under a finger.
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
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

  useEffect(() => {
    document.title = `${title} · Aajiveka Admin`;
  }, [title]);

  const badgeFor = (k?: NavItem['badge']) =>
    k === 'pendingEmployers' && stats?.employers.pendingRegistrations ? stats.employers.pendingRegistrations : null;

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto px-3 pb-4">
      <div className="flex items-center gap-2.5 px-2 py-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-aj-blue text-sm font-bold text-white">
          A
        </span>
        <span className="leading-tight">
          <span className="block font-display text-base font-extrabold text-navy dark:text-white">Aajiveka</span>
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-aj-blue">Admin panel</span>
        </span>
      </div>
      <nav aria-label="Admin" className="flex flex-col gap-4">
        {NAV.map((group, gi) => (
          <div key={gi}>
            {group.heading && (
              <p className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {group.heading}
              </p>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon, end, badge }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      cn(
                        'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aj-blue/40',
                        isActive
                          ? 'bg-aj-line-soft text-aj-blue dark:bg-aj-blue/20 dark:text-blue-200'
                          : 'text-gray-600 hover:bg-aj-surface-soft hover:text-navy dark:text-gray-300 dark:hover:bg-gray-700/60',
                      )
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                    <span className="flex-1 truncate">{label}</span>
                    {badgeFor(badge) != null && (
                      <span
                        className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"
                        aria-label={`${badgeFor(badge)} pending`}
                      >
                        {badgeFor(badge)}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-aj-canvas dark:bg-gray-900">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-aj-line bg-white dark:border-gray-700 dark:bg-gray-800',
          collapsed ? 'lg:hidden' : 'lg:block',
        )}
      >
        {sidebar}
      </aside>

      <button
        type="button"
        onClick={toggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className={cn(
          'fixed top-5 z-40 hidden h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full',
          'border border-aj-line bg-white text-gray-500 shadow-aj-card transition hover:bg-aj-surface-soft',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-aj-blue/40',
          'lg:flex dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300',
          collapsed ? 'left-4 translate-x-0' : 'left-64',
        )}
      >
        {collapsed ? <ChevronRight className="h-4 w-4" aria-hidden /> : <ChevronLeft className="h-4 w-4" aria-hidden />}
      </button>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <aside className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] border-r border-aj-line bg-white shadow-aj-pop dark:border-gray-700 dark:bg-gray-800">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-2 top-4 flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-aj-surface-soft dark:hover:bg-gray-700"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className={collapsed ? undefined : 'lg:pl-64'}>
        <header className="sticky top-0 z-20 border-b border-aj-line bg-white/95 backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
          <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="-ml-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-gray-600 hover:bg-aj-surface-soft lg:hidden dark:text-gray-300 dark:hover:bg-gray-700"
              aria-label="Open admin menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className={cn('min-w-0 flex-1', collapsed && 'lg:pl-8')}>
              <h1 className="truncate font-display text-lg font-extrabold text-navy dark:text-white">{title}</h1>
              {subtitle && <p className="truncate text-[13px] text-gray-500 dark:text-gray-400">{subtitle}</p>}
            </div>
            <DarkModeToggle />
            <NotificationBell />
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                aria-label="Account menu"
                className="flex items-center gap-2 rounded-full border border-aj-line p-1 transition hover:bg-aj-surface-soft sm:pr-3 dark:border-gray-600 dark:hover:bg-gray-700"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-aj-line-soft font-display text-xs font-bold text-aj-blue dark:bg-aj-blue/30 dark:text-blue-100">
                  {initials(user?.fullName ?? 'Admin')}
                </span>
                <span className="hidden max-w-[10rem] text-left sm:block">
                  <span className="block truncate text-xs font-bold text-navy dark:text-gray-100">{user?.fullName ?? 'Admin'}</span>
                  <span className="block text-[11px] text-gray-500 dark:text-gray-400">Administrator</span>
                </span>
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 z-30 mt-2 w-48 rounded-xl border border-aj-line bg-white p-1 shadow-aj-pop dark:border-gray-700 dark:bg-gray-800"
                >
                  <p className="truncate px-3 py-2 text-xs text-gray-500 dark:text-gray-400">{user?.email || user?.userName}</p>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-aj-surface-soft dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6">
          {(crumbs?.length || actions) && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              {crumbs?.length ? <Breadcrumbs items={crumbs} /> : <span />}
              {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
