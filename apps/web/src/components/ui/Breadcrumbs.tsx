import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1.5">
            {c.to && i < items.length - 1 ? (
              <Link to={c.to} className="hover:text-primary">
                {c.label}
              </Link>
            ) : (
              <span className="font-medium text-navy">{c.label}</span>
            )}
            {i < items.length - 1 && <ChevronRight className="h-3.5 w-3.5" aria-hidden />}
          </li>
        ))}
      </ol>
    </nav>
  );
}
