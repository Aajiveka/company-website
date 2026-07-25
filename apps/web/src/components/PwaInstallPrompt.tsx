import { useCallback, useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';
const DISMISS_DAYS = 30;

function wasDismissedRecently(): boolean {
  const stored = localStorage.getItem(DISMISSED_KEY);
  if (!stored) return false;
  return Date.now() - Number(stored) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export function PwaInstallPrompt() {
  const { t } = useTranslation('common');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [animateOut, setAnimateOut] = useState(false);

  useEffect(() => {
    if (wasDismissedRecently()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const hide = useCallback((callback?: () => void) => {
    setAnimateOut(true);
    setTimeout(() => {
      setVisible(false);
      setAnimateOut(false);
      callback?.();
    }, 200);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      hide();
    }
    setDeferredPrompt(null);
  }, [deferredPrompt, hide]);

  const dismiss = useCallback(() => {
    hide(() => {
      setDeferredPrompt(null);
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    });
  }, [hide]);

  if (!visible) return null;

  return (
    <Card
      className={cn(
        'fixed bottom-4 left-4 right-4 z-[9998] mx-auto max-w-sm shadow-xl',
        'sm:left-auto sm:right-4',
        'transition-all duration-200',
        animateOut
          ? 'translate-y-4 opacity-0'
          : 'animate-slide-up translate-y-0 opacity-100',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy dark:text-white">
            {t('pwa.installTitle')}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {t('pwa.installMessage')}
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          aria-label={t('pwa.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={install} className="flex-1" size="sm">
          {t('pwa.installButton')}
        </Button>
        <Button onClick={dismiss} variant="outline" size="sm">
          {t('pwa.notNow')}
        </Button>
      </div>
    </Card>
  );
}

export default PwaInstallPrompt;
