import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Copy, Link as LinkIcon, Video } from 'lucide-react';
import { api } from '@/lib/axios';
import { Button, Input, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';

type InterviewType = 'in-person' | 'phone' | 'video';
type Platform = 'google-meet' | 'zoom' | 'microsoft-teams' | 'custom';

interface PlatformOption {
  value: Platform;
  label: string;
}

interface Props {
  onLinkGenerated: (link: string) => void;
}

const PLATFORMS: PlatformOption[] = [
  { value: 'google-meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'microsoft-teams', label: 'Microsoft Teams' },
  { value: 'custom', label: 'Custom Link' },
];

function useGenerateInterviewLink() {
  return useMutation({
    mutationFn: (platform: string) =>
      api
        .post<{ link: string }>('/clients/me/interviews/generate-link', { platform })
        .then((r) => r.data),
  });
}

export default function VideoInterviewSetup({ onLinkGenerated }: Props) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();

  const [interviewType, setInterviewType] = useState<InterviewType>('in-person');
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [customLink, setCustomLink] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const generateLink = useGenerateInterviewLink();

  const interviewTypes: { value: InterviewType; label: string }[] = [
    { value: 'in-person', label: t('videoInterview.inPerson') },
    { value: 'phone', label: t('videoInterview.phone') },
    { value: 'video', label: t('videoInterview.videoCall') },
  ];

  const handleGenerateLink = () => {
    if (!platform || platform === 'custom') return;

    const platformLabel = PLATFORMS.find((p) => p.value === platform)?.label ?? platform;
    generateLink.mutate(platformLabel, {
      onSuccess: (data) => {
        setGeneratedLink(data.link);
        onLinkGenerated(data.link);
      },
      onError: () => {
        notify(t('videoInterview.generateFailed'), 'error');
      },
    });
  };

  const handleCustomLinkConfirm = () => {
    if (!customLink.trim()) return;
    setGeneratedLink(customLink.trim());
    onLinkGenerated(customLink.trim());
  };

  const handleCopy = async () => {
    const link = platform === 'custom' ? customLink : generatedLink;
    if (!link) return;
    await navigator.clipboard.writeText(link);
    notify(t('videoInterview.linkCopied'), 'success');
  };

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          {t('videoInterview.typeLabel')}
        </legend>
        <div className="flex flex-wrap gap-3">
          {interviewTypes.map((type) => (
            <label
              key={type.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2.5 text-sm transition',
                interviewType === type.value
                  ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-900/20 dark:text-teal-300'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600',
              )}
            >
              <input
                type="radio"
                name="interviewType"
                value={type.value}
                checked={interviewType === type.value}
                onChange={() => {
                  setInterviewType(type.value);
                  setPlatform(null);
                  setCustomLink('');
                  setGeneratedLink('');
                }}
                className="sr-only"
              />
              {type.label}
            </label>
          ))}
        </div>
      </fieldset>

      {interviewType === 'video' && (
        <div className="space-y-4">
          <fieldset>
            <legend className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('videoInterview.platformLabel')}
            </legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PLATFORMS.map((p) => (
                <label
                  key={p.value}
                  className={cn(
                    'flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition',
                    platform === p.value
                      ? 'border-teal-500 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-900/20 dark:text-teal-300'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600',
                  )}
                >
                  <input
                    type="radio"
                    name="platform"
                    value={p.value}
                    checked={platform === p.value}
                    onChange={() => {
                      setPlatform(p.value);
                      setGeneratedLink('');
                      setCustomLink('');
                    }}
                    className="sr-only"
                  />
                  {p.value === 'custom' ? (
                    <LinkIcon className="h-3.5 w-3.5" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  {p.label}
                </label>
              ))}
            </div>
          </fieldset>

          {platform === 'custom' && (
            <div className="space-y-2">
              <Input
                label={t('videoInterview.customLinkLabel')}
                placeholder="https://"
                value={customLink}
                onChange={(e) => setCustomLink(e.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCustomLinkConfirm}
                  disabled={!customLink.trim()}
                >
                  {t('videoInterview.confirmLink')}
                </Button>
                {customLink.trim() && (
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" />
                    {t('videoInterview.copy')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {platform && platform !== 'custom' && !generatedLink && (
            <Button
              size="sm"
              onClick={handleGenerateLink}
              isLoading={generateLink.isPending}
              className="gap-1.5"
            >
              <Video className="h-4 w-4" />
              {t('videoInterview.generateLink')}
            </Button>
          )}

          {platform && platform !== 'custom' && generatedLink && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('videoInterview.generatedLinkLabel')}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                />
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" />
                  {t('videoInterview.copy')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
