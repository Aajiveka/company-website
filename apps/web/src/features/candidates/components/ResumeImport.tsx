import { useCallback, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Upload, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';
import { Button, Card, Input, Skeleton, useToast } from '@/components/ui';

interface ParsedResume {
  name: string;
  email: string;
  phone: string;
  skills: string[];
  experience: string[];
  education: string[];
}

interface ResumeImportProps {
  onImported: () => void;
}

const ACCEPTED = '.pdf,.doc,.docx';
const ACCEPT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

export default function ResumeImport({ onImported }: ResumeImportProps) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState<ParsedResume | null>(null);
  const [edited, setEdited] = useState<ParsedResume | null>(null);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('resume', file);
      const { data } = await api.post<ParsedResume>(
        '/candidates/me/resume/import',
        fd,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      return data;
    },
    onSuccess: (data) => {
      setParsed(data);
      setEdited({ ...data });
    },
    onError: () => {
      notify(t('resumeImport.importFailed'), 'error');
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: ParsedResume) => {
      await api.patch('/candidates/me/profile', data);
    },
    onSuccess: () => {
      notify(t('resumeImport.imported'), 'success');
      onImported();
    },
    onError: () => {
      notify(t('resumeImport.importFailed'), 'error');
    },
  });

  const handleFile = useCallback(
    (file: File) => {
      if (!ACCEPT_TYPES.includes(file.type)) return;
      uploadMutation.mutate(file);
    },
    [uploadMutation],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const onDragLeave = useCallback(() => setDragOver(false), []);

  const onBrowse = useCallback(() => inputRef.current?.click(), []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  const updateField = <K extends keyof ParsedResume>(
    key: K,
    value: ParsedResume[K],
  ) => {
    setEdited((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  return (
    <Card className="space-y-6">
      <h2 className="text-lg font-semibold text-navy dark:text-gray-100">
        {t('resumeImport.heading')}
      </h2>

      {/* Drop zone */}
      {!parsed && (
        <div
          role="button"
          tabIndex={0}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={onBrowse}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onBrowse();
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition',
            dragOver
              ? 'border-primary bg-primary/5 dark:bg-primary/10'
              : 'border-gray-300 hover:border-primary/50 dark:border-gray-600 dark:hover:border-primary/50',
          )}
        >
          <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('resumeImport.dragDrop')}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            tabIndex={-1}
            isLoading={uploadMutation.isPending}
          >
            {t('resumeImport.uploadResume')}
          </Button>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={onFileChange}
          />
        </div>
      )}

      {/* Parsing skeleton */}
      {uploadMutation.isPending && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('resumeImport.parsing')}
          </p>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      )}

      {/* Parsed results preview */}
      {parsed && edited && !uploadMutation.isPending && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 dark:text-green-400">
            <FileText className="h-4 w-4" />
            {t('resumeImport.parsed')}
          </div>

          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('resumeImport.preview')}
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('cv.fullName')}
              value={edited.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
            <Input
              label={t('cv.email')}
              type="email"
              value={edited.email}
              onChange={(e) => updateField('email', e.target.value)}
            />
            <Input
              label={t('cv.mobile')}
              value={edited.phone}
              onChange={(e) => updateField('phone', e.target.value)}
            />
            <Input
              label={t('profile.skills')}
              value={edited.skills.join(', ')}
              onChange={(e) =>
                updateField(
                  'skills',
                  e.target.value.split(',').map((s) => s.trim()),
                )
              }
            />
          </div>

          <Button
            onClick={() => importMutation.mutate(edited)}
            isLoading={importMutation.isPending}
          >
            <Check className="h-4 w-4" />
            {importMutation.isPending
              ? t('resumeImport.importing')
              : t('resumeImport.importToProfile')}
          </Button>
        </div>
      )}
    </Card>
  );
}
