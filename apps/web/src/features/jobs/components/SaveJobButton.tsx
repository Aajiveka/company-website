import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';
import { useToast } from '@/components/ui';

interface SaveJobButtonProps {
  jobId: string;
  initialSaved?: boolean;
  onToggle?: (saved: boolean) => void;
}

export default function SaveJobButton({
  jobId,
  initialSaved = false,
  onToggle,
}: SaveJobButtonProps) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const [saved, setSaved] = useState(initialSaved);

  const mutation = useMutation({
    mutationFn: async (shouldSave: boolean) => {
      if (shouldSave) {
        await api.post('/candidates/me/saved-jobs', { jobId });
      } else {
        await api.delete(`/candidates/me/saved-jobs/${jobId}`);
      }
      return shouldSave;
    },
    onMutate: async (shouldSave) => {
      // Optimistic update
      const previous = saved;
      setSaved(shouldSave);
      onToggle?.(shouldSave);
      return { previous };
    },
    onSuccess: (shouldSave) => {
      notify(
        shouldSave ? t('saveJob.saved') : t('saveJob.removed'),
        'success',
      );
    },
    onError: (_err, _shouldSave, context) => {
      // Roll back optimistic update
      if (context) {
        setSaved(context.previous);
        onToggle?.(context.previous);
      }
      notify(t('saveJob.saveFailed'), 'error');
    },
  });

  const handleToggle = () => {
    mutation.mutate(!saved);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={mutation.isPending}
      aria-label={saved ? t('saveJob.removeSaved') : t('saveJob.save')}
      className={cn(
        'inline-flex items-center justify-center rounded-full p-2 transition',
        'outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'disabled:pointer-events-none disabled:opacity-60',
        saved
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30'
          : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300',
      )}
    >
      <Heart
        className="h-5 w-5"
        fill={saved ? 'currentColor' : 'none'}
        strokeWidth={saved ? 0 : 2}
      />
    </button>
  );
}
