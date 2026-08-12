import { useMemo, useState } from 'react';
import { ThumbsUp, UserCheck } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { useApplicants, useBulkDecideApplicants } from '@/employer/services/employer.api';
import { getErrorMessage } from '@/lib/axios';

const metrics = [
  { key: 'experience', label: 'Experience' },
  { key: 'skills', label: 'Skills' },
  { key: 'notice', label: 'Notice Period' },
  { key: 'company', label: 'Current Company' },
  { key: 'city', label: 'City' },
  { key: 'status', label: 'Pipeline Status' },
] as const;

export function ComparePage() {
  const { data: applicants = [], isLoading, isError, error } = useApplicants();
  const bulk = useBulkDecideApplicants();
  const [selected, setSelected] = useState<number[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);

  const candidates = useMemo(
    () => applicants.filter((a) => selected.includes(a.jobSubscriberMapId)),
    [applicants, selected],
  );

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id],
    );
  };

  const runBulk = async (decision: 'Shortlisted' | 'Hired') => {
    if (!selected.length) return;
    setActionError(null);
    try {
      await bulk.mutateAsync({ ids: selected, decision });
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update selected candidates'));
    }
  };

  const cell = (id: (typeof metrics)[number]['key'], row: (typeof candidates)[number]) => {
    if (id === 'skills') return row.skills.join(', ') || '—';
    if (id === 'status') return <EmployerBadge tone="neutral">{row.status}</EmployerBadge>;
    return (row[id] as string) || '—';
  };

  return (
    <div>
      <PageHeader
        title="Compare Candidates"
        subtitle="Select up to 4 candidates and compare side by side."
        actions={
          <>
            <SecondaryButton disabled={!selected.length || bulk.isPending} onClick={() => void runBulk('Shortlisted')}>
              <ThumbsUp className="h-4 w-4" />
              Shortlist Selected
            </SecondaryButton>
            <PrimaryButton disabled={!selected.length || bulk.isPending} onClick={() => void runBulk('Hired')}>
              <UserCheck className="h-4 w-4" />
              Hire Selected
            </PrimaryButton>
          </>
        }
      />

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load applicants')}
        </p>
      )}
      {actionError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p>
      )}

      <section className="mb-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold text-slate-800">Select candidates</h3>
        {isLoading ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : applicants.length ? (
          <div className="flex flex-wrap gap-1.5">
            {applicants.map((a) => {
              const on = selected.includes(a.jobSubscriberMapId);
              return (
                <button
                  key={a.jobSubscriberMapId}
                  type="button"
                  onClick={() => toggle(a.jobSubscriberMapId)}
                  className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                    on
                      ? 'border-[#1A56DB] bg-[#EBF2FF] text-[#1A56DB]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-medium">{a.fullName || 'Candidate'}</span>
                  <span className="mt-0.5 block text-[11px] opacity-80">{a.designation}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No applicants" description="Candidates appear here after they apply to your jobs." />
        )}
      </section>

      {candidates.length ? (
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/80">
                <tr>
                  <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Metric
                  </th>
                  {candidates.map((c) => (
                    <th key={c.jobSubscriberMapId} className="px-3 py-2">
                      <p className="font-semibold text-slate-800">{c.fullName}</p>
                      <p className="text-[11px] font-normal text-slate-400">{c.designation}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.map((m) => (
                  <tr key={m.key}>
                    <td className="px-3 py-2 font-medium text-slate-500">{m.label}</td>
                    {candidates.map((c) => (
                      <td key={c.jobSubscriberMapId} className="px-3 py-2 text-slate-800">
                        {cell(m.key, c)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <EmptyState title="Select candidates" description="Pick up to 4 applicants above to compare." />
      )}
    </div>
  );
}
