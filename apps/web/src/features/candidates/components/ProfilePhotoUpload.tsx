import { useCallback, useState } from 'react';
import { Camera, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FileUpload, ImageCropper, Modal, Skeleton, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useUploadAvatar } from '../candidate.api';

interface ProfilePhotoUploadProps {
  currentPhotoUrl?: string;
  onUploaded?: (url: string) => void;
}

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ACCEPTED = 'image/*';

export default function ProfilePhotoUpload({
  currentPhotoUrl,
  onUploaded,
}: ProfilePhotoUploadProps) {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const uploadMutation = useUploadAvatar();
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFilesSelected = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }, []);

  const handleCrop = useCallback(
    (blob: Blob) => {
      // Show preview immediately
      const previewUrl = URL.createObjectURL(blob);
      setPreview(previewUrl);
      setCropSrc(null);

      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
      uploadMutation.mutate(file, {
        onSuccess: (data) => {
          notify(t('upload.avatarSuccess'), 'success');
          setPreview(null);
          onUploaded?.(data.url);
        },
        onError: () => {
          notify(t('upload.avatarFailed'), 'error');
          setPreview(null);
        },
      });
    },
    [uploadMutation, notify, t, onUploaded],
  );

  const handleCancelCrop = useCallback(() => {
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(null);
  }, [cropSrc]);

  const displayUrl = preview ?? currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar circle */}
      <div
        className={cn(
          'group relative h-28 w-28 overflow-hidden rounded-full',
          'border-2 border-gray-200 dark:border-gray-700',
          'bg-gray-100 dark:bg-gray-800',
        )}
      >
        {uploadMutation.isPending ? (
          <Skeleton className="h-full w-full rounded-full" />
        ) : displayUrl ? (
          <img
            src={displayUrl}
            alt={t('upload.profilePhoto')}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <User className="h-12 w-12 text-gray-400 dark:text-gray-500" />
          </div>
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
      </div>

      {/* File upload trigger */}
      <FileUpload
        accept={ACCEPTED}
        maxSize={MAX_SIZE}
        onUpload={handleFilesSelected}
        hint={t('upload.avatarHint')}
        isUploading={uploadMutation.isPending}
        className="w-full max-w-xs"
      />

      {/* Image cropper modal */}
      {cropSrc && (
        <Modal open onClose={handleCancelCrop} title={t('upload.cropHeading')} className="max-w-lg">
          <ImageCropper
            src={cropSrc}
            onCrop={handleCrop}
            onCancel={handleCancelCrop}
            aspect={1}
          />
        </Modal>
      )}
    </div>
  );
}
