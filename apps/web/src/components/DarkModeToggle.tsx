import { useEffect, useState, useCallback } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';

function getStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else if (mode === 'light') {
    root.classList.remove('dark');
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
}

const CYCLE: Record<ThemeMode, ThemeMode> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

const ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

interface DarkModeToggleProps {
  className?: string;
}

export default function DarkModeToggle({ className }: DarkModeToggleProps) {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState<ThemeMode>(getStoredMode);

  const cycle = useCallback(() => {
    setMode((prev) => {
      const next = CYCLE[prev];
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }, []);

  // Apply theme on mount and when mode changes
  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (mode !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [mode]);

  const Icon = ICONS[mode];
  const label =
    mode === 'light'
      ? t('theme.light')
      : mode === 'dark'
        ? t('theme.dark')
        : t('theme.system');

  return (
    <Button
      onClick={cycle}
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg bg-transparent p-0 text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
        className,
      )}
      aria-label={label}
    >
      <Icon className="h-5 w-5" />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
