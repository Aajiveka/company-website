import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui';

/**
 * Route-level error fallback — used as `errorElement` in the router.
 * Handles both thrown Response objects (404, 403) and unexpected JS errors.
 */
export function RouteErrorFallback() {
  const error = useRouteError();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';
  let status: number | undefined;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (status === 404) {
      title = 'Page not found';
      message = "The page you're looking for doesn't exist or has been moved.";
    } else if (status === 403) {
      title = 'Access denied';
      message = "You don't have permission to view this page.";
    } else {
      title = `Error ${status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    if (import.meta.env.DEV) {
      message = error.message;
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="h-8 w-8 text-danger" />
      </div>
      {status && (
        <p className="mt-4 font-heading text-5xl font-bold text-primary">{status}</p>
      )}
      <h1 className="mt-3 font-heading text-2xl font-bold text-navy">{title}</h1>
      <p className="mt-2 max-w-md text-gray-500">{message}</p>
      {import.meta.env.DEV && error instanceof Error && error.stack && (
        <pre className="mx-auto mt-4 max-w-2xl overflow-auto rounded-lg bg-gray-100 p-4 text-left text-xs text-gray-700">
          {error.stack}
        </pre>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Reload page
        </Button>
        <Link to="/">
          <Button>Go home</Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Dashboard-specific error fallback — keeps the user in the dashboard context
 * without the full-page layout breaking.
 */
export function DashboardErrorFallback() {
  const error = useRouteError();

  const message =
    import.meta.env.DEV && error instanceof Error
      ? error.message
      : 'Something went wrong loading this page.';

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger/10">
        <AlertTriangle className="h-7 w-7 text-danger" />
      </div>
      <h2 className="mt-4 font-heading text-xl font-bold text-navy">Something went wrong</h2>
      <p className="mt-2 max-w-md text-sm text-gray-500">{message}</p>
      {import.meta.env.DEV && error instanceof Error && error.stack && (
        <pre className="mx-auto mt-4 max-w-xl overflow-auto rounded-lg bg-gray-100 p-3 text-left text-xs text-gray-700">
          {error.stack}
        </pre>
      )}
      <div className="mt-6 flex gap-3">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          <RefreshCw className="mr-1.5 h-4 w-4" />
          Reload
        </Button>
        <Button size="sm" onClick={() => window.history.back()}>
          Go back
        </Button>
      </div>
    </div>
  );
}
