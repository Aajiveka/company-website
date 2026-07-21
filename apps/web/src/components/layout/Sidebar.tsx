import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { getMenuForRole } from './menu';
import type { RoleId } from '@/types/roles';

/** Role-gated dashboard sidebar. */
export function Sidebar({ role, open }: { role: RoleId; open: boolean }) {
  const items = getMenuForRole(role);
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 w-64 border-r border-gray-200 bg-white pt-20 transition-transform lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <nav className="flex flex-col gap-1 p-4">
        {items.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition',
                isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-brand-soft hover:text-primary',
              )
            }
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
