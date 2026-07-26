import { cn } from '@/lib/cn';
import { Button } from '@/components/ui';

interface EmptyStateProps {
  variant: 'no-results' | 'no-data' | 'no-jobs' | 'no-messages' | 'error';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

function NoResultsIcon() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="42" cy="42" r="24" />
      <line x1="60" y1="60" x2="80" y2="80" strokeWidth="4" />
      <line x1="34" y1="34" x2="50" y2="50" />
      <line x1="50" y1="34" x2="34" y2="50" />
    </svg>
  );
}

function NoDataIcon() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 30 L20 80 L80 80 L80 30" />
      <polyline points="10,30 50,10 90,30" />
      <line x1="40" y1="55" x2="60" y2="55" />
    </svg>
  );
}

function NoJobsIcon() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="15" y="35" width="70" height="50" rx="4" />
      <path d="M35 35 V25 a10 10 0 0 1 10-10 h10 a10 10 0 0 1 10 10 v10" />
      <text
        x="50"
        y="67"
        textAnchor="middle"
        fontSize="28"
        fontWeight="bold"
        fill="currentColor"
        stroke="none"
      >
        ?
      </text>
    </svg>
  );
}

function NoMessagesIcon() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10 25 Q10 15 20 15 L80 15 Q90 15 90 25 L90 60 Q90 70 80 70 L30 70 L15 85 L15 70 L20 70 Q10 70 10 60 Z" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg
      width="100"
      height="100"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polygon points="50,10 90,85 10,85" />
      <line x1="50" y1="40" x2="50" y2="60" strokeWidth="3" />
      <circle cx="50" cy="72" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

const illustrations: Record<EmptyStateProps['variant'], React.FC> = {
  'no-results': NoResultsIcon,
  'no-data': NoDataIcon,
  'no-jobs': NoJobsIcon,
  'no-messages': NoMessagesIcon,
  error: ErrorIcon,
};

export default function EmptyState({
  variant,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const Illustration = illustrations[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500',
        className,
      )}
    >
      <Illustration />
      <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      {action && (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
