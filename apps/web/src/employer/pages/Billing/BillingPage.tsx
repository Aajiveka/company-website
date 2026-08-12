import { EmptyState, PageHeader } from '@/employer/components/Cards/ui';

export function BillingPage() {
  return (
    <div>
      <PageHeader title="Billing & Invoices" subtitle="Invoicing is not available in this release." />
      <EmptyState
        title="Billing coming soon"
        description="Client invoices and payments will appear here once billing is enabled for your account."
      />
    </div>
  );
}
