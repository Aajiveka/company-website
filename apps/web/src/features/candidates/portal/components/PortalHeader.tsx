import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell, CircleHelp, Menu, Wallet as WalletIcon, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { PORTAL_NAV } from '../portalModules';
import { ProfilePanel } from './ProfilePanel';
import type { PortalProfile } from '../usePortalProfile';

/**
 * Portal top bar — Figma node 1:778, as revised in the August update.
 *
 * 64px tall, white, 1px #D1DDF0 hairline plus a soft drop shadow. Icon-led nav on the left,
 * help / alerts / avatar menu on the right.
 *
 * The full bar needs the design's 1194px to fit: four labelled links plus Wallet, Alerts and
 * the avatar overflow a 834px tablet. So the links collapse into a disclosure below `lg`, and
 * the two pill labels only appear once there is room for them.
 */
export function PortalHeader({ profile }: { profile: PortalProfile | null }) {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { unreadCount: unread } = useRealtimeNotifications();

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

          <ul className="hidden items-center gap-1 lg:flex">
            {PORTAL_NAV.map((item) => {
              const Icon = item.icon;
              // `end` only for Home — every other item stays lit across its sub-routes.
              const active = item.end ? pathname === item.match : pathname.startsWith(item.match);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors lg:px-4',
                      active
                        ? 'bg-blue-50 text-aj-blue dark:bg-blue-950'
                        : 'text-slate-600 hover:bg-aj-canvas hover:text-slate-800 dark:text-gray-300 dark:hover:bg-gray-700',
                    )}
                  >
                    <Icon className="size-4 shrink-0" aria-hidden />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/help"
            aria-label="Help and support"
            className="hidden rounded-full p-2 text-slate-400 transition-colors hover:bg-aj-canvas hover:text-slate-600 sm:inline-flex dark:hover:bg-gray-700"
          >
            <CircleHelp className="size-5" aria-hidden />
          </Link>

          {/* The design gives Wallet its own orange pill, set apart from Alerts by a rule. */}
          <Link
            to="/candidate/subscription"
            className="inline-flex items-center gap-2 rounded-full bg-[#FF8245] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#f4703a] sm:px-4"
          >
            <WalletIcon className="size-4" aria-hidden />
            <span className="hidden lg:inline">Wallet</span>
          </Link>

          <span aria-hidden className="hidden h-6 w-px bg-aj-line lg:block dark:bg-gray-700" />

          <Link
            to="/candidate/all-notifications"
            className="relative inline-flex items-center gap-2 rounded-full border border-aj-blue px-3 py-2 text-sm font-medium text-aj-blue transition-colors hover:bg-blue-50 sm:px-4 dark:hover:bg-blue-950"
          >
            <Bell className="size-4" aria-hidden />
            <span className="hidden lg:inline">Alerts</span>
            {unread > 0 && (
              <span
                aria-label={`${unread} unread`}
                className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white"
              >
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>

          <ProfilePanel profile={profile} />

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="rounded-md p-2 text-slate-600 hover:bg-aj-canvas lg:hidden dark:text-gray-300"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      {open && (
        <ul className="border-t border-aj-line-soft bg-white px-4 pb-3 lg:hidden dark:border-gray-700 dark:bg-gray-800">
          {PORTAL_NAV.map((item) => {
            const Icon = item.icon;
            const active = item.end ? pathname === item.match : pathname.startsWith(item.match);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium',
                    active ? 'bg-blue-50 text-aj-blue dark:bg-blue-950' : 'text-slate-600 dark:text-gray-300',
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      )}
    </header>
  );
}
