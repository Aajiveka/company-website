import { useRef, useState, type ChangeEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Camera, User } from 'lucide-react';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Button, Skeleton, useToast } from '@/components/ui';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  onUploaded: (url: string) => void;
}

const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  onUploaded,
}: ProfilePhotoUploadProps) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const { data } = await api.post<{ url: string }>(
        '/candidates/me/photo',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data.url;
    },
    onSuccess: (url) => {
      notify(t('profilePhoto.uploaded'), 'success');
      setPreview(null);
      onUploaded(url);
    },
    onError: () => {
      notify(t('profilePhoto.uploadFailed'), 'error');
    },
  });

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    // Upload immediately
    uploadMutation.mutate(file);
  };

  const displayUrl = preview ?? currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        className={cn(
          'group relative h-24 w-24 overflow-hidden rounded-full',
          'border-2 border-gray-200 dark:border-gray-700',
          'bg-gray-100 dark:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
        )}
        onClick={() => inputRef.current?.click()}
        aria-label={t('profilePhoto.changePhoto')}
      >
        {uploadMutation.isPending ? (
          <Skeleton className="h-full w-full rounded-full" />
        ) : displayUrl ? (
          <img
            src={displayUrl}
            alt={t('profilePhoto.heading')}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="mx-auto h-10 w-10 text-gray-400 dark:text-gray-500" />
        )}

        {/* Camera overlay on hover */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            'bg-black/40 opacity-0 transition-opacity group-hover:opacity-100',
          )}
        >
          <Camera className="h-6 w-6 text-white" />
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={handleFileChange}
      />

      <Button
        variant="secondary"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploadMutation.isPending}
      >
        {uploadMutation.isPending
          ? t('profilePhoto.uploading')
          : t('profilePhoto.upload')}
      </Button>
    </div>
  );
}
