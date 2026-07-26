import { useState } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, FileUpload, useToast } from '@/components/ui';
import { useUploadResume, useDeleteResume, useCandidateProfile } from '../candidate.api';

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ACCEPTED = '.pdf,.doc,.docx';

export default function ResumeUpload() {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const { data: profile } = useCandidateProfile();
  const uploadMutation = useUploadResume();
  const deleteMutation = useDeleteResume();
  const [progress, setProgress] = useState(0);

  const hasResume = !!profile?.resumeUrl;

  const handleUpload = (files: File[]) => {
    const file = files[0];
    if (!file) return;

    setProgress(0);
    uploadMutation.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: () => {
          notify(t('upload.resumeSuccess'), 'success');
          setProgress(0);
        },
        onError: () => {
          notify(t('upload.resumeFailed'), 'error');
          setProgress(0);
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(undefined, {
      onSuccess: () => notify(t('upload.resumeDeleted'), 'success'),
      onError: () => notify(t('upload.resumeDeleteFailed'), 'error'),
    });
  };

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy dark:text-gray-100">
        {t('upload.resumeHeading')}
      </h2>

      {/* Current resume */}
      {hasResume && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-navy dark:text-gray-200">
                {profile?.resumeFileName ?? t('upload.currentResume')}
              </p>
              {profile?.resumeUploadedAt && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('upload.uploadedOn', { date: profile.resumeUploadedAt })}
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={profile?.resumeUrl ?? '#'}
              download
              className="inline-flex items-center gap-1 rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary transition hover:bg-primary hover:text-white"
            >
              <Download className="h-4 w-4" />
              {t('actions.download')}
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDelete}
              isLoading={deleteMutation.isPending}
              className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <FileUpload
        accept={ACCEPTED}
        maxSize={MAX_SIZE}
        onUpload={handleUpload}
        hint={t('upload.resumeHint')}
        isUploading={uploadMutation.isPending}
        progress={progress}
      />
    </Card>
  );
}
