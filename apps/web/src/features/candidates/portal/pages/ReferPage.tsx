import { useState } from 'react';
import { Check, Copy, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useReferrals, useCreateReferral, type ReferralRow } from '../portal.api';
import { ModuleHeader } from '../components/ModuleFrame';
import {
  Btn,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  ErrorState,
  Field,
  InitialAvatar,
  Input,
  Pill,
  SkeletonRows,
  StatTile,
  type Tone,
} from '../components/primitives';
import { avatarTone, longDate } from '../format';

const STATUS_TONE: Record<string, Tone> = {
  Invited: 'slate',
  'Signed Up': 'blue',
  Applied: 'violet',
  Rewarded: 'green',
};

const rupees = (value: number) => `₹${value.toLocaleString('en-IN')}`;

/** Refer a Friend — Figma node 7:6053. */
export default function ReferPage() {
  const { data, isLoading, isError, refetch } = useReferrals();
  const create = useCreateReferral();
  const { notify } = useToast();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const link = data ? `${window.location.origin}/register?ref=${data.code}` : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('Could not copy the link. Select and copy it manually.', 'error');
    }
  };

  const invite = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    create.mutate(
      { name: name.trim(), email: email.trim() },
      {
        onSuccess: (res) => {
          notify(
            res.duplicate ? `${name.trim()} has already been invited.` : `Invite sent to ${name.trim()}.`,
            res.duplicate ? 'info' : 'success',
          );
          setName('');
          setEmail('');
        },
        onError: () => notify('Could not send that invite. Please try again.', 'error'),
      },
    );
  };

  if (isError) {
    return (
      <>
        <ModuleHeader title="Refer a Friend" />
        <Card>
          <ErrorState message="We could not load your referrals." onRetry={refetch} />
        </Card>
      </>
    );
  }

  if (isLoading || !data) {
    return (
      <>
        <ModuleHeader title="Refer a Friend" />
        <Card>
          <CardBody>
            <SkeletonRows rows={3} />
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <ModuleHeader title="Refer a Friend" />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile value={data.totalInvited} label="Total Invited" tone="blue" />
        <StatTile value={data.successfulSignups} label="Successful Signups" tone="violet" />
        <StatTile value={rupees(data.earnedRupees)} label="Rewards Earned" tone="green" />
      </div>

      <Card>
        <CardHeader title="Your Referral Link" />
        <CardBody>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={link}
              aria-label="Your referral link"
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-lg border border-aj-line bg-aj-canvas px-3.5 py-2.5 text-sm text-slate-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            />
            <Btn variant="secondary" onClick={copyLink}>
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? 'Copied' : 'Copy'}
            </Btn>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`mailto:?subject=${encodeURIComponent('Join me on Aajiveka')}&body=${encodeURIComponent(
                `I'm using Aajiveka to find my next role — sign up here: ${link}`,
              )}`}
              className="inline-flex items-center gap-2 rounded-lg border border-aj-line px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-aj-blue hover:text-aj-blue dark:border-gray-700 dark:text-gray-300"
            >
              <Mail className="size-4" aria-hidden />
              Invite via Email
            </a>
            <a
              href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                `I'm using Aajiveka to find my next role — sign up here: ${link}`,
              )}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-aj-line px-4 py-2.5 text-sm font-semibold text-slate-600 transition-colors hover:border-emerald-500 hover:text-emerald-600 dark:border-gray-700 dark:text-gray-300"
            >
              <MessageCircle className="size-4" aria-hidden />
              Invite via WhatsApp
            </a>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Invite by email" />
        <CardBody>
          <form onSubmit={invite} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Name" htmlFor="referName">
              <Input
                id="referName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Priya Mehta"
                required
              />
            </Field>
            <Field label="Email" htmlFor="referEmail">
              <Input
                id="referEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="priya.m@email.com"
                required
              />
            </Field>
            <Btn type="submit" disabled={create.isPending || !name.trim() || !email.trim()}>
              {create.isPending ? 'Sending…' : 'Send invite'}
            </Btn>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Referred Friends"
          action={
            data.pendingRupees > 0 ? (
              <span className="text-xs text-slate-500">{rupees(data.pendingRupees)} pending</span>
            ) : undefined
          }
        />
        {data.referrals.length ? (
          <CardBody className="space-y-2">
            {data.referrals.map((row) => (
              <ReferralItem key={row.referralId} row={row} />
            ))}
          </CardBody>
        ) : (
          <EmptyState
            title="No referrals yet"
            description="Share your link or send an invite — you earn a reward when someone you refer signs up and applies."
          />
        )}
      </Card>
    </>
  );
}

function ReferralItem({ row }: { row: ReferralRow }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-aj-line-soft px-3.5 py-3 dark:border-gray-700">
      <InitialAvatar text={row.name} size="sm" letters={2} className={avatarTone(row.name)} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">{row.name}</p>
        <p className="truncate text-xs text-slate-500">{row.email ?? row.mobile ?? '—'}</p>
      </div>
      <div className="hidden text-xs text-slate-400 sm:block">{longDate(row.invitedAt)}</div>
      <Pill tone={STATUS_TONE[row.status] ?? 'slate'}>{row.status}</Pill>
      <div className="w-24 shrink-0 text-right text-xs font-semibold text-slate-600 dark:text-gray-300">
        {row.rewardRupees > 0 ? `${rupees(row.rewardRupees)} ${row.rewardPaid ? 'earned' : 'pending'}` : '—'}
      </div>
    </div>
  );
}
