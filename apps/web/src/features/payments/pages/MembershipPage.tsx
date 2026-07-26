import { Trans, useTranslation } from 'react-i18next';
import { Alert, Breadcrumbs, MembershipSkeleton } from '@/components/ui';
import { PricingPlans } from '@/features/public/components/PricingPlans';
import { useSubscription, usePaymentHistory } from '../payments.api';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: 'text-green-600',
  FAILED: 'text-red-600',
  PENDING: 'text-amber-600',
  CREATED: 'text-gray-500',
  ABORTED: 'text-gray-500',
};

/** Subscriber-facing membership view: current status + subscribe / renew + payment history. */
export default function MembershipPage() {
  const { t } = useTranslation('common');
  const { data, isLoading } = useSubscription();
  const { data: history } = usePaymentHistory();
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

      {/* Payment History */}
      {history && history.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 font-heading text-xl font-semibold text-navy">
            {t('payments.paymentHistory', { defaultValue: 'Payment History' })}
          </h2>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 font-medium">{t('labels.date', { defaultValue: 'Date' })}</th>
                  <th className="px-4 py-3 font-medium">{t('labels.plan', { defaultValue: 'Plan' })}</th>
                  <th className="px-4 py-3 font-medium">{t('labels.amount', { defaultValue: 'Amount' })}</th>
                  <th className="px-4 py-3 font-medium">{t('labels.status', { defaultValue: 'Status' })}</th>
                  <th className="px-4 py-3 font-medium">{t('labels.transactionId', { defaultValue: 'Transaction ID' })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((entry) => (
                  <tr key={entry.orderRef} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3">{formatDate(entry.createdAt)}</td>
                    <td className="px-4 py-3">{entry.plan}</td>
                    <td className="px-4 py-3 font-medium">{'\u20B9'}{entry.amountInr}</td>
                    <td className={`px-4 py-3 font-medium ${STATUS_COLORS[entry.status] ?? 'text-gray-600'}`}>
                      {entry.status}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {entry.transactionId ?? '\u2014'}
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
