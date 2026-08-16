import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuthStore } from '@/features/auth/auth.store';
import type { PortalProfile } from '../usePortalProfile';

/**
 * The avatar menu in the portal header (Figma nodes 28:5862 / 28:6833).
 *
 * Groups: identity + completion, the candidate's own content, their activity, then settings,
 * with Logout separated at the bottom. The short variant in the design simply drops the
 * activity group, which is what happens here when the profile is brand new and there is
 * nothing to link to yet.
 */
const GROUPS: { to: string; label: string }[][] = [
  [
    { to: '/candidate/profile', label: 'My Profile' },
    { to: '/candidate/resume-builder', label: 'My Resume' },
  ],
  [
    { to: '/candidate/applications', label: 'Applications' },
    { to: '/candidate/saved-jobs', label: 'Saved Jobs' },
  ],
  [
    { to: '/candidate/account', label: 'Account Settings' },
    { to: '/candidate/account?tab=privacy', label: 'Privacy Settings' },
    { to: '/help', label: 'Help & Support' },
  ],
];

export function ProfilePanel({ profile }: { profile: PortalProfile | null }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  // Click-away and Escape, so the panel behaves like every other menu in the app.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onLogout = async () => {
    setOpen(false);
    await logout();
    navigate('/login');
  };

  // A profile with nothing in it has no applications or saved jobs worth linking to.
  const groups = profile && profile.percent === 0 ? [GROUPS[0], GROUPS[2]] : GROUPS;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Your account"
        className="flex items-center gap-1 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aj-blue/50"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-aj-blue text-sm font-bold text-white shadow-[0_0_0_2px_var(--color-aj-ring)]">
          {profile?.initials || 'AJ'}
        </span>
        <ChevronDown
          className={cn('size-4 text-slate-500 transition-transform', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-xl border border-aj-line bg-white shadow-aj-pop dark:border-gray-700 dark:bg-gray-800"
        >
          <div className="px-5 py-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-aj-blue text-sm font-bold text-white">
                {profile?.initials || 'AJ'}
              </span>
              <div className="min-w-0">
                <p className="truncate font-display text-base font-bold text-slate-800 dark:text-gray-100">
                  {profile?.name ?? 'Your Name'}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {profile?.email ?? 'Add your email'}
                </p>
              </div>
            </div>

            <p className="mt-3 text-[13px] text-slate-600 dark:text-gray-300">
              Profile {profile?.percent ?? 0}% complete
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-aj-line">
              <div
                className="h-full rounded-full bg-emerald-600 transition-[width]"
                style={{ width: `${profile?.percent ?? 0}%` }}
              />
            </div>
          </div>

          {groups.map((group, i) => (
            <div key={i} className="border-t border-aj-line-soft py-1.5 dark:border-gray-700">
              {group.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="block px-5 py-2 text-sm text-slate-600 transition-colors hover:bg-aj-canvas hover:text-aj-blue dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          ))}

          <div className="border-t border-aj-line-soft py-1.5 dark:border-gray-700">
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2 px-5 py-2 text-left text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
            >
              <LogOut className="size-4" aria-hidden />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
