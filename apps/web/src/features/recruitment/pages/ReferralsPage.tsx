import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone, Breadcrumbs, Table, type Column } from '@/components/ui';
import { useReferrals } from '../recruitment.api';
import type { ReferralRow } from '../recruitment.types';

const referralTone = (s: string): BadgeTone => {
  const map: Record<string, BadgeTone> = {
    Referred: 'amber',
    SentToCompany: 'green',
    Expired: 'red',
  };
  return map[s] ?? 'gray';
};

/** Q2 referral tracking — shows CVs referred to Q3 and their status. */
export default function ReferralsPage() {
  const { t } = useTranslation('common');
  const { data: referrals = [], isLoading } = useReferrals();

  const columns = useMemo<Column<ReferralRow>[]>(
    () => [
      { key: 'candidate', header: t('labels.candidate') },
      { key: 'designation', header: t('labels.designation') },
      { key: 'company', header: t('labels.company') },
      {
        key: 'status',
        header: t('labels.status'),
        render: (r) => <Badge tone={referralTone(r.status)}>{r.status}</Badge>,
      },
      {
        key: 'referredAt',
        header: t('recruitment.q3.referredAt'),
        render: (r) => new Date(r.referredAt).toLocaleDateString('en-IN'),
      },
      {
        key: 'sentToCompanyAt',
        header: t('recruitment.q3.sentToCompany'),
        render: (r) => (r.sentToCompanyAt ? new Date(r.sentToCompanyAt).toLocaleDateString('en-IN') : '—'),
      },
      {
        key: 'expiresAt',
        header: t('recruitment.q3.expiresAt'),
        render: (r) => (r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('en-IN') : '—'),
      },
    ],
    [t],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('recruitment'), to: '/recruitment/candidates' }, { label: t('sidebar.referrals') }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">{t('sidebar.referrals')}</h1>

      <Table
        columns={columns}
        data={referrals}
        rowKey={(r) => r.referralId}
        isLoading={isLoading}
        emptyMessage={t('recruitment.q3.noReferrals')}
      />
    </div>
  );
}
