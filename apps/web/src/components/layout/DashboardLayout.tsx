import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu as MenuIcon, UserCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/auth.store';
import { ROLE_LABEL } from '@/types/roles';
import { Dropdown } from '@/components/ui';
import DarkModeToggle from '@/components/DarkModeToggle';
import { RouteAnnouncer } from '@/components/RouteAnnouncer';
import PageTransition from '@/components/PageTransition';
import CommandPalette from '@/components/CommandPalette';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useBreadcrumbs } from '@/hooks/useBreadcrumbs';
import { cn } from '@/lib/cn';
import { NotificationBell } from './NotificationBell';
import { Sidebar } from './Sidebar';

const COLLAPSE_KEY = 'aaj.sidebar.collapsed';

function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function firstName(fullName: string): string {
  const part = fullName.trim().split(/\s+/)[0];
  return part || fullName;
}

/** Authenticated dashboard shell — topbar + role-gated sidebar + content. */
export function DashboardLayout() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const breadcrumbs = useBreadcrumbs();

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore quota / private mode */
      }
      return next;
    });
  };

  // Close mobile sidebar on Escape
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  // Close mobile drawer when navigating
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const name = firstName(user.fullName);
  const hello = t(`greeting.${greetingKey(new Date().getHours())}`, { name });

  return (
    <div className="min-h-screen bg-brand-soft/40 dark:bg-gray-900">
      <meta name="robots" content="noindex,nofollow" />
      <CommandPalette />
      <RouteAnnouncer />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[1200] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        Skip to main content
      </a>
      {/* Topbar */}
      <header
        className={cn(
          'fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 transition-[padding] duration-200 ease-out md:h-16 dark:border-gray-700 dark:bg-gray-800',
          collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-56',
        )}
      >
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden dark:text-gray-300 dark:hover:bg-gray-700"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label={t('toggleMenu')}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <img src="/image/logo.svg" alt="Aajiveka" className="h-9 w-auto lg:hidden" width={80} height={36} decoding="async" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-navy dark:text-gray-100 sm:text-[15px]">
              {hello}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell />
          <DarkModeToggle />
          <Dropdown
            trigger={
              <span className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-gray-100 dark:hover:bg-gray-700">
                <UserCircle2 className="h-8 w-8 text-primary" />
                <span className="hidden text-left md:block">
                  <span className="block text-sm font-medium text-navy dark:text-gray-100">{user.fullName}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">{ROLE_LABEL[user.roleId]}</span>
                </span>
              </span>
            }
            items={[{ label: t('logout'), onSelect: () => void logout(), icon: <LogOut className="h-4 w-4" />, danger: true }]}
          />
        </div>
      </header>

      <Sidebar
        role={user.roleId}
        open={sidebarOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
      />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <main
        id="main-content"
        className={cn(
          'px-4 pb-10 pt-[4.5rem] transition-[padding] duration-200 ease-out md:pt-20 lg:pr-6',
          collapsed ? 'lg:pl-24' : 'lg:pl-[15rem]',
        )}
      >
        {breadcrumbs.length > 1 && (
          <Breadcrumbs
            items={breadcrumbs.map((b) => ({ label: b.label, to: b.href }))}
          />
        )}
        <PageTransition transitionKey={location.pathname}>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
