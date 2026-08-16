import { PageHeader, EmptyState } from '@/employer/components/Cards/ui';

export function MessagesPage() {
  return (
    <div>
      <PageHeader title="Messages" subtitle="Candidate messaging is not available in this release." />
      <EmptyState
        title="Messaging coming soon"
        description="Employer–candidate messaging will appear here once the messaging service is enabled."
      />
    </div>
  );
}
