import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Building2,
  HelpCircle,
  LogOut,
  Menu as MenuIcon,
  MessageSquare,
  Search,
  Settings,
  UserCircle2,
} from 'lucide-react';
import { useAuth } from '@/features/auth/auth.store';
import { Dropdown } from '@/components/ui';
import DarkModeToggle from '@/components/DarkModeToggle';
import { cn } from '@/lib/cn';
import { brand } from '@/employer/constants/brand';
import { employerPaths } from '@/employer/constants/paths';

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function greetingKey(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function EmployerHeader({
  onMenuClick,
}: {
  collapsed: boolean;
  onMenuClick: () => void;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const hello = `${greetingKey(new Date().getHours())}, ${firstName(user.fullName)}`;

  return (
    <header className="flex h-14 items-center gap-2 border-b border-slate-200 bg-white px-3">
      <button
        type="button"
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
        onClick={onMenuClick}
        aria-label="Toggle menu"
      >
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{hello}</p>
      </div>

      <div className="hidden max-w-[220px] flex-1 md:block lg:max-w-xs">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search…"
            className={cn(
              'h-8 w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pr-2.5 pl-8 text-xs text-slate-800 outline-none transition',
              'placeholder:text-slate-400 focus:border-[#1A56DB] focus:bg-white focus:ring-1 focus:ring-[#1A56DB]/25',
            )}
          />
        </label>
      </div>

      <div className="flex items-center gap-0.5 sm:gap-1">
        <Link to={employerPaths.notifications} className="relative rounded-md p-1.5 text-slate-600 hover:bg-slate-100" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
        </Link>
        <Link to={employerPaths.messages} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100" title="Messages">
          <MessageSquare className="h-4 w-4" />
        </Link>
        <button type="button" className="hidden rounded-md p-1.5 text-slate-600 hover:bg-slate-100 sm:inline-flex" title="Help">
          <HelpCircle className="h-4 w-4" />
        </button>
        <DarkModeToggle />

        <Dropdown
          trigger={
            <span className="flex items-center gap-1.5 rounded-full py-0.5 pr-1.5 pl-0.5 hover:bg-slate-100">
              <span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white', brand.bg)}>
                {firstName(user.fullName).slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden text-left md:block">
                <span className="block text-xs font-medium text-slate-900">{user.fullName}</span>
              </span>
            </span>
          }
          items={[
            { label: 'My Profile', onSelect: () => navigate(employerPaths.completeProfile), icon: <UserCircle2 className="h-4 w-4" /> },
            { label: 'Company Profile', onSelect: () => navigate(employerPaths.completeProfile), icon: <Building2 className="h-4 w-4" /> },
            { label: 'Settings', onSelect: () => navigate(employerPaths.settings), icon: <Settings className="h-4 w-4" /> },
            { label: 'Logout', onSelect: () => void logout(), icon: <LogOut className="h-4 w-4" />, danger: true },
          ]}
        />
      </div>
    </header>
  );
}
