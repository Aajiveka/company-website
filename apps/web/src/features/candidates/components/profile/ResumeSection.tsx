import { useState } from 'react';
import { Download, FileText, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, ConfirmDialog, FileUpload, useToast } from '@/components/ui';
import { useDeleteResume, useDownloadResume, useUploadResume } from '../../candidate.api';
import type { CandidateProfile } from '../../candidate.types';
import { Section } from './section';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB — matches the hint shown under the drop zone.
const ACCEPTED = '.pdf,.doc,.docx,.rtf';

/**
 * The resume card: the current file with its own name and upload date, plus the drop zone to
 * replace it. The name and date come from tblSubscriberCVUploaded — CVDetails.CVPath alone
 * only ever held a generated storage key.
 */
export function ResumeSection({ profile }: { profile: CandidateProfile }) {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const { notify } = useToast();
  const upload = useUploadResume();
  const remove = useDeleteResume();
  const download = useDownloadResume();
  const [progress, setProgress] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const uploadedOn = profile.resumeUploadedAt
    ? new Date(profile.resumeUploadedAt).toLocaleDateString(i18n.language, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

  const handleUpload = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setProgress(0);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: () => {
          notify(t('profile.resume.uploaded'), 'success');
          setProgress(0);
        },
        onError: () => {
          notify(t('profile.resume.uploadFailed'), 'error');
          setProgress(0);
        },
      },
    );
  };

  return (
    <Section id="resume" title={t('profile.resume.heading')}>
      {profile.resumeUrl && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-navy dark:text-gray-200">
                {profile.resumeFileName ?? t('profile.resume.currentFile')}
              </p>
              {uploadedOn && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('profile.resume.uploadedOn', { date: uploadedOn })}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              size="sm"
              isLoading={download.isPending}
              onClick={() =>
                download.mutate(profile.resumeFileName ?? 'resume', {
                  onError: () => notify(t('profile.resume.downloadFailed'), 'error'),
                })
              }
              aria-label={tCommon('actions.download')}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              className="text-red-600 hover:bg-red-600 dark:text-red-400"
              aria-label={tCommon('actions.delete')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <FileUpload
        accept={ACCEPTED}
        maxSize={MAX_SIZE}
        onUpload={handleUpload}
        hint={t('profile.resume.hint')}
        isUploading={upload.isPending}
        progress={progress}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title={t('profile.resume.deleteTitle')}
        message={t('profile.resume.deleteMessage')}
        variant="danger"
        isLoading={remove.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              notify(t('profile.resume.deleted'), 'success');
              setConfirmOpen(false);
            },
            onError: () => notify(t('profile.resume.deleteFailed'), 'error'),
          })
        }
      />
    </Section>
  );
}
