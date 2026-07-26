import { Trans, useTranslation } from 'react-i18next';
import { Alert, Breadcrumbs, MembershipSkeleton } from '@/components/ui';
import { PricingPlans } from '@/features/public/components/PricingPlans';
import { useSubscription } from '../payments.api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

/** Subscriber-facing membership view: current status + subscribe / renew. */
export default function MembershipPage() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useSubscription();
  const active = data && data.active ? data : null;

  return (
    <div>
      <Breadcrumbs items={[{ label: t('dashboard'), to: '/candidate/profile' }, { label: t('payments.membership') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('payments.membership')}</h1>

      {isLoading ? (
        <MembershipSkeleton />
      ) : active ? (
        <Alert variant="success">
          <Trans i18nKey="payments.activeMembership" t={t} values={{ plan: active.plan, date: formatDate(active.endsAt) }} components={{ strong: <strong /> }} />
        </Alert>
      ) : (
        <Alert variant="info">{t('payments.noMembership')}</Alert>
      )}

      <h2 className="mt-8 text-center font-heading text-xl font-semibold text-navy">
        {active ? t('actions.renewOrUpgrade') : t('actions.choosePlan')}
      </h2>
      <PricingPlans />
    </div>
  );
}
