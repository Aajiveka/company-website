import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

interface ParsedRow {
  designation: string;
  city: string;
  workMode: string;
  employmentType: string;
  minExp: string;
  minCtc: string;
  maxCtc: string;
  description: string;
  errors: string[];
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map((line) => {
    const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ''; });
    const errors: string[] = [];
    if (!row.designation) errors.push('Missing designation');
    if (!row.city) errors.push('Missing city');
    if (!row.minctc || isNaN(Number(row.minctc))) errors.push('Invalid min CTC');
    if (!row.maxctc || isNaN(Number(row.maxctc))) errors.push('Invalid max CTC');
    return {
      designation: row.designation || '',
      city: row.city || '',
      workMode: row.workmode || 'On-site',
      employmentType: row.employmenttype || 'Full-time',
      minExp: row.minexp || '0',
      minCtc: row.minctc || '0',
      maxCtc: row.maxctc || '0',
      description: row.description || '',
      errors,
    };
  });
}

export default function BulkJobImportPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const onFile = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setRows(parseCSV(text));
    };
    reader.readAsText(file);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) onFile(file);
  }, [onFile]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFile(file);
  };

  const validRows = rows.filter((r) => r.errors.length === 0);
  const errorRows = rows.filter((r) => r.errors.length > 0);

  const upload = useMutation({
    mutationFn: () =>
      api.post('/clients/me/jobs/bulk', {
        jobs: validRows.map((r) => ({
          designation: r.designation,
          city: r.city,
          workMode: r.workMode,
          employmentType: r.employmentType,
          minExp: Number(r.minExp),
          minCtc: Number(r.minCtc),
          maxCtc: Number(r.maxCtc),
          description: r.description,
        })),
      }).then((r) => r.data),
    onSuccess: () => {
      notify(t('bulkImport.success', { count: validRows.length }), 'success');
      setRows([]);
      setFileName('');
    },
    onError: () => notify(t('bulkImport.failed'), 'error'),
  });

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/company/profile' }, { label: t('bulkImport.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('bulkImport.heading')}</h1>

      {/* Upload area */}
      {rows.length === 0 && (
        <Card>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition',
              dragOver ? 'border-primary bg-primary/5' : 'border-gray-300 dark:border-gray-600',
            )}
          >
            <Upload className="mb-3 h-10 w-10 text-gray-400" />
            <p className="text-sm font-medium text-navy">{t('bulkImport.dragDrop')}</p>
            <p className="mt-1 text-xs text-gray-500">{t('bulkImport.orClick')}</p>
            <label className="mt-4 cursor-pointer">
              <Button type="button" variant="outline" size="sm" asChild>
                <span><FileSpreadsheet className="mr-1.5 h-4 w-4" /> {t('bulkImport.chooseFile')}</span>
              </Button>
              <input type="file" accept=".csv" className="hidden" onChange={onInputChange} />
            </label>
          </div>

          <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
            <p className="text-xs font-medium text-navy">{t('bulkImport.csvFormat')}</p>
            <code className="mt-1 block text-xs text-gray-500">
              designation, city, workMode, employmentType, minExp, minCtc, maxCtc, description
            </code>
          </div>
        </Card>
      )}

      {/* Preview */}
      {rows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-navy">{fileName}</p>
              <p className="text-xs text-gray-500">
                {t('bulkImport.summary', { total: rows.length, valid: validRows.length, errors: errorRows.length })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setRows([]); setFileName(''); }}>
                {t('common:actions.cancel')}
              </Button>
              <Button
                size="sm"
                disabled={validRows.length === 0}
                onClick={() => upload.mutate()}
                isLoading={upload.isPending}
              >
                <CheckCircle2 className="mr-1 h-4 w-4" /> {t('bulkImport.importButton', { count: validRows.length })}
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-3 py-2 font-medium">#</th>
                  <th className="px-3 py-2 font-medium">{t('common:labels.designation')}</th>
                  <th className="px-3 py-2 font-medium">{t('common:labels.location')}</th>
                  <th className="px-3 py-2 font-medium">{t('common:labels.workMode')}</th>
                  <th className="px-3 py-2 font-medium">CTC</th>
                  <th className="px-3 py-2 font-medium">{t('common:labels.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((r, i) => (
                  <tr key={i} className={r.errors.length > 0 ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                    <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-3 py-2 text-navy">{r.designation}</td>
                    <td className="px-3 py-2">{r.city}</td>
                    <td className="px-3 py-2">{r.workMode}</td>
                    <td className="px-3 py-2">{r.minCtc}–{r.maxCtc}</td>
                    <td className="px-3 py-2">
                      {r.errors.length > 0 ? (
                        <span className="flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="h-3.5 w-3.5" /> {r.errors.join(', ')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" /> OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
