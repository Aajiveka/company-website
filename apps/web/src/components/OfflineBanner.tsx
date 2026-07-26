import { useTranslation } from 'react-i18next';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOffline';
import { offlineQueue } from '@/lib/offlineQueue';

export default function OfflineBanner() {
  const { isOnline } = useOnlineStatus();
  const { t } = useTranslation('common');
  const pendingCount = offlineQueue.size;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-3 text-sm font-medium text-amber-950 shadow-lg transition-transform duration-300 ease-in-out dark:bg-amber-600 dark:text-amber-50 ${
        isOnline ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{t('offline.message')}</span>
      {pendingCount > 0 && (
        <span>{t('offline.pendingSync', { count: pendingCount })}</span>
      )}
    </div>
  );
}
