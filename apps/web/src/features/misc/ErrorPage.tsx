import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';

/**
 * Route-level error element for react-router.
 * Handles 404s, network failures, and unexpected route errors.
 */
export default function ErrorPage() {
  const error = useRouteError();

  const is404 = isRouteErrorResponse(error) && error.status === 404;
  const statusCode = isRouteErrorResponse(error) ? error.status : 500;
  const heading = is404 ? 'Page not found' : 'Something went wrong';
  const description = is404
    ? "The page you are looking for doesn't exist or has moved."
    : 'An unexpected error occurred. Please try again or return to the home page.';

  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Seo title={`${statusCode} — ${heading}`} noIndex />
      <p className="font-heading text-7xl font-bold text-primary">{statusCode}</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-navy">{heading}</h1>
      <p className="mt-2 max-w-md text-gray-500">{description}</p>

      {import.meta.env.DEV && !is404 && error instanceof Error && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-red-50 p-4 text-left text-xs text-red-700">
          {error.message}
        </pre>
      )}

      <div className="mt-6 flex gap-3">
        {!is404 && (
          <Button onClick={() => window.location.reload()}>Try again</Button>
        )}
        <Link to="/">
          <Button variant={is404 ? 'primary' : 'outline'}>Back to home</Button>
        </Link>
      </div>
    </section>
  );
}
