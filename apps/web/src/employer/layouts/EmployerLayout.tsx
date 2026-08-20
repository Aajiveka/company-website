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
  const { data: applicantsRes } = useApplicants({ page: 1, pageSize: 1 });
  const applicantCount = applicantsRes?.total ?? 0;

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

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    return () => {
      const stored = localStorage.getItem('theme');
      const dark =
        stored === 'dark' ||
        (stored !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      root.classList.toggle('dark', dark);
    };
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
    <div className="employer-portal min-h-screen bg-slate-50 text-slate-900">
      <meta name="robots" content="noindex,nofollow" />
      <div className="fixed inset-x-0 top-0 z-50">
        <EmployerHeader collapsed={collapsed} onMenuClick={() => setMobileOpen((o) => !o)} />
      </div>

      <EmployerSidebar
        open={mobileOpen}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapsed}
        badges={{ applicants: applicantCount, messages: 0, notifications: 0 }}
      />

      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden />
      )}

      <main
        className={cn(
          'px-4 pb-4 pt-16 transition-[padding] duration-200',
          /* Match left gap (after sidebar) to right page padding (1.5rem / pr-6) */
          collapsed ? 'lg:pl-24 lg:pr-6' : 'lg:pl-[14.5rem] lg:pr-6',
        )}
      >
        <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
          <Outlet key={location.pathname} />
        </div>
      </main>
    </div>
  );
}
