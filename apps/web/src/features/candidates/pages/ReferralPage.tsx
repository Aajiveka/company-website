import { useState } from 'react';
import { Copy, Gift, Share2, Users } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Button, Card, CardSkeleton, Input, useToast } from '@/components/ui';
import { api } from '@/lib/axios';

interface Referral {
  referralId: number;
  referredName: string;
  referredMobile: string;
  status: 'Pending' | 'Registered' | 'Hired';
  createdAt: string;
}

interface ReferralSummary {
  referralCode: string;
  totalReferred: number;
  totalRegistered: number;
  totalHired: number;
  referrals: Referral[];
}

export default function ReferralPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['candidate', 'referrals'],
    queryFn: () => api.get<ReferralSummary>('/candidates/me/referrals').then((r) => r.data),
  });

  const refer = useMutation({
    mutationFn: (payload: { name: string; mobile: string }) =>
      api.post('/candidates/me/referrals', payload).then((r) => r.data),
    onSuccess: () => {
      notify(t('referral.sent'), 'success');
      setName('');
      setMobile('');
      refetch();
    },
    onError: () => notify(t('referral.sendFailed'), 'error'),
  });

  const onCopyCode = () => {
    if (data?.referralCode) {
      navigator.clipboard.writeText(data.referralCode);
      notify(t('referral.codeCopied'), 'success');
    }
  };

  const shareUrl = data?.referralCode ? `${window.location.origin}/register?ref=${data.referralCode}` : '';

  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Aajiveka', text: t('referral.shareText'), url: shareUrl });
      } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      notify(t('referral.linkCopied'), 'success');
    }
  };

  const statusTone = (s: string) => s === 'Hired' ? 'green' as const : s === 'Registered' ? 'blue' as const : 'gray' as const;

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('referral.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('referral.heading')}</h1>

      {isLoading ? (
        <div className="space-y-4"><CardSkeleton /><CardSkeleton /></div>
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="text-center">
              <p className="text-2xl font-bold text-primary">{data?.totalReferred ?? 0}</p>
              <p className="text-xs text-gray-500">{t('referral.referred')}</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-blue-600">{data?.totalRegistered ?? 0}</p>
              <p className="text-xs text-gray-500">{t('referral.registered')}</p>
            </Card>
            <Card className="text-center">
              <p className="text-2xl font-bold text-green-600">{data?.totalHired ?? 0}</p>
              <p className="text-xs text-gray-500">{t('referral.hired')}</p>
            </Card>
          </div>

          {/* Referral code */}
          {data?.referralCode && (
            <Card>
              <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-navy">{t('referral.yourCode')}</p>
                  <p className="mt-1 font-mono text-xl font-bold tracking-widest text-primary">{data.referralCode}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={onCopyCode}>
                    <Copy className="mr-1 h-4 w-4" /> {t('referral.copy')}
                  </Button>
                  <Button size="sm" onClick={onShare}>
                    <Share2 className="mr-1 h-4 w-4" /> {t('referral.share')}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Refer a friend form */}
          <Card>
            <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
              <Gift className="h-5 w-5 text-primary" /> {t('referral.referAFriend')}
            </h3>
            <form
              onSubmit={(e) => { e.preventDefault(); refer.mutate({ name, mobile }); }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Input placeholder={t('referral.friendName')} value={name} onChange={(e) => setName(e.target.value)} required className="flex-1" />
              <Input placeholder={t('referral.friendMobile')} value={mobile} onChange={(e) => setMobile(e.target.value)} required inputMode="numeric" className="flex-1" />
              <Button type="submit" isLoading={refer.isPending}>{t('referral.sendInvite')}</Button>
            </form>
          </Card>

          {/* Referral history */}
          {(data?.referrals?.length ?? 0) > 0 && (
            <Card>
              <h3 className="mb-3 flex items-center gap-2 text-base font-semibold text-navy">
                <Users className="h-5 w-5 text-primary" /> {t('referral.history')}
              </h3>
              <div className="space-y-2">
                {data!.referrals.map((r) => (
                  <div key={r.referralId} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-700">
                    <div>
                      <p className="text-sm font-medium text-navy">{r.referredName}</p>
                      <p className="text-xs text-gray-500">{r.referredMobile} · {new Date(r.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
