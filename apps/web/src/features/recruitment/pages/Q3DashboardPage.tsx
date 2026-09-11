import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, type BadgeTone, Breadcrumbs, Button, Card, CardHeader, CardTitle, Modal, Table, type Column, useToast } from '@/components/ui';
import { useReferrals, useForwardToCompany } from '../recruitment.api';
import { InterviewRoundsPanel } from '../components/InterviewRoundsPanel';
import type { ReferralRow } from '../recruitment.types';

const referralTone = (s: string): BadgeTone => {
  const map: Record<string, BadgeTone> = {
    Referred: 'amber',
    SentToCompany: 'green',
    Expired: 'red',
  };
  return map[s] ?? 'gray';
};

/** Q3 Dashboard — manage CV referrals and forward to companies. */
export default function Q3DashboardPage() {
  const { t } = useTranslation('common');
  const { notify } = useToast();
  const { data: referrals = [], isLoading } = useReferrals();
  const forward = useForwardToCompany();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  /** The referral whose interview rounds are open, or null. */
  const [roundsFor, setRoundsFor] = useState<ReferralRow | null>(null);

  const pending = referrals.filter((r) => r.status === 'Referred');
  const sent = referrals.filter((r) => r.status === 'SentToCompany');

  const toggleSelect = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleForward = () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    forward.mutate(ids, {
      onSuccess: (data: { forwarded: number }) => {
        notify(t('recruitment.q3.forwarded', { count: data.forwarded }), 'success');
        setSelected(new Set());
      },
      onError: () => notify(t('errors.generic'), 'error'),
    });
  };

  const columns = useMemo<Column<ReferralRow>[]>(
    () => [
      {
        key: 'select' as keyof ReferralRow,
        header: '',
        render: (r) =>
          r.status === 'Referred' ? (
            <input
              type="checkbox"
              checked={selected.has(r.referralId)}
              onChange={() => toggleSelect(r.referralId)}
            />
          ) : null,
      },
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
        key: 'expiresAt',
        header: t('recruitment.q3.expiresAt'),
        render: (r) => (r.expiresAt ? new Date(r.expiresAt).toLocaleDateString('en-IN') : '—'),
      },
      {
        // Q3 owns the interview rounds for a referred candidate — create/result are
        // @Roles(Q3, Client, Admin) — and until now nothing anywhere opened them.
        key: 'rounds' as keyof ReferralRow,
        header: t('labels.actions'),
        render: (r) => (
          <Button variant="outline" size="sm" onClick={() => setRoundsFor(r)}>
            {t('recruitment.rounds.title')}
          </Button>
        ),
      },
    ],
    [t, selected],
  );

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('recruitment.q3.title') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('recruitment.q3.title')}</h1>

      {/* Stats */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>{t('recruitment.q3.pendingReview')}</CardTitle></CardHeader>
          <p className="px-4 pb-4 text-3xl font-bold text-teal-600">{pending.length}</p>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('recruitment.q3.sentToCompany')}</CardTitle></CardHeader>
          <p className="px-4 pb-4 text-3xl font-bold text-blue-600">{sent.length}</p>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t('labels.total')}</CardTitle></CardHeader>
          <p className="px-4 pb-4 text-3xl font-bold text-gray-700">{referrals.length}</p>
        </Card>
      </div>

      {/* Actions */}
      {selected.size > 0 && (
        <div className="mb-4">
          <Button onClick={handleForward} disabled={forward.isPending}>
            {t('recruitment.q3.forwardSelected', { count: selected.size })}
          </Button>
        </div>
      )}

      <Table
        columns={columns}
        data={referrals}
        rowKey={(r) => r.referralId}
        isLoading={isLoading}
        emptyMessage={t('recruitment.q3.noReferrals')}
      />

      <Modal
        open={!!roundsFor}
        onClose={() => setRoundsFor(null)}
        title={roundsFor ? `${t('recruitment.rounds.title')} — ${roundsFor.candidate}` : ''}
        className="max-w-2xl"
      >
        {roundsFor && <InterviewRoundsPanel mapId={roundsFor.jobSubscriberMapId} />}
      </Modal>
    </div>
  );
}
