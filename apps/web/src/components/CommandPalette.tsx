import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Search,
  Home,
  Briefcase,
  User,
  FileText,
  CheckSquare,
  Bookmark,
  MessageSquare,
  Settings,
  PlusCircle,
  Bell,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface PaletteItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  section: 'pages' | 'actions';
  shortcut?: string;
  onSelect: () => void;
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { t } = useTranslation('common');

  const go = useCallback(
    (path: string) => {
      navigate(path);
      setOpen(false);
    },
    [navigate],
  );

  const items = useMemo<PaletteItem[]>(
    () => [
      // Pages
      { id: 'home', label: t('nav.home'), icon: <Home className="h-4 w-4" />, section: 'pages', onSelect: () => go('/') },
      { id: 'jobs', label: t('nav.findJobs'), icon: <Briefcase className="h-4 w-4" />, section: 'pages', onSelect: () => go('/jobs') },
      { id: 'profile', label: t('sidebar.myProfile'), icon: <User className="h-4 w-4" />, section: 'pages', onSelect: () => go('/candidate/profile') },
      { id: 'cv-manager', label: t('sidebar.cvManager'), icon: <FileText className="h-4 w-4" />, section: 'pages', onSelect: () => go('/candidate/cv-manager') },
      { id: 'applied-jobs', label: t('sidebar.appliedJobs'), icon: <CheckSquare className="h-4 w-4" />, section: 'pages', onSelect: () => go('/candidate/applied-jobs') },
      { id: 'saved-jobs', label: t('sidebar.savedJobs'), icon: <Bookmark className="h-4 w-4" />, section: 'pages', onSelect: () => go('/candidate/saved-jobs') },
      { id: 'messages', label: t('sidebar.messages'), icon: <MessageSquare className="h-4 w-4" />, section: 'pages', onSelect: () => go('/candidate/messages') },
      { id: 'settings', label: t('breadcrumbs.settings'), icon: <Settings className="h-4 w-4" />, section: 'pages', onSelect: () => go('/candidate/settings') },
      // Actions
      { id: 'post-job', label: t('sidebar.postAJob'), icon: <PlusCircle className="h-4 w-4" />, section: 'actions', onSelect: () => go('/company/post-job') },
      { id: 'search-jobs', label: t('actions.search') + ' ' + t('nav.findJobs'), icon: <Search className="h-4 w-4" />, section: 'actions', onSelect: () => go('/jobs') },
      { id: 'notifications', label: t('breadcrumbs.notifications'), icon: <Bell className="h-4 w-4" />, section: 'actions', onSelect: () => go('/candidate/notifications') },
      { id: 'change-password', label: t('sidebar.changePassword'), icon: <Lock className="h-4 w-4" />, section: 'actions', onSelect: () => go('/candidate/change-password') },
    ],
    [t, go],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter((item) => item.label.toLowerCase().includes(q));
  }, [query, items]);

  const pages = useMemo(() => filtered.filter((i) => i.section === 'pages'), [filtered]);
  const actions = useMemo(() => filtered.filter((i) => i.section === 'actions'), [filtered]);

  // Reset active index when filtered list changes
  useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  // Open / close on Ctrl+K / Cmd+K
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Slight delay so the DOM is painted
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Keyboard navigation inside palette
  const onInputKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % filtered.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + filtered.length) % filtered.length);
        return;
      }
      if (e.key === 'Enter' && filtered.length > 0) {
        e.preventDefault();
        filtered[activeIndex]?.onSelect();
        return;
      }
    },
    [filtered, activeIndex],
  );

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  let flatIndex = -1;

  const renderItem = (item: PaletteItem) => {
    flatIndex++;
    const idx = flatIndex;
    const isActive = idx === activeIndex;
    return (
      <button
        key={item.id}
        data-active={isActive}
        className={cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
          isActive
            ? 'bg-primary/10 text-primary dark:bg-primary/20'
            : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
        )}
        onClick={item.onSelect}
        onMouseEnter={() => setActiveIndex(idx)}
      >
        {item.icon}
        <span className="flex-1">{item.label}</span>
        {item.shortcut && (
          <kbd className="hidden rounded bg-gray-200 px-1.5 py-0.5 text-xs text-gray-500 sm:inline dark:bg-gray-600 dark:text-gray-400">
            {item.shortcut}
          </kbd>
        )}
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={() => setOpen(false)}
        aria-hidden
      />

      {/* Palette container */}
      <div className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800">
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-200 px-4 dark:border-gray-700">
          <Search className="h-4 w-4 shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder={t('commandPalette.placeholder')}
            className="h-12 w-full border-0 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
          />
          <kbd className="hidden shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 sm:inline dark:bg-gray-700 dark:text-gray-400">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('commandPalette.noResults')}
            </p>
          )}

          {pages.length > 0 && (
            <div>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t('commandPalette.pages')}
              </p>
              {pages.map(renderItem)}
            </div>
          )}

          {actions.length > 0 && (
            <div className={pages.length > 0 ? 'mt-2' : ''}>
              <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                {t('commandPalette.actions')}
              </p>
              {actions.map(renderItem)}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-4 border-t border-gray-200 px-4 py-2 text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">&uarr;&darr;</kbd> navigate
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">&crarr;</kbd> select
          </span>
          <span className="flex items-center gap-1">
            <kbd className="rounded bg-gray-100 px-1 py-0.5 dark:bg-gray-700">esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}

