interface VitalsPayload {
  name: string;
  value: number;
  rating: string;
  id: string;
  navigationType: string;
}

function sendMetric(metric: VitalsPayload): void {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;

  if (endpoint) {
    const body = JSON.stringify(metric);
    navigator.sendBeacon(endpoint, body);
    return;
  }

  if (import.meta.env.DEV) {
    console.log(`[webVitals] ${metric.name}:`, metric.value, `(${metric.rating})`);
  }
}

export async function reportWebVitals(): Promise<void> {
  try {
    // @ts-expect-error — optional dependency, install with `npm i web-vitals` to enable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wv: any = await import('web-vitals');

    wv.onCLS((m: VitalsPayload) => sendMetric(m));
    wv.onFCP((m: VitalsPayload) => sendMetric(m));
    wv.onLCP((m: VitalsPayload) => sendMetric(m));
    wv.onTTFB((m: VitalsPayload) => sendMetric(m));
    wv.onINP((m: VitalsPayload) => sendMetric(m));
  } catch {
    if (import.meta.env.DEV) {
      console.log('[webVitals] web-vitals library not installed — skipping');
    }
  }
}
