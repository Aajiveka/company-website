import { useCallback, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, X } from 'lucide-react';
import { Button, Input, Card, Modal, useToast } from '@/components/ui';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';

/* ---------- types / schema ---------- */

interface ParsedCSV {
  headers: string[];
  rows: string[][];
  emailColumnIndex: number;
}

const composeSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

type ComposeValues = z.infer<typeof composeSchema>;

interface Props {
  onComplete: () => void;
}

/* ---------- CSV parser ---------- */

function parseCSV(text: string): ParsedCSV | null {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return null;

  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const emailColumnIndex = headers.findIndex(
    (h) => h.toLowerCase() === 'email' || h.toLowerCase() === 'e-mail',
  );
  if (emailColumnIndex === -1) return null;

  const rows = lines.slice(1).map((line) =>
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, '')),
  );

  return { headers, rows, emailColumnIndex };
}

/* ---------- hooks ---------- */

function useBulkEmailSend() {
  return useMutation({
    mutationFn: (formData: FormData) =>
      api
        .post('/clients/me/campaigns/bulk', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),
  });
}

/* ---------- step indicator ---------- */

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="mb-6 flex items-center justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors',
            i + 1 === current
              ? 'bg-primary text-white'
              : i + 1 < current
                ? 'bg-primary/20 text-primary dark:bg-primary/30'
                : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
          )}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

/* ---------- component ---------- */

export default function BulkEmailUpload({ onComplete }: Props) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const send = useBulkEmailSend();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedCSV | null>(null);
  const [csvError, setCsvError] = useState<string | undefined>();
  const [dragOver, setDragOver] = useState(false);
  const [modalOpen, setModalOpen] = useState(true);

  const compose = useForm<ComposeValues>({
    resolver: zodResolver(composeSchema),
    defaultValues: { subject: '', body: '' },
  });

  /* file handling */
  const processFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith('.csv')) {
        setCsvError(t('bulkEmail.invalidFormat'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        const result = parseCSV(text);
        if (!result) {
          setCsvError(t('bulkEmail.noEmailColumn'));
          return;
        }
        setCsvFile(file);
        setParsed(result);
        setCsvError(undefined);
      };
      reader.readAsText(file);
    },
    [t],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const removeFile = () => {
    setCsvFile(null);
    setParsed(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* navigation */
  const goNext = useCallback(async () => {
    if (step === 1) {
      if (!csvFile || !parsed) {
        setCsvError(t('bulkEmail.uploadRequired'));
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const ok = await compose.trigger();
      if (!ok) return;
      setStep(3);
    }
  }, [step, csvFile, parsed, compose, t]);

  const goBack = () => {
    if (step > 1) setStep((s) => s - 1);
  };

  /* submit */
  const handleSubmit = () => {
    if (!csvFile) return;
    const fd = new FormData();
    fd.append('csv', csvFile);
    fd.append('subject', compose.getValues('subject'));
    fd.append('body', compose.getValues('body'));

    send.mutate(fd, {
      onSuccess: () => {
        notify(t('bulkEmail.success'), 'success');
        onComplete();
      },
      onError: (e) =>
        notify(
          isAxiosError(e)
            ? (e.response?.data?.message ?? t('bulkEmail.error'))
            : t('bulkEmail.error'),
          'error',
        ),
    });
  };

  const composeValues = compose.watch();
  const previewRows = parsed?.rows.slice(0, 5) ?? [];
  const recipientCount = parsed?.rows.length ?? 0;

  return (
    <Modal
      open={modalOpen}
      onClose={() => {
        setModalOpen(false);
        onComplete();
      }}
      title={t('bulkEmail.title')}
      className="max-w-2xl"
    >
      <StepIndicator current={step} total={3} />

      {/* Step 1 — Upload CSV */}
      {step === 1 && (
        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition',
              dragOver
                ? 'border-primary bg-primary/5 dark:bg-primary/10'
                : csvError
                  ? 'border-danger bg-danger/5'
                  : 'border-gray-300 hover:border-primary dark:border-gray-600 dark:hover:border-primary',
            )}
          >
            <Upload className="mb-3 h-10 w-10 text-gray-400 dark:text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('bulkEmail.dragDrop')}
            </span>
            <span className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t('bulkEmail.csvOnly')}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileInput}
            />
          </div>

          {csvError && (
            <p role="alert" className="text-xs text-danger">
              {csvError}
            </p>
          )}

          {csvFile && parsed && (
            <Card className="!p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm font-medium text-navy dark:text-gray-200">
                    {csvFile.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({recipientCount} {t('bulkEmail.recipients')})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-600">
                      {parsed.headers.map((h, i) => (
                        <th
                          key={i}
                          className={cn(
                            'px-2 py-1 font-semibold text-gray-600 dark:text-gray-400',
                            i === parsed.emailColumnIndex && 'text-primary',
                          )}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr
                        key={ri}
                        className="border-b border-gray-100 dark:border-gray-700"
                      >
                        {row.map((cell, ci) => (
                          <td
                            key={ci}
                            className="px-2 py-1 text-gray-700 dark:text-gray-300"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsed.rows.length > 5 && (
                <p className="mt-1 text-xs text-gray-400">
                  {t('bulkEmail.andMore', { count: parsed.rows.length - 5 })}
                </p>
              )}
            </Card>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" size="sm" onClick={goNext}>
              {t('bulkEmail.next')}
            </Button>
          </div>
        </div>
      )}

      {/* Step 2 — Compose Email */}
      {step === 2 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goNext();
          }}
          className="space-y-4"
          noValidate
        >
          <Input
            label={t('bulkEmail.subject')}
            error={compose.formState.errors.subject?.message}
            placeholder={t('bulkEmail.subjectPlaceholder')}
            required
            {...compose.register('subject')}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
              {t('bulkEmail.body')}
              <span className="ml-0.5 text-danger" aria-hidden>*</span>
            </label>
            <textarea
              className={cn(
                'w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition',
                'placeholder:text-gray-400 focus:ring-2 focus:ring-primary/30',
                'dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
                compose.formState.errors.body
                  ? 'border-danger focus:ring-danger/30'
                  : 'border-gray-300 focus:border-primary dark:border-gray-600',
              )}
              rows={6}
              placeholder={t('bulkEmail.bodyPlaceholder')}
              {...compose.register('body')}
            />
            {compose.formState.errors.body && (
              <p role="alert" className="mt-1 text-xs text-danger">
                {compose.formState.errors.body.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {t('bulkEmail.placeholderHint')}
            </p>
          </div>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              {t('bulkEmail.back')}
            </Button>
            <Button type="submit" size="sm">
              {t('bulkEmail.next')}
            </Button>
          </div>
        </form>
      )}

      {/* Step 3 — Review */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="!p-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-navy dark:text-gray-200">
                  {t('bulkEmail.recipientCount')}
                </dt>
                <dd className="text-gray-700 dark:text-gray-300">
                  {recipientCount} {t('bulkEmail.recipients')}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-navy dark:text-gray-200">
                  {t('bulkEmail.subject')}
                </dt>
                <dd className="text-gray-700 dark:text-gray-300">{composeValues.subject}</dd>
              </div>
              <div>
                <dt className="font-medium text-navy dark:text-gray-200">
                  {t('bulkEmail.bodyPreview')}
                </dt>
                <dd className="mt-1 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-gray-700 dark:bg-gray-700/50 dark:text-gray-300">
                  {composeValues.body}
                </dd>
              </div>
            </dl>
          </Card>

          <div className="flex justify-between pt-2">
            <Button type="button" variant="outline" size="sm" onClick={goBack}>
              {t('bulkEmail.back')}
            </Button>
            <Button
              type="button"
              size="sm"
              isLoading={send.isPending}
              onClick={handleSubmit}
            >
              {t('bulkEmail.confirm')}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
