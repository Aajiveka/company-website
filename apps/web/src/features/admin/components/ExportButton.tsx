import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download } from 'lucide-react';
import { Button, useToast } from '@/components/ui';
import { api } from '@/lib/axios';

interface ExportButtonProps {
  /** API endpoint path, e.g. "/exports/users" */
  endpoint: string;
  /** Suggested download filename (without extension) */
  filename: string;
  /** Button label */
  label: string;
  /** Optional query params to append */
  filters?: Record<string, string | number | boolean | undefined>;
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
}

/**
 * Triggers a CSV download from the API export endpoints.
 * Shows a loading spinner during the request.
 */
export default function ExportButton({
  endpoint,
  filename,
  label,
  filters,
  size = 'sm',
  variant = 'outline',
}: ExportButtonProps) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      // Build params — strip undefined values and add format=csv
      const params: Record<string, string | number | boolean> = { format: 'csv' };
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== '') params[k] = v;
        }
      }

      const res = await api.get(endpoint, {
        params,
        responseType: 'blob',
      });

      // Create a blob URL and trigger browser download
      const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filename}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
    } catch {
      notify('Export failed. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size={size} variant={variant} onClick={handleExport} disabled={loading} className="w-full sm:w-auto">
      {loading ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          {t('export.exporting')}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 truncate">
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
        </span>
      )}
    </Button>
  );
}
