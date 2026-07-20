import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

export default function NotFoundPage() {
  return (
    <section className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-heading text-7xl font-bold text-primary">404</p>
      <h1 className="mt-2 font-heading text-2xl font-semibold text-navy">Page not found</h1>
      <p className="mt-2 text-gray-500">The page you are looking for doesn&apos;t exist or has moved.</p>
      <Link to="/" className="mt-6">
        <Button>Back to home</Button>
      </Link>
    </section>
  );
}
