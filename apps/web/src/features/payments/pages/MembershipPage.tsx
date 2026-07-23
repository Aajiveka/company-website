import { Alert, Breadcrumbs, CardSkeleton } from '@/components/ui';
import { PricingPlans } from '@/features/public/components/PricingPlans';
import { useSubscription } from '../payments.api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/** Subscriber-facing membership view: current status + subscribe / renew. */
export default function MembershipPage() {
  const { data, isLoading } = useSubscription();
  const active = data && data.active ? data : null;

  return (
    <div>
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/candidate/profile' }, { label: 'Membership' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">Membership</h1>

      {isLoading ? (
        <CardSkeleton />
      ) : active ? (
        <Alert variant="success">
          Your <strong>{active.plan}</strong> membership is active until {formatDate(active.endsAt)}.
        </Alert>
      ) : (
        <Alert variant="info">You don't have an active membership yet. Choose a plan below to get started.</Alert>
      )}

      <h2 className="mt-8 text-center font-heading text-xl font-semibold text-navy">
        {active ? 'Renew or upgrade' : 'Choose a plan'}
      </h2>
      <PricingPlans />
    </div>
  );
}
