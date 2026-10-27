import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Award,
  Building2,
  CalendarDays,
  ChevronDown,
  FileCheck2,
  Folder,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  Search,
  Undo2,
  Video,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useQ3NavCounts } from '../q3.api';
import { initialsOf } from '../q3.format';
import type { Q3NavCounts } from '../q3.types';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  badge?: keyof Q3NavCounts;
  /** Other paths that light this item up (a detail route under it). */
  match?: string[];
}

/** The sidebar, in the Figma's order (Q3 Sidebar component, node 253:5131). */
const NAV: NavItem[] = [
  { to: '/q3/dashboard', label: 'Dashboard', icon: LayoutGrid },
  { to: '/q3/referred', label: 'Referred CVs', icon: FileCheck2, badge: 'referred' },
  { to: '/q3/company-review', label: 'Company Review', icon: Building2, badge: 'companyReview' },
  { to: '/q3/scheduling', label: 'Slot Scheduling', icon: CalendarDays, badge: 'scheduling' },
  { to: '/q3/interviews', label: 'Interviews', icon: Video, badge: 'interviews' },
  { to: '/q3/decisions', label: 'Decisions', icon: ListChecks, badge: 'decisions' },
  { to: '/q3/documents', label: 'Documents', icon: Folder, badge: 'documents' },
  { to: '/q3/offers', label: 'Offers & Joining', icon: Award, badge: 'offers' },
  { to: '/q3/returned', label: 'Returned to Q2', icon: Undo2, badge: 'returned' },
];

/**
 * The Q3 workspace chrome: a 248px sidebar with count badges, an 80px topbar (title, quick
 * search, bell, user chip) and the #F5F6FA canvas.
 *
 * Its own shell, as Q1Shell and Q2Shell are: DashboardLayout draws a breadcrumb row and a
 * role-menu sidebar the designs do not have. Toasts come from Q3Layout, one level up.
 */
export function Q3Shell({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: counts } = useQ3NavCounts();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Close the drawer whenever the route changes underneath it.
  useEffect(() => setMobileOpen(false), [location.pathname]);

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

  const navLink = ({ to, label, icon: Icon, badge }: NavItem) => {
    const count = badge ? counts?.[badge] : undefined;
    return (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          cn(
            'flex h-9 items-center gap-3 rounded-lg px-3 text-sm leading-[17px] transition',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40',
            isActive ? 'bg-q3-blue-soft font-semibold text-q3-blue' : 'font-medium text-q3-ink-soft hover:bg-q3-field',
          )
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
        <span className="flex-1 truncate">{label}</span>
        {count != null && count > 0 && (
          <span className="rounded-full bg-q3-chip px-[7px] py-0.5 text-[11px] font-semibold leading-[13px] text-q3-ink-soft">
            {count}
          </span>
        )}
      </NavLink>
    );
  };

  const sidebar = (
    <div className="flex h-full flex-col overflow-y-auto p-4">
      <Link to="/q3/dashboard" className="flex items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40">
        <img src="/image/q3-logo-mark.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
        <span className="font-display text-lg font-extrabold leading-7 tracking-[-0.45px] text-q3-brand">Aajiveka</span>
      </Link>
      <nav className="mt-[22px] flex flex-col gap-0.5" aria-label="Q3 workspace">
        {NAV.map(navLink)}
      </nav>
      <hr className="mt-[22px] border-q3-line" />
    </div>
  );

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    navigate(q ? `/q3/dashboard?search=${encodeURIComponent(q)}` : '/q3/dashboard');
  };

  return (
      <div className="min-h-screen bg-q3-canvas font-sans text-q3-ink">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-q3-line bg-q3-surface lg:block">{sidebar}</aside>

        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-q3-overlay lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
            <aside className="fixed inset-y-0 left-0 z-50 w-[264px] border-r border-q3-line bg-q3-surface lg:hidden">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="absolute right-3 top-5 rounded-lg p-1.5 text-q3-muted hover:bg-q3-chip"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {sidebar}
            </aside>
          </>
        )}

        <div className="lg:pl-[248px]">
          <header className="sticky top-0 z-20 flex min-h-20 items-center gap-3.5 border-b border-q3-line bg-q3-surface px-4 py-3 sm:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-q3-ink-soft hover:bg-q3-chip lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold leading-[25px] tracking-[-0.4px] text-q3-ink sm:text-[21px]">{title}</h1>
              <div className="mt-[3px] truncate text-[13.5px] leading-4 text-q3-muted">{subtitle}</div>
            </div>

            <form onSubmit={onSearch} role="search" className="relative hidden md:block">
              <label htmlFor="q3-quick-search" className="sr-only">
                Quick search
              </label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-q3-muted-light" aria-hidden />
              <input
                id="q3-quick-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Quick search…"
                className="h-10 w-[200px] rounded-[10px] border border-q3-line bg-q3-field pl-10 pr-3.5 text-[13.5px] text-q3-ink outline-none transition placeholder:text-q3-muted-light focus:border-q3-blue focus:ring-2 focus:ring-q3-blue/15 xl:w-[250px]"
              />
            </form>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-q3-line [&_button]:rounded-[9px] [&_button]:p-[10px] [&_button]:text-q3-ink-soft">
              <NotificationBell />
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-[46px] items-center gap-2.5 rounded-xl border border-q3-line py-1.5 pl-1.5 pr-3 transition hover:bg-q3-field focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-q3-blue/40"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-q3-amber-soft text-xs font-semibold text-q3-amber">
                  {initialsOf(user?.fullName || 'Q3')}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block max-w-[110px] truncate text-[13px] font-semibold leading-4 text-q3-ink">
                    {user?.fullName || 'Q3 Coordinator'}
                  </span>
                  <span className="mt-px block text-[11.5px] leading-[14px] text-q3-muted">Q3 Coordinator</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-q3-muted sm:block" aria-hidden />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 z-30 mt-2 w-44 rounded-xl border border-q3-line bg-q3-surface p-1 shadow-q3-pop">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-q3-ink-soft hover:bg-q3-chip"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </header>

          <main className="px-4 py-5 sm:px-8 sm:py-7">{children}</main>
        </div>
      </div>
  );
}

/** "Scheduling › Nishu Kumar · Nimbus Fintech · Round 1" — a detail screen's subtitle. */
export function Crumbs({ root, rootTo, children }: { root: string; rootTo?: string; children?: React.ReactNode }) {
  return (
    // Block-level flex so both halves can ellipsize inside the header's truncating line; as an
    // inline-flex it sized to its content and was hard-clipped (or ran under a queue switcher)
    // on phones. The detail gives way first, then the root.
    <span className="flex min-w-0 items-center gap-1.5">
      {rootTo ? (
        <Link to={rootTo} className="min-w-0 truncate hover:text-q3-blue">
          {root}
        </Link>
      ) : (
        <span className="min-w-0 truncate">{root}</span>
      )}
      {children && (
        <>
          <span aria-hidden className="shrink-0">›</span>
          <span className="min-w-0 shrink-[100] truncate">{children}</span>
        </>
      )}
    </span>
  );
}
