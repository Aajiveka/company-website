import { Outlet } from 'react-router-dom';
import { Q3ToastProvider } from './Q3Toast';

/**
 * The route-level wrapper for `/q3/*`. The toast provider lives here rather than inside
 * Q3Shell because pages raise toasts from their own top level, which renders above the shell.
 */
export default function Q3Layout() {
  return (
    <Q3ToastProvider>
      <Outlet />
    </Q3ToastProvider>
  );
}
