import { useCallback, useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const DISMISSED_KEY = 'push-prompt-dismissed';
const DISMISS_DAYS = 7;

function wasDismissedRecently(): boolean {
  const stored = localStorage.getItem(DISMISSED_KEY);
  if (!stored) return false;
  return Date.now() - Number(stored) < DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

function shouldShow(): boolean {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window)) return false;
  if (Notification.permission !== 'default') return false;
  return !wasDismissedRecently();
}

export default function PushNotificationPrompt() {
  const { t } = useTranslation('common');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (shouldShow()) setVisible(true);
  }, []);

  const handleEnable = useCallback(async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: undefined,
        });
        await fetch('/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(subscription),
        });
      } catch {
        // Subscription failed silently; notification permission was still granted
      }
    }
    setVisible(false);
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
  }, []);

  if (!visible) return null;

  return (
    <Card
      className={cn(
        'fixed bottom-20 left-4 right-4 z-[9997] mx-auto max-w-sm',
        'animate-slide-up shadow-lg',
        'md:bottom-4 md:left-auto md:right-4',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-navy dark:text-white">
            {t('pushNotif.title')}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            {t('pushNotif.message')}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          aria-label={t('actions.close')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <Button onClick={handleEnable} className="flex-1" size="sm">
          {t('pushNotif.enable')}
        </Button>
        <Button onClick={handleDismiss} variant="outline" size="sm">
          {t('pushNotif.notNow')}
        </Button>
      </div>
    </Card>
  );
}
