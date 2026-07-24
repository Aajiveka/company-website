import { useMemo } from 'react';
import { Check, X, UserCircle2 } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useApplicants, useDecideApplicant, type ApplicantRow } from '../client.api';

const STAGES = ['Applied', 'Shortlisted', 'Interview', 'Selected', 'Rejected'] as const;

const STAGE_COLORS: Record<string, string> = {
  Applied: 'border-t-blue-500',
  Shortlisted: 'border-t-amber-500',
  Interview: 'border-t-purple-500',
  Selected: 'border-t-green-500',
  Rejected: 'border-t-red-500',
};

const STAGE_BG: Record<string, string> = {
  Applied: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  Shortlisted: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  Interview: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
  Selected: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  Rejected: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
};

function normalizeStatus(status: string): string {
  if (status === 'Mapped') return 'Applied';
  if (status.startsWith('Interview')) return 'Interview';
  return status;
}

function ApplicantCard({ applicant, onAction }: {
  applicant: ApplicantRow;
  onAction: (id: number, decision: 'Shortlisted' | 'Rejected') => void;
}) {
  const stage = normalizeStatus(applicant.jobStatus);
  const canShortlist = stage === 'Applied';
  const canReject = stage === 'Applied' || stage === 'Shortlisted';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-600 dark:bg-gray-800">
      <Link to={`/recruitment/candidates/${applicant.subscriberId}`} className="flex items-center gap-2">
        <UserCircle2 className="h-8 w-8 shrink-0 text-gray-300" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy hover:text-primary">{applicant.fullName}</p>
          <p className="truncate text-xs text-gray-500">{applicant.designation}</p>
        </div>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-gray-400">
        <span>{applicant.city}</span>
        <span>·</span>
        <span>{applicant.experience}</span>
      </div>
      {(canShortlist || canReject) && (
        <div className="mt-2 flex gap-1.5 border-t border-gray-100 pt-2 dark:border-gray-700">
          {canShortlist && (
            <button
              onClick={() => onAction(applicant.jobSubscriberMapId, 'Shortlisted')}
              className="flex items-center gap-1 rounded bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400"
            >
              <Check className="h-3 w-3" /> Shortlist
            </button>
          )}
          {canReject && (
            <button
              onClick={() => onAction(applicant.jobSubscriberMapId, 'Rejected')}
              className="flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
            >
              <X className="h-3 w-3" /> Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function PipelineBoardPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useApplicants();
  const decide = useDecideApplicant();
  const { notify } = useToast();

  const columns = useMemo(() => {
    const map: Record<string, ApplicantRow[]> = {};
    STAGES.forEach((s) => { map[s] = []; });
    (data ?? []).forEach((a) => {
      const stage = normalizeStatus(a.jobStatus);
      if (map[stage]) map[stage].push(a);
    });
    return map;
  }, [data]);

  const onAction = (id: number, decision: 'Shortlisted' | 'Rejected') => {
    decide.mutate(
      { jobSubscriberMapId: id, decision },
      {
        onSuccess: () => notify(decision === 'Shortlisted' ? t('applicants.shortlisted') : t('applicants.rejected'), 'success'),
        onError: (e) => notify(isAxiosError(e) ? e.response?.data?.message ?? t('applicants.somethingWrong') : t('applicants.somethingWrong'), 'error'),
      },
    );
  };

  return (
    <div className="mx-auto max-w-7xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/company/profile' }, { label: t('pipeline.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('pipeline.heading')}</h1>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {STAGES.map((s) => (
            <div key={s} className="h-64 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => (
            <div key={stage} className={cn('flex w-64 shrink-0 flex-col rounded-xl border-t-4 bg-gray-50 dark:bg-gray-800/50', STAGE_COLORS[stage])}>
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-semibold', STAGE_BG[stage])}>
                  {stage}
                </span>
                <span className="text-xs font-medium text-gray-400">{columns[stage].length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto px-2 pb-2" style={{ maxHeight: '70vh' }}>
                {columns[stage].length === 0 ? (
                  <p className="py-8 text-center text-xs text-gray-400">{t('pipeline.empty')}</p>
                ) : (
                  columns[stage].map((a) => (
                    <ApplicantCard key={a.jobSubscriberMapId} applicant={a} onAction={onAction} />
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
