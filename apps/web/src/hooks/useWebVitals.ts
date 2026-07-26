import { useEffect } from 'react';

export function useWebVitals() {
  useEffect(() => {
    const report = (metric: { name: string; value: number; id: string }) => {
      if (import.meta.env.DEV) {
        console.log(`[vitals] ${metric.name}: ${metric.value}`);
        return;
      }
      navigator.sendBeacon?.('/analytics/vitals', JSON.stringify(metric));
    };
    const webVitalsModule = 'web-vitals';
    import(/* @vite-ignore */ webVitalsModule)
      .then(({ onCLS, onFID, onFCP, onLCP, onTTFB }: Record<string, (fn: typeof report) => void>) => {
        onCLS(report);
        onFID(report);
        onFCP(report);
        onLCP(report);
        onTTFB(report);
      })
      .catch(() => {});
  }, []);
}
