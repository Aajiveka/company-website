import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useWebVitals } from '@/hooks/useWebVitals';
import { usePageTracking } from '@/hooks/usePageTracking';
import { initGA4, ga4Event } from '@/lib/ga4';

function AnalyticsProvider() {
  const ga4Initialized = useRef(false);
  const { pathname } = useLocation();

  useEffect(() => {
    if (!ga4Initialized.current) {
      initGA4();
      ga4Initialized.current = true;
    }
  }, []);

  useEffect(() => {
    ga4Event('page_view', { page_path: pathname });
  }, [pathname]);

  useWebVitals();
  usePageTracking();
  return <Outlet />;
}

export default AnalyticsProvider;
