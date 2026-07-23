import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Centered spinner for route-level Suspense fallbacks and busy states. */
export function Loader({ className, label }: { className?: string; label?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2 py-16 text-primary', className)}>
      <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
      {label && <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>}
    </div>
  );
}

/** Full-viewport loader for the initial app/auth bootstrap. */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loader />
    </div>
  );
}
