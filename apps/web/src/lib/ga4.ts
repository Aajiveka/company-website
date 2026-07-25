declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: ((...args: unknown[]) => void) | undefined;
  }
}

const GA_ID = import.meta.env.VITE_GA4_ID as string | undefined;

export function initGA4(): void {
  if (!GA_ID) return;

  // Load gtag.js script dynamically
  const script = document.createElement('script');
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', GA_ID);

  window.gtag = gtag;
}

export function ga4Event(name: string, params?: Record<string, unknown>): void {
  if (window.gtag) {
    window.gtag('event', name, params);
  }
}
