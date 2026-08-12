import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { brand } from '@/employer/constants/brand';
import { EMPLOYER_MENU, type EmployerMenuItem } from '@/employer/constants/menu';

const EXPANDED = 'w-52';
const COLLAPSED = 'w-[4.5rem]';

function pathActive(pathname: string, to: string) {
  if (to === '/company') return pathname === '/company';
  return pathname === to || pathname.startsWith(`${to}/`);
}

function groupActive(pathname: string, item: EmployerMenuItem) {
  if (item.to && pathActive(pathname, item.to)) return true;
  return item.children?.some((c) => pathActive(pathname, c.to)) ?? false;
}

export function EmployerSidebar({
  open,
  collapsed,
  onToggleCollapse,
  badges,
}: {
  open: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  badges?: Record<string, number>;
}) {
  const location = useLocation();
  const activeGroup = useMemo(
    () => EMPLOYER_MENU.find((m) => m.children?.length && groupActive(location.pathname, m))?.id ?? null,
    [location.pathname],
  );
  const [openGroup, setOpenGroup] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (activeGroup) setOpenGroup(activeGroup);
  }, [activeGroup]);

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex flex-col border-r border-slate-200 bg-white pt-14 transition-[width,transform] duration-200 lg:translate-x-0',
        collapsed ? COLLAPSED : EXPANDED,
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
    

      <nav className={cn('sidebar-scroll flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto', collapsed ? 'p-1.5' : 'p-2')}>
        {EMPLOYER_MENU.map((item) => {
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;
          const isOpen = openGroup === item.id;
          const active = groupActive(location.pathname, item);
          const badge = item.badgeKey ? badges?.[item.badgeKey] : undefined;

          if (collapsed) {
            return (
              <NavLink
                key={item.id}
                to={item.to ?? item.children![0].to}
                title={item.label}
                className={cn(
                  'relative flex items-center justify-center rounded-lg px-2 py-2 transition',
                  active ? brand.activeNav : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                <Icon className="h-4 w-4" />
                {!!badge && (
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-rose-500" />
                )}
              </NavLink>
            );
          }

          if (!hasChildren) {
            return (
              <NavLink
                key={item.id}
                to={item.to!}
                end={item.to === '/company'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition',
                    isActive ? brand.activeNav : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {!!badge && (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', brand.bgSoft, brand.text)}>
                    {badge}
                  </span>
                )}
              </NavLink>
            );
          }

          return (
            <div key={item.id} className={cn('rounded-lg', isOpen && 'bg-slate-50')}>
              <div className="flex items-center">
                <NavLink
                  to={item.to!}
                  end={item.id === 'jobs' || item.id === 'applicants'}
                  className={cn(
                    'flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 text-xs font-medium transition',
                    active ? brand.text : 'text-slate-700 hover:text-slate-900',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {!!badge && (
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', brand.bgSoft, brand.text)}>
                      {badge}
                    </span>
                  )}
                </NavLink>
                <button
                  type="button"
                  className="mr-0.5 flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                  aria-expanded={isOpen}
                  onClick={() => setOpenGroup((prev) => (prev === item.id ? null : item.id))}
                >
                  <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
                </button>
              </div>
              <div
                className={cn(
                  'grid transition-[grid-template-rows] duration-200 ease-out',
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                )}
              >
                <div className="overflow-hidden">
                  <div className="ml-3 space-y-0.5 border-l border-slate-200 py-1 pl-2.5 pr-1.5 pb-1.5">
                    {item.children!.map((child) => {
                      const ChildIcon = child.icon;
                      return (
                        <NavLink
                          key={child.id}
                          to={child.to}
                          end
                          className={({ isActive }) =>
                            cn(
                              'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] transition',
                              isActive
                                ? cn(brand.bgSoft, brand.text, 'font-medium')
                                : 'text-slate-500 hover:bg-white hover:text-slate-800',
                            )
                          }
                        >
                          <ChildIcon className="h-3 w-3 shrink-0 opacity-70" />
                          <span className="truncate">{child.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleCollapse}
        className={cn(
          'absolute top-[4.75rem] right-0 z-50 hidden h-5 w-5 translate-x-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm lg:flex',
          'hover:text-[#1A56DB]',
        )}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </button>
    </aside>
  );
}
