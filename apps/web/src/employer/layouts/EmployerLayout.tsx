import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';
import { EmployerSidebar } from '@/employer/components/Sidebar/EmployerSidebar';
import { EmployerHeader } from '@/employer/components/Header/EmployerHeader';
import { useApplicants } from '@/employer/services/employer.api';

const COLLAPSE_KEY = 'aaj.employer.sidebar.collapsed';

/** Dedicated shell for Employer Portal — dense, productivity-focused. */
export function EmployerLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const location = useLocation();
  const { data: applicants = [] } = useApplicants();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <meta name="robots" content="noindex,nofollow" />
      <div className="fixed inset-x-0 top-0 z-50">
        <EmployerHeader collapsed={collapsed} onMenuClick={() => setMobileOpen((o) => !o)} />
      </div>

      <EmployerSidebar
        open={mobileOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        badges={{ applicants: applicants.length, messages: 0, notifications: 0 }}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      <main
        className={cn(
          'px-3 pb-4 pt-16 transition-[padding] duration-200 lg:pr-4',
          collapsed ? 'lg:pl-20' : 'lg:pl-[13.5rem]',
        )}
      >
        <Outlet />
      </main>
    </div>
  );
}
