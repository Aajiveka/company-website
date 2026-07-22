import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Prompts the user to reload when a new service worker is available.
 * Renders nothing until an update is detected.
 */
export function PwaReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      // Check for updates every hour.
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-sm rounded-xl border border-gray-200 bg-white p-4 shadow-lg sm:left-auto">
      <p className="text-sm font-medium text-navy">A new version is available.</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90"
        >
          Update now
        </button>
        <button
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
        >
          Later
        </button>
      </div>
    </div>
  );
}
