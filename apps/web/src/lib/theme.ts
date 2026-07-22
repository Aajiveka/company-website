import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeStore {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = 'aaj.theme';

function getInitial(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'dark' || stored === 'light') return stored;
  return 'system';
}

function applyTheme(theme: Theme) {
  const isDark =
    theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: getInitial(),
  setTheme: (theme) => {
    localStorage.setItem(STORAGE_KEY, theme);
    applyTheme(theme);
    set({ theme });
  },
}));

// Apply on load
applyTheme(getInitial());

// Listen for OS theme changes when set to "system"
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useThemeStore.getState().theme === 'system') {
    applyTheme('system');
  }
});
