import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, IndianRupee, Users } from 'lucide-react';
import {
  EmptyState,
  PageHeader,
  SecondaryButton,
  StatCard,
} from '@/employer/components/Cards/ui';
import { employerPaths } from '@/employer/constants/paths';
import { downloadBillingCsv, useCompanyBilling } from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';

function formatInr(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function BillingPage() {
  const { data, isLoading, isError, error } = useCompanyBilling();
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const onExport = async () => {
    setExportError(null);
    setExporting(true);
    try {
      await downloadBillingCsv();
    } catch (err) {
      setExportError(getErrorMessage(err, 'Failed to export billing CSV'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle={`₹${(data?.hireFee ?? 5000).toLocaleString('en-IN')} charged for each hired candidate.`}
        actions={
          <SecondaryButton disabled={exporting || isLoading} onClick={() => void onExport()}>
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </SecondaryButton>
        }
      />

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load billing')}
        </p>
      )}
      {exportError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{exportError}</p>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Hired candidates"
          value={isLoading ? '…' : data?.hireCount ?? 0}
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          label="Fee per hire"
          value={isLoading ? '…' : formatInr(data?.hireFee ?? 5000)}
          icon={<IndianRupee className="h-4 w-4" />}
        />
        <StatCard label="Subtotal" value={isLoading ? '…' : formatInr(data?.subtotal ?? 0)} />
        <StatCard
          label="Amount due"
          value={isLoading ? '…' : formatInr(data?.total ?? 0)}
          delta={data?.tax ? `Tax ${formatInr(data.tax)}` : 'No tax'}
        />
      </div>

      <section className="mt-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
          <h3 className="text-xs font-semibold text-slate-800">Hired candidates</h3>
          <p className="text-[11px] text-slate-400">
            Each hire = {formatInr(data?.hireFee ?? 5000)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">#</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Job</th>
                <th className="px-3 py-2">Hired on</th>
                <th className="px-3 py-2">City</th>
                <th className="px-3 py-2 text-right">Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(data?.hires ?? []).map((h, i) => (
                <tr key={h.jobSubscriberMapId} className="hover:bg-slate-50/80">
                  <td className="px-3 py-2 tabular-nums text-slate-400">{i + 1}</td>
                  <td className="px-3 py-2">
                    <Link
                      to={employerPaths.applicantProfile(h.jobSubscriberMapId)}
                      className="font-medium text-slate-800 hover:text-[#1A56DB]"
                    >
                      {h.fullName}
                    </Link>
                    <p className="text-[11px] text-slate-400">{h.email || h.mobile || '—'}</p>
                  </td>
                  <td className="px-3 py-2 text-slate-700">
                    {h.designation || `Job #${h.jobId}`}
                    {h.jobCity ? (
                      <span className="block text-[11px] text-slate-400">{h.jobCity}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-slate-600">{h.hiredOn || '—'}</td>
                  <td className="px-3 py-2 text-slate-600">{h.city || '—'}</td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums text-slate-800">
                    {formatInr(h.fee)}
                  </td>
                </tr>
              ))}
              {!isLoading && !data?.hires?.length && (
                <tr>
                  <td colSpan={6} className="px-3 py-8">
                    <EmptyState
                      title="No hired candidates yet"
                      description="When you mark a candidate as Hired, they appear here at ₹5,000 per hire."
                      action={
                        <Link to={employerPaths.hired}>
                          <SecondaryButton>View hired list</SecondaryButton>
                        </Link>
                      }
                    />
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                    Loading billing…
                  </td>
                </tr>
              )}
            </tbody>
            {(data?.hires?.length ?? 0) > 0 && (
              <tfoot className="border-t border-slate-200 bg-slate-50/80">
                <tr>
                  <td colSpan={5} className="px-3 py-2.5 text-right text-xs font-medium text-slate-600">
                    Total ({data?.hireCount ?? 0} × {formatInr(data?.hireFee ?? 5000)})
                  </td>
                  <td className="px-3 py-2.5 text-right text-sm font-semibold tabular-nums text-slate-900">
                    {formatInr(data?.total ?? 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>
    </div>
  );
}
