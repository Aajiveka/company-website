import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { captureError } from '@/lib/errorTracking';
import { Button, Card } from '@/components/ui';

interface QueryErrorBoundaryProps {
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  children: React.ReactNode;
  className?: string;
}

export default function QueryErrorBoundary({
  error,
  isError,
  refetch,
  children,
  className,
}: QueryErrorBoundaryProps) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();

  useEffect(() => {
    if (isError && error) {
      captureError(error, { component: 'QueryErrorBoundary' });
    }
  }, [isError, error]);

  if (!isError) {
    return <>{children}</>;
  }

  return (
    <Card
      className={cn('flex flex-col items-center justify-center py-12', className)}
    >
      <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400" aria-hidden="true" />
      <p className="mt-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {error?.message || t('errors.somethingWrong')}
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={() => refetch()}>
          {t('errors.tryAgain')}
        </Button>
        <Button variant="outline" onClick={() => navigate(-1)}>
          {t('errors.goBack')}
        </Button>
      </div>
    </Card>
  );
}
