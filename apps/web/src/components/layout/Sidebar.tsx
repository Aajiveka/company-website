import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { getMenuForRole, type MenuItem } from './menu';
import type { RoleId } from '@/types/roles';

export const SIDEBAR_EXPANDED_W = 'w-56';
export const SIDEBAR_COLLAPSED_W = 'w-[4.5rem]';

function pathMatches(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupHasActiveChild(pathname: string, item: MenuItem) {
  if (pathname === item.to) return true;
  return item.children?.some((c) => pathMatches(pathname, c.to)) ?? false;
}

const itemBase =
  'flex shrink-0 items-center gap-3 rounded-xl text-[13px] font-medium transition-colors duration-150';

function NavItemLink({
  item,
  collapsed,
}: {
  item: MenuItem;
  collapsed: boolean;
}) {
  const { t } = useTranslation();
  const label = t(`sidebar.${item.i18nKey}`);
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cn(
          itemBase,
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
          isActive
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-navy dark:text-gray-300 dark:hover:bg-gray-700/70 dark:hover:text-white',
        )
      }
    >
      <Icon className="h-[18px] w-[18px] shrink-0 opacity-90" aria-hidden />
      <span className={cn('truncate', collapsed && 'sr-only')}>{label}</span>
    </NavLink>
  );
}

function NestedLink({ item }: { item: MenuItem }) {
  const { t } = useTranslation();
  const label = t(`sidebar.${item.i18nKey}`);

  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          'relative block truncate rounded-lg py-2 pl-3 pr-2 text-[13px] transition-colors duration-150',
          isActive
            ? 'bg-primary/10 font-medium text-primary dark:bg-primary/20 dark:text-primary-light'
            : 'font-normal text-gray-500 hover:bg-gray-100/80 hover:text-navy dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span
              className="absolute top-1/2 left-0 h-4 w-0.5 -translate-y-1/2 rounded-full bg-primary"
              aria-hidden
            />
          )}
          {label}
        </>
      )}
    </NavLink>
  );
}

function MenuGroup({
  item,
  collapsed,
  open,
  onToggle,
}: {
  item: MenuItem;
  collapsed: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const label = t(`sidebar.${item.i18nKey}`);
  const Icon = item.icon;
  const children = item.children ?? [];
  const activeInGroup = groupHasActiveChild(location.pathname, item);
  const onExactParent = location.pathname === item.to;

  if (collapsed) {
    return (
      <NavLink
        to={item.to}
        title={label}
        className={cn(
          itemBase,
          'justify-center px-2 py-2.5',
          activeInGroup
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-600 hover:bg-gray-100 hover:text-navy dark:text-gray-300 dark:hover:bg-gray-700/70',
        )}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
        <span className="sr-only">{label}</span>
      </NavLink>
    );
  }

  return (
    <div
      className={cn(
        'rounded-xl transition-colors',
        open && 'bg-gray-50/80 dark:bg-gray-900/40',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-0.5 rounded-xl',
          onExactParent && 'bg-primary text-white shadow-sm',
          !onExactParent && activeInGroup && 'text-primary',
        )}
      >
        <NavLink
          to={item.to}
          end
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-colors',
            onExactParent
              ? 'text-white'
              : activeInGroup
                ? 'text-primary'
                : 'text-gray-700 hover:text-navy dark:text-gray-200 dark:hover:text-white',
          )}
        >
          <Icon
            className={cn(
              'h-[18px] w-[18px] shrink-0',
              !onExactParent && !activeInGroup && 'opacity-80',
            )}
            aria-hidden
          />
          <span className="truncate">{label}</span>
        </NavLink>

        <button
          type="button"
          className={cn(
            'mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition',
            onExactParent
              ? 'text-white/90 hover:bg-white/15'
              : 'text-gray-400 hover:bg-gray-200/70 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200',
          )}
          aria-expanded={open}
          aria-controls={`submenu-${item.to.replace(/\W/g, '-')}`}
          onClick={onToggle}
        >
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
            aria-hidden
          />
          <span className="sr-only">
            {open ? 'Collapse' : 'Expand'} {label}
          </span>
        </button>
      </div>

      {open && (
        <div
          id={`submenu-${item.to.replace(/\W/g, '-')}`}
          className="ml-4 space-y-0.5 border-l border-gray-200 py-1.5 pl-3 pr-2 dark:border-gray-700"
          role="group"
          aria-label={label}
        >
          {children.map((child) => (
            <NestedLink key={child.to} item={child} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Role-gated dashboard sidebar — expandable / collapsible on desktop. */
export function Sidebar({
  role,
  open,
  collapsed,
  onToggleCollapse,
}: {
  role: RoleId;
  open: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
}) {
  const items = useMemo(() => getMenuForRole(role), [role]);
  const { t } = useTranslation();
  const location = useLocation();

  const activeGroupKey = useMemo(() => {
    const groups = items.filter((i) => i.children?.length);
    return groups.find((g) => groupHasActiveChild(location.pathname, g))?.to ?? null;
  }, [items, location.pathname]);

  /** Accordion: only one submenu open at a time. */
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroupKey);

  useEffect(() => {
    if (activeGroupKey) setOpenGroup(activeGroupKey);
  }, [activeGroupKey]);

  const toggleGroup = (key: string) => {
    setOpenGroup((prev) => (prev === key ? null : key));
  };

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex max-w-[85vw] flex-col border-r border-gray-200/80 bg-white pt-14 transition-[width,transform] duration-200 ease-out md:pt-16 lg:translate-x-0 dark:border-gray-700 dark:bg-gray-800',
        collapsed ? SIDEBAR_COLLAPSED_W : SIDEBAR_EXPANDED_W,
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <nav
        aria-label="Dashboard"
        className={cn(
          'sidebar-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain',
          collapsed ? 'p-2' : 'px-3 py-4',
        )}
      >
        {items.map((item) =>
          item.children?.length ? (
            <MenuGroup
              key={item.to}
              item={item}
              collapsed={collapsed}
              open={openGroup === item.to}
              onToggle={() => toggleGroup(item.to)}
            />
          ) : (
            <NavItemLink key={item.to} item={item} collapsed={collapsed} />
          ),
        )}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          'absolute right-0 z-50 hidden h-6 w-6 translate-x-1/2 -translate-y-1/2 items-center justify-center',
          collapsed ? 'top-[5.75rem]' : 'top-[6.25rem]',
          'rounded-full border border-gray-200 bg-white text-gray-500 shadow-sm',
          'transition hover:border-gray-300 hover:text-primary hover:shadow',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          'lg:flex dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:text-primary',
        )}
        aria-label={collapsed ? t('expandSidebar') : t('collapseSidebar')}
        aria-expanded={!collapsed}
        title={collapsed ? t('expandSidebar') : t('collapseSidebar')}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        )}
      </button>
    </aside>
  );
}
