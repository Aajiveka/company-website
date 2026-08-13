import { CreditCard, Download, FilePlus2 } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
  StatCard,
} from '@/employer/components/Cards/ui';
import { DataTable, type Column } from '@/employer/components/Tables/DataTable';
import { mockInvoices } from '@/employer/constants/mockData';

type Invoice = (typeof mockInvoices)[number];

function tone(status: Invoice['status']): 'success' | 'warning' | 'danger' {
  if (status === 'Paid') return 'success';
  if (status === 'Pending') return 'warning';
  return 'danger';
}

const inr = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export function BillingPage() {
  const outstanding = mockInvoices.filter((i) => i.status === 'Outstanding');
  const paid = mockInvoices.filter((i) => i.status === 'Paid');
  const pending = mockInvoices.filter((i) => i.status === 'Pending');

  const sum = (rows: Invoice[]) => rows.reduce((acc, r) => acc + r.amount + r.gst, 0);

  const columns: Column<Invoice>[] = [
    {
      key: 'id',
      header: 'Invoice',
      render: (row) => <span className="font-medium text-slate-800">{row.id}</span>,
    },
    { key: 'candidate', header: 'Candidate', render: (row) => row.candidate },
    { key: 'job', header: 'Job', render: (row) => row.job },
    { key: 'amount', header: 'Amount', render: (row) => inr(row.amount) },
    { key: 'gst', header: 'GST', render: (row) => inr(row.gst) },
    {
      key: 'total',
      header: 'Total',
      render: (row) => <span className="font-semibold text-slate-800">{inr(row.amount + row.gst)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <EmployerBadge tone={tone(row.status)}>{row.status}</EmployerBadge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row) => (
        <div className="flex flex-wrap gap-1">
          <SecondaryButton className="!px-2 !py-1 text-xs">
            <Download className="h-3.5 w-3.5" />
            Download
          </SecondaryButton>
          {row.status !== 'Paid' && (
            <PrimaryButton className="!px-2 !py-1 text-xs">
              <CreditCard className="h-3.5 w-3.5" />
              Pay
            </PrimaryButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Billing & Invoices"
        subtitle="Track outstanding dues, pending invoices, and payment history."
        actions={
          <PrimaryButton>
            <FilePlus2 className="h-4 w-4" />
            Generate Invoice
          </PrimaryButton>
        }
      />

      <div className="grid gap-2 sm:grid-cols-3">
        <StatCard label="Outstanding" value={inr(sum(outstanding))} delta={`${outstanding.length} invoices`} />
        <StatCard label="Paid" value={inr(sum(paid))} delta={`${paid.length} invoices`} />
        <StatCard label="Pending" value={inr(sum(pending))} delta={`${pending.length} invoices`} />
      </div>

      <div className="mt-3">
        <DataTable
          columns={columns}
          rows={mockInvoices}
          empty={<EmptyState title="No invoices" description="Generated invoices will appear here." />}
        />
      </div>
    </div>
  );
}
