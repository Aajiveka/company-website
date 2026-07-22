import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '@/lib/theme';

const options = [
  { value: 'light' as const, Icon: Sun, label: 'Light' },
  { value: 'dark' as const, Icon: Moon, label: 'Dark' },
  { value: 'system' as const, Icon: Monitor, label: 'System' },
];

/** Compact 3-way theme toggle: Light / Dark / System. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className={`inline-flex items-center rounded-lg border border-gray-200 p-0.5 dark:border-gray-700 ${className ?? ''}`} role="radiogroup" aria-label="Theme">
      {options.map(({ value, Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={theme === value}
          aria-label={label}
          onClick={() => setTheme(value)}
          className={`rounded-md p-1.5 transition-colors ${
            theme === value
              ? 'bg-primary text-white'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}
