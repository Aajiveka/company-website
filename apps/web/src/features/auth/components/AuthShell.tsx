import { Link } from 'react-router-dom';

/** Centered card shell shared by all auth pages. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="hero-banner flex min-h-screen items-center justify-center px-4 py-24">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900 dark:ring-1 dark:ring-gray-800 sm:p-8">
        <Link to="/" className="mb-6 block text-center">
          <img src="/image/logo.svg" alt="Aajiveka" className="mx-auto h-12 sm:h-14" />
        </Link>
        <h1 className="text-center font-heading text-xl font-bold text-navy dark:text-gray-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-center text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>}
        <div className="mt-4 sm:mt-6">{children}</div>
        {footer && <div className="mt-4 text-center text-sm text-gray-600 sm:mt-6">{footer}</div>}
      </div>
    </section>
  );
}
