import { useState } from 'react';
import { Download, FileText, IndianRupee, Wallet } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  SecondaryButton,
  StatCard,
} from '@/employer/components/Cards/ui';
import { downloadBillingCsv, useCompanyBilling } from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';
import { dateLabel } from '@/employer/utils/format';

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function statusTone(status: string): 'success' | 'warning' | 'neutral' | 'danger' {
  if (status === 'Paid') return 'success';
  if (status === 'Cancelled') return 'neutral';
  return 'warning';
}

export function BillingPage() {
  const { data, isLoading, isError, error } = useCompanyBilling();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const invoices = data?.invoices ?? [];

  const onExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      await downloadBillingCsv();
    } catch (err) {
      setExportError(getErrorMessage(err, 'Failed to export invoices'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Invoices raised to your company by Aajiveka."
        actions={
          invoices.length > 0 ? (
            <SecondaryButton disabled={exporting} onClick={() => void onExport()}>
              <Download className="h-4 w-4" />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </SecondaryButton>
          ) : null
        }
      />

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load invoices')}
        </p>
      )}
      {exportError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {exportError}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard
          label="Invoices"
          value={isLoading ? '…' : (data?.invoiceCount ?? 0)}
          icon={<FileText className="h-4 w-4" />}
        />
        <StatCard
          label="Total billed"
          value={isLoading ? '…' : formatInr(data?.totalBilled ?? 0)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard
          label="Outstanding"
          value={isLoading ? '…' : formatInr(data?.outstanding ?? 0)}
          icon={<Wallet className="h-4 w-4" />}
          delta={data?.totalPaid ? `Paid ${formatInr(data.totalPaid)}` : undefined}
        />
      </div>

      <section className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-3 py-2">
          <h3 className="text-xs font-semibold text-slate-800">Invoices</h3>
        </div>

        {isLoading ? (
          <p className="px-3 py-6 text-center text-xs text-slate-400">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <div className="px-3 py-8">
            <EmptyState
              title="No invoices yet"
              description="Invoices appear here once Aajiveka raises one for your company."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Invoice no.</th>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-right">Tax</th>
                  <th className="px-3 py-2 text-right">Total</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.invoiceId} className="hover:bg-slate-50/80">
                    <td className="px-3 py-2 font-medium text-slate-800">{inv.invoiceNo}</td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">
                      {dateLabel(inv.invoiceDate)}
                    </td>
                    <td className="px-3 py-2 tabular-nums text-slate-600">
                      {inv.dueDate ? dateLabel(inv.dueDate) : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{inv.description || '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {formatInr(inv.amount)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                      {formatInr(inv.tax)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-900">
                      {formatInr(inv.total)}
                    </td>
                    <td className="px-3 py-2">
                      <EmployerBadge tone={statusTone(inv.status)}>
                        {inv.status === 'Paid' && inv.paidAt
                          ? `Paid ${dateLabel(inv.paidAt)}`
                          : inv.status}
                      </EmployerBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
