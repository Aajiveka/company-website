import { useState } from 'react';
import { Download, FileText, BarChart3, Filter } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, CardHeader, CardTitle } from '@/components/ui';
import { api } from '@/lib/axios';

interface DateRange {
  from: string;
  to: string;
}

type ReportType = 'applicants' | 'jobs' | 'funnel';

const REPORT_ENDPOINTS: Record<ReportType, string> = {
  applicants: '/clients/me/reports/applicants',
  jobs: '/clients/me/reports/jobs',
  funnel: '/clients/me/reports/funnel',
};

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? '');
          return val.includes(',') || val.includes('"') || val.includes('\n')
            ? `"${val.replace(/"/g, '""')}"`
            : val;
        })
        .join(','),
    ),
  ];
  return lines.join('\n');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function thirtyDaysAgoString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}

interface ReportCardProps {
  type: ReportType;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function ReportCard({ type, icon, title, description }: ReportCardProps) {
  const { t } = useTranslation('dashboard');
  const [range, setRange] = useState<DateRange>({
    from: thirtyDaysAgoString(),
    to: todayString(),
  });

  const fetchReport = async (): Promise<Record<string, unknown>[]> => {
    const res = await api.get<Record<string, unknown>[]>(REPORT_ENDPOINTS[type], {
      params: { from: range.from, to: range.to },
    });
    return res.data;
  };

  const csvExport = useMutation({
    mutationFn: async () => {
      const rows = await fetchReport();
      const csv = toCsv(rows);
      downloadBlob(csv, `${type}-report-${range.from}-${range.to}.csv`, 'text/csv;charset=utf-8;');
    },
  });

  const pdfExport = useMutation({
    mutationFn: async () => {
      const rows = await fetchReport();
      const { default: jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(16);
      doc.text(title, 14, 20);
      doc.setFontSize(10);
      doc.text(`${range.from} - ${range.to}`, 14, 28);

      if (rows.length === 0) {
        doc.setFontSize(12);
        doc.text(t('reports.noData'), 14, 42);
        doc.save(`${type}-report-${range.from}-${range.to}.pdf`);
        return;
      }

      const headers = Object.keys(rows[0]);
      const colWidth = (pageWidth - 28) / headers.length;
      let y = 38;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      headers.forEach((header, i) => {
        doc.text(header, 14 + i * colWidth, y, { maxWidth: colWidth - 2 });
      });

      doc.setFont('helvetica', 'normal');
      y += 6;

      for (const row of rows) {
        if (y > 280) {
          doc.addPage();
          y = 20;
          doc.setFont('helvetica', 'bold');
          headers.forEach((header, i) => {
            doc.text(header, 14 + i * colWidth, y, { maxWidth: colWidth - 2 });
          });
          doc.setFont('helvetica', 'normal');
          y += 6;
        }
        headers.forEach((header, i) => {
          doc.text(String(row[header] ?? ''), 14 + i * colWidth, y, { maxWidth: colWidth - 2 });
        });
        y += 5;
      }

      doc.save(`${type}-report-${range.from}-${range.to}.pdf`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>
      <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{description}</p>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('reports.from')}
          </label>
          <input
            type="date"
            value={range.from}
            onChange={(e) => setRange((prev) => ({ ...prev, from: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('reports.to')}
          </label>
          <input
            type="date"
            value={range.to}
            onChange={(e) => setRange((prev) => ({ ...prev, to: e.target.value }))}
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-navy outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => csvExport.mutate()}
          disabled={csvExport.isPending || pdfExport.isPending}
        >
          {csvExport.isPending ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('reports.exporting')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Download className="h-3.5 w-3.5" />
              {t('reports.exportCsv')}
            </span>
          )}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => pdfExport.mutate()}
          disabled={csvExport.isPending || pdfExport.isPending}
        >
          {pdfExport.isPending ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {t('reports.exporting')}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              {t('reports.exportPdf')}
            </span>
          )}
        </Button>
      </div>
    </Card>
  );
}

export default function ReportExportPage() {
  const { t } = useTranslation('dashboard');

  const reports: ReportCardProps[] = [
    {
      type: 'applicants',
      icon: <FileText className="h-5 w-5" />,
      title: t('reports.applicantReport'),
      description: t('reports.applicantReportDesc'),
    },
    {
      type: 'jobs',
      icon: <BarChart3 className="h-5 w-5" />,
      title: t('reports.jobPerformanceReport'),
      description: t('reports.jobPerformanceReportDesc'),
    },
    {
      type: 'funnel',
      icon: <Filter className="h-5 w-5" />,
      title: t('reports.hiringFunnelReport'),
      description: t('reports.hiringFunnelReportDesc'),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/company/profile' },
          { label: t('reports.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('reports.heading')}</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {reports.map((report) => (
          <ReportCard key={report.type} {...report} />
        ))}
      </div>
    </div>
  );
}
