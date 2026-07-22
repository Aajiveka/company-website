import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, Menu as MenuIcon, UserCircle2 } from 'lucide-react';
import { useAuth } from '@/features/auth/auth.store';
import { ROLE_LABEL } from '@/types/roles';
import { Dropdown } from '@/components/ui';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Sidebar } from './Sidebar';

/** Authenticated dashboard shell — topbar + role-gated sidebar + content. */
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-brand-soft/40 dark:bg-gray-950">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg"
      >
        Skip to main content
      </a>
      {/* Topbar */}
      <header className="fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-gray-800 dark:bg-gray-900 md:h-16 lg:pl-64">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
            onClick={() => setSidebarOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <img src="/image/logo.svg" alt="Aajiveka" className="h-9 w-auto lg:hidden" />
        </div>
        <div className="flex items-center gap-3">
        <ThemeToggle />
        <Dropdown
          trigger={
            <span className="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-gray-100">
              <UserCircle2 className="h-8 w-8 text-primary" />
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium text-navy">{user.fullName}</span>
                <span className="block text-xs text-gray-500">{ROLE_LABEL[user.roleId]}</span>
              </span>
            </span>
          }
          items={[{ label: 'Logout', onSelect: () => void logout(), icon: <LogOut className="h-4 w-4" />, danger: true }]}
        />
        </div>
      </header>

      <Sidebar role={user.roleId} open={sidebarOpen} />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <main id="main-content" className="px-4 pb-10 pt-[4.5rem] md:pt-20 lg:pl-[17rem] lg:pr-6">
        <Outlet />
      </main>
    </div>
  );
}
