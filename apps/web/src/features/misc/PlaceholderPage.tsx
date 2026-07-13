import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';

/**
 * Stub for pages scheduled in Milestone 2+ (see plan). Keeps routing/nav
 * complete and honest about what is not yet built pixel-perfect.
 */
export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 pt-24">
      <div className="max-w-md text-center">
        <Construction className="mx-auto mb-4 h-12 w-12 text-accent" />
        <h1 className="font-heading text-3xl font-bold text-navy">{title}</h1>
        <p className="mt-2 text-gray-500">
          This page is part of the next milestone and follows the same architecture as the completed pages.
        </p>
        <Link to="/" className="mt-6 inline-block text-primary hover:underline">
          ← Back to home
        </Link>
      </div>
    </section>
  );
}
