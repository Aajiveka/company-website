import { Outlet } from 'react-router-dom';
import { useWebVitals } from '@/hooks/useWebVitals';
import { usePageTracking } from '@/hooks/usePageTracking';

function AnalyticsProvider() {
  useWebVitals();
  usePageTracking();
  return <Outlet />;
}

export default AnalyticsProvider;
