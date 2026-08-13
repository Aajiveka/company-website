import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, User, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/features/auth/auth.store';
import { PORTAL_NAV } from '../portalModules';

/**
 * Portal top bar — Figma node 1:778.
 *
 * 64px tall, white, 1px #D1DDF0 hairline plus a soft drop shadow. Site links on
 * the left, the outlined "Alerts" pill and the avatar on the right. Below `md`
 * the links collapse into a disclosure panel so the bar still fits a 320px screen.
 */
export function PortalHeader({ initials }: { initials: string }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const onLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-aj-line bg-white shadow-[0_1px_1.5px_rgb(0_0_0/0.1)] dark:border-gray-700 dark:bg-gray-800">
      <nav aria-label="Portal" className="mx-auto flex h-16 max-w-[1194px] items-center justify-between px-4 sm:px-8">
        <div className="flex items-center gap-4 lg:gap-8">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <img
              src="/image/logo-mark.png"
              alt=""
              width={33}
              height={33}
              className="size-[33px] rounded-md object-cover"
              decoding="async"
            />
            <span className="font-display text-xl font-bold tracking-[-0.5px] text-aj-blue">Aajiveka</span>
          </Link>

          <ul className="hidden items-center gap-1 md:flex">
            {PORTAL_NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={'end' in item ? item.end : undefined}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-4 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-aj-blue dark:bg-blue-950'
                        : 'text-slate-600 hover:bg-aj-canvas hover:text-slate-800 dark:text-gray-300 dark:hover:bg-gray-700',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/candidate/all-notifications"
            className="inline-flex items-center gap-2 rounded-full border border-aj-blue px-3 py-2 text-sm font-medium text-aj-blue transition-colors hover:bg-blue-50 sm:px-4 dark:hover:bg-blue-950"
          >
            <Bell className="size-4" aria-hidden />
            <span className="hidden sm:inline">Alerts</span>
          </Link>

          <div className="group relative">
            <Link
              to="/candidate/profile"
              aria-label="Your profile"
              className="flex size-9 items-center justify-center rounded-full bg-aj-blue text-sm font-bold text-white shadow-[0_0_0_2px_var(--color-aj-ring)]"
            >
              {initials}
            </Link>
            <div className="invisible absolute right-0 top-full z-10 w-44 pt-2 opacity-0 transition-[opacity,visibility] group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              <div className="overflow-hidden rounded-xl border border-aj-line bg-white py-1 shadow-aj-pop dark:border-gray-700 dark:bg-gray-800">
                <Link
                  to="/candidate/profile"
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-aj-canvas dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  <User className="size-4" aria-hidden /> My Profile
                </Link>
                <button
                  type="button"
                  onClick={onLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <LogOut className="size-4" aria-hidden /> Log out
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="rounded-md p-2 text-slate-600 hover:bg-aj-canvas md:hidden dark:text-gray-300"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-t border-aj-line-soft bg-white px-4 pb-3 md:hidden dark:border-gray-700 dark:bg-gray-800">
          {PORTAL_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={'end' in item ? item.end : undefined}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'block rounded-md px-3 py-2.5 text-sm font-medium',
                    isActive ? 'bg-blue-50 text-aj-blue dark:bg-blue-950' : 'text-slate-600 dark:text-gray-300',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
