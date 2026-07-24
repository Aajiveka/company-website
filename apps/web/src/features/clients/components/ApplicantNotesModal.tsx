import { useState } from 'react';
import { Star } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Modal, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface ApplicantNote {
  rating: number;
  note: string;
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-0.5"
        >
          <Star
            className={cn(
              'h-6 w-6 transition',
              (hover || value) >= star
                ? 'fill-amber-400 text-amber-400'
                : 'text-gray-300 dark:text-gray-600',
            )}
          />
        </button>
      ))}
    </div>
  );
}

export function ApplicantNotesModal({
  open,
  onClose,
  jobSubscriberMapId,
  candidateName,
}: {
  open: boolean;
  onClose: () => void;
  jobSubscriberMapId: number;
  candidateName: string;
}) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['client', 'applicant-notes', jobSubscriberMapId],
    queryFn: () =>
      api.get<ApplicantNote>(`/clients/me/applicants/${jobSubscriberMapId}/notes`).then((r) => r.data),
    enabled: open,
  });

  const [rating, setRating] = useState(0);
  const [note, setNote] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Sync from server data once loaded
  if (data && !initialized) {
    setRating(data.rating || 0);
    setNote(data.note || '');
    setInitialized(true);
  }

  const save = useMutation({
    mutationFn: () =>
      api.put(`/clients/me/applicants/${jobSubscriberMapId}/notes`, { rating, note }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'applicants'] });
      qc.invalidateQueries({ queryKey: ['client', 'applicant-notes', jobSubscriberMapId] });
      notify(t('notes.saved'), 'success');
      onClose();
    },
    onError: () => notify(t('notes.saveFailed'), 'error'),
  });

  const handleClose = () => {
    setInitialized(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={t('notes.title', { name: candidateName })}>
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">{t('notes.rating')}</label>
          <StarRating value={rating} onChange={setRating} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-navy">{t('notes.noteLabel')}</label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder={t('notes.notePlaceholder')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button size="sm" onClick={() => save.mutate()} isLoading={save.isPending}>
            {t('common:actions.save')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
