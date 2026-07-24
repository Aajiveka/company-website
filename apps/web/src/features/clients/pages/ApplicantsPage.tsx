import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck, Check, StickyNote, X } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Button, statusTone, Table, useToast, type Column } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useApplicants, useBulkDecideApplicants, useDecideApplicant, type ApplicantRow } from '../client.api';
import { ApplicantNotesModal } from '../components/ApplicantNotesModal';
import { ScheduleInterviewModal } from '../components/ScheduleInterviewModal';

/** Client — applicants for the company's jobs, with bulk actions. */
export default function ApplicantsPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading } = useApplicants();
  const decide = useDecideApplicant();
  const bulkDecide = useBulkDecideApplicants();
  const { notify } = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [interviewTarget, setInterviewTarget] = useState<{ id: number; name: string } | null>(null);
  const [notesTarget, setNotesTarget] = useState<{ id: number; name: string } | null>(null);

  const actionableRows = (data ?? []).filter((r) => r.jobStatus === 'Applied' || r.jobStatus === 'Mapped');
  const allSelected = actionableRows.length > 0 && actionableRows.every((r) => selected.has(r.jobSubscriberMapId));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(actionableRows.map((r) => r.jobSubscriberMapId)));
    }
  };

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const act = (jobSubscriberMapId: number, decision: 'Shortlisted' | 'Rejected') =>
    decide.mutate(
      { jobSubscriberMapId, decision },
      {
        onSuccess: () => {
          notify(decision === 'Shortlisted' ? t('applicants.shortlisted') : t('applicants.rejected'), decision === 'Shortlisted' ? 'success' : 'info');
          setSelected((prev) => { const next = new Set(prev); next.delete(jobSubscriberMapId); return next; });
        },
        onError: (e) =>
          notify(isAxiosError(e) ? e.response?.data?.message ?? t('applicants.somethingWrong') : t('applicants.somethingWrong'), 'error'),
      },
    );

  const bulkAct = (decision: 'Shortlisted' | 'Rejected') => {
    const ids = [...selected];
    if (!ids.length) return;
    bulkDecide.mutate(
      { ids, decision },
      {
        onSuccess: () => {
          notify(t('bulk.bulkSuccess', { count: ids.length }), 'success');
          setSelected(new Set());
        },
        onError: () => notify(t('bulk.bulkFailed'), 'error'),
      },
    );
  };

  const columns: Column<ApplicantRow>[] = [
    {
      key: 'select',
      header: '',
      className: 'w-10',
      render: (r) =>
        r.jobStatus === 'Applied' || r.jobStatus === 'Mapped' ? (
          <input
            type="checkbox"
            checked={selected.has(r.jobSubscriberMapId)}
            onChange={() => toggleOne(r.jobSubscriberMapId)}
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            aria-label={`Select ${r.fullName}`}
          />
        ) : null,
    },
    {
      key: 'fullName',
      header: t('common:labels.candidate'),
      render: (r) => (
        <Link to={`/recruitment/candidates/${r.subscriberId}`} className="font-medium text-primary hover:underline">
          {r.fullName}
        </Link>
      ),
    },
    { key: 'designation', header: t('common:labels.designation') },
    { key: 'city', header: t('common:labels.location') },
    { key: 'experience', header: t('common:labels.experience') },
    { key: 'appliedOn', header: t('candidates.applied') },
    { key: 'jobStatus', header: t('common:labels.status'), render: (r) => <Badge tone={statusTone(r.jobStatus)}>{r.jobStatus}</Badge> },
    {
      key: 'actions',
      header: t('common:labels.actions'),
      render: (r) => (
        <div className="flex gap-2">
          {(r.jobStatus === 'Applied' || r.jobStatus === 'Mapped') && (
            <>
              <button
                onClick={() => act(r.jobSubscriberMapId, 'Shortlisted')}
                className="inline-flex items-center gap-1 rounded-lg bg-green-50 dark:bg-green-900/20 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400 hover:bg-green-100"
              >
                <Check className="h-3.5 w-3.5" /> {t('applicants.shortlist')}
              </button>
              <button
                onClick={() => act(r.jobSubscriberMapId, 'Rejected')}
                className="inline-flex items-center gap-1 rounded-lg bg-red-50 dark:bg-red-900/20 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100"
              >
                <X className="h-3.5 w-3.5" /> {t('applicants.reject')}
              </button>
            </>
          )}
          {r.jobStatus === 'Shortlisted' && (
            <button
              onClick={() => setInterviewTarget({ id: r.jobSubscriberMapId, name: r.fullName })}
              className="inline-flex items-center gap-1 rounded-lg bg-purple-50 dark:bg-purple-900/20 px-2.5 py-1 text-xs font-medium text-purple-700 dark:text-purple-400 hover:bg-purple-100"
            >
              <CalendarCheck className="h-3.5 w-3.5" /> {t('interview.schedule')}
            </button>
          )}
          <button
            onClick={() => setNotesTarget({ id: r.jobSubscriberMapId, name: r.fullName })}
            className="inline-flex items-center gap-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100"
          >
            <StickyNote className="h-3.5 w-3.5" /> {t('notes.button')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/company/profile' }, { label: t('applicants.heading') }]} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">{t('applicants.heading')}</h1>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-navy">{t('bulk.selected', { count: selected.size })}</span>
            <Button
              size="sm"
              onClick={() => bulkAct('Shortlisted')}
              disabled={bulkDecide.isPending}
            >
              <Check className="mr-1 h-3.5 w-3.5" /> {t('bulk.bulkShortlist')}
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => bulkAct('Rejected')}
              disabled={bulkDecide.isPending}
            >
              <X className="mr-1 h-3.5 w-3.5" /> {t('bulk.bulkReject')}
            </Button>
          </div>
        )}
      </div>

      {/* Select all toggle */}
      {actionableRows.length > 0 && (
        <div className="mb-2">
          <label className={cn('flex items-center gap-2 text-sm', selected.size > 0 ? 'text-primary font-medium' : 'text-gray-500')}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            />
            {t('bulk.selectAll')}
          </label>
        </div>
      )}

      <Table columns={columns} data={data ?? []} rowKey={(r) => r.jobSubscriberMapId} isLoading={isLoading} emptyMessage={t('applicants.noApplicants')} />

      {interviewTarget && (
        <ScheduleInterviewModal
          open
          onClose={() => setInterviewTarget(null)}
          jobSubscriberMapId={interviewTarget.id}
          candidateName={interviewTarget.name}
        />
      )}

      {notesTarget && (
        <ApplicantNotesModal
          open
          onClose={() => setNotesTarget(null)}
          jobSubscriberMapId={notesTarget.id}
          candidateName={notesTarget.name}
        />
      )}
    </div>
  );
}
