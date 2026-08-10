import { useMemo, useState } from 'react';
import { Download, ThumbsUp, UserCheck } from 'lucide-react';
import {
  EmployerBadge,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { mockApplicants } from '@/employer/constants/mockData';

const metrics = [
  { key: 'score', label: 'Resume Score' },
  { key: 'experience', label: 'Experience' },
  { key: 'skills', label: 'Skills Match' },
  { key: 'notice', label: 'Notice Period' },
  { key: 'company', label: 'Current Company' },
  { key: 'status', label: 'Pipeline Status' },
] as const;

export function ComparePage() {
  const [selected, setSelected] = useState<number[]>([1, 2, 3]);

  const candidates = useMemo(
    () => mockApplicants.filter((a) => selected.includes(a.id)),
    [selected],
  );

  const toggle = (id: number) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 4 ? prev : [...prev, id],
    );
  };

  return (
    <div>
      <PageHeader
        title="Compare Candidates"
        subtitle="Select up to 4 candidates and compare side by side."
        actions={
          <>
            <SecondaryButton>
              <Download className="h-4 w-4" />
              Export
            </SecondaryButton>
            <SecondaryButton>
              <ThumbsUp className="h-4 w-4" />
              Shortlist Selected
            </SecondaryButton>
            <PrimaryButton>
              <UserCheck className="h-4 w-4" />
              Hire Top Match
            </PrimaryButton>
          </>
        }
      />

      <section className="mb-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <h3 className="mb-2 text-xs font-semibold text-slate-800">Select candidates</h3>
        <div className="flex flex-wrap gap-1.5">
          {mockApplicants.map((a) => {
            const on = selected.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => toggle(a.id)}
                className={`rounded-lg border px-2.5 py-1.5 text-left text-xs transition ${
                  on
                    ? 'border-[#1A56DB] bg-[#EBF2FF] text-[#1A56DB]'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="font-medium">{a.name}</span>
                <span className="mt-0.5 block text-[11px] opacity-80">{a.role}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-slate-100 bg-slate-50/80">
              <tr>
                <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Metric
                </th>
                {candidates.map((c) => (
                  <th key={c.id} className="px-3 py-2">
                    <p className="font-semibold text-slate-800">{c.name}</p>
                    <p className="text-[11px] font-normal text-slate-400">{c.role}</p>
                    <span className="mt-0.5 inline-block rounded-md bg-[#EBF2FF] px-1.5 py-0.5 text-[11px] font-semibold text-[#1A56DB]">
                      {c.score}%
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metrics.map((m) => (
                <tr key={m.key} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {m.label}
                  </td>
                  {candidates.map((c) => {
                    const value =
                      m.key === 'skills'
                        ? c.skills.join(', ')
                        : String(c[m.key as keyof typeof c]);
                    return (
                      <td key={c.id} className="px-3 py-2 text-slate-700">
                        {m.key === 'status' ? (
                          <EmployerBadge tone="primary">{value}</EmployerBadge>
                        ) : m.key === 'score' ? (
                          <span className="font-semibold text-[#1A56DB]">{value}%</span>
                        ) : (
                          value
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="px-3 py-2 text-[11px] font-semibold uppercase text-slate-500">Actions</td>
                {candidates.map((c) => (
                  <td key={c.id} className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      <PrimaryButton className="!px-2 !py-1 text-xs">
                        <UserCheck className="h-3.5 w-3.5" />
                        Hire
                      </PrimaryButton>
                      <SecondaryButton className="!px-2 !py-1 text-xs">
                        <ThumbsUp className="h-3.5 w-3.5" />
                        Shortlist
                      </SecondaryButton>
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
