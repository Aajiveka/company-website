import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface PageTransitionProps {
  /** Change this value to re-trigger the animation on route changes. */
  transitionKey: string | number;
  children: ReactNode;
  className?: string;
}

export default function PageTransition({
  transitionKey,
  children,
  className,
}: PageTransitionProps) {
  return (
    <div key={transitionKey} className={cn('animate-fade-in-up', className)}>
      {children}
    </div>
  );
}
