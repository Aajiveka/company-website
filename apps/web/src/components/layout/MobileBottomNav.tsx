import { useLocation, Link } from 'react-router-dom';
import { Home, Briefcase, LayoutDashboard, MessageSquare, Menu } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';

interface MobileBottomNavProps {
  onMenuToggle: () => void;
}

const navItems = [
  { key: 'home', to: '/', icon: Home },
  { key: 'jobs', to: '/jobs', icon: Briefcase },
  { key: 'dashboard', to: '/candidate/profile', icon: LayoutDashboard },
  { key: 'messages', to: '/candidate/messages', icon: MessageSquare },
] as const;

export default function MobileBottomNav({ onMenuToggle }: MobileBottomNavProps) {
  const { pathname } = useLocation();
  const { t } = useTranslation('common');

  const isActive = (to: string) =>
    to === '/' ? pathname === '/' : pathname.startsWith(to);

  return (
    <nav
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 md:hidden',
        'border-t border-gray-200 dark:border-gray-700',
        'bg-white/90 backdrop-blur-lg dark:bg-gray-900/90',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <div className="flex items-center justify-around px-2 py-1.5">
        {navItems.map(({ key, to, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={key}
              to={to}
              className={cn(
                'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors',
                active
                  ? 'text-primary'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span className="truncate">{t(`mobileNav.${key}`)}</span>
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onMenuToggle}
          className={cn(
            'flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors',
            'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
          )}
        >
          <Menu className="h-5 w-5" />
          <span className="truncate">{t('mobileNav.menu')}</span>
        </button>
      </div>
    </nav>
  );
}
