import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

/** Compact language toggle button for the navbar. */
export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'hi' ? 'en' : 'hi';
  const label = next === 'hi' ? 'हिन्दी' : 'English';

  return (
    <button
      type="button"
      onClick={() => i18n.changeLanguage(next)}
      className="flex items-center gap-1 rounded-full border border-white/40 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-white/15 sm:text-sm"
      aria-label={`Switch language to ${label}`}
    >
      <Globe className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}
