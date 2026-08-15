import { useMemo, useState, type ReactNode } from 'react';
import { Plus, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { ConfirmDialog } from '@/employer/components/ConfirmDialog';
import { Modal } from '@/components/ui/Modal';
import { useApplicantDetails, useApplicants, useDecideApplicant } from '@/employer/services/employer.api';
import type {
  ApplicantDecision,
  EmployerApplicant,
  EmployerApplicantDetail,
} from '@/employer/services/employer.types';
import { decisionConfirm } from '@/employer/utils/decisionConfirm';
import { getErrorMessage } from '@/lib/axios';
import { cn } from '@/lib/cn';

const MAX_COMPARE = 4;

const fieldClass =
  'h-8 w-full rounded-lg border border-slate-500 bg-white px-2.5 text-xs text-slate-800 outline-none transition focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20';

function formatInr(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function dash(value?: string | number | null) {
  if (value == null || value === '') return '—';
  return String(value);
}

function MultiLine({ lines }: { lines: string[] }) {
  if (!lines.length) return <span className="text-slate-400">—</span>;
  return (
    <ul className="space-y-1.5">
      {lines.map((line, i) => (
        <li key={i} className="text-slate-800 whitespace-pre-wrap">
          {line}
        </li>
      ))}
    </ul>
  );
}

type CompareRow =
  | { type: 'section'; label: string }
  | { type: 'metric'; label: string; render: (c: EmployerApplicantDetail) => ReactNode };

const compareRows: CompareRow[] = [
  { type: 'section', label: 'Overview' },
  { type: 'metric', label: 'Headline', render: (c) => dash(c.resumeHeadline) },
  {
    type: 'metric',
    label: 'Summary',
    render: (c) =>
      c.profileSummary ? (
        <p className="max-w-xs whitespace-pre-wrap text-slate-800">{c.profileSummary}</p>
      ) : (
        '—'
      ),
  },
  { type: 'metric', label: 'Applied for', render: (c) => dash(c.designation) },
  { type: 'metric', label: 'Job city', render: (c) => dash(c.jobCity) },
  {
    type: 'metric',
    label: 'Pipeline status',
    render: (c) => <EmployerBadge tone="neutral">{c.status}</EmployerBadge>,
  },
  { type: 'metric', label: 'Applied on', render: (c) => dash(c.appliedOn) },

  { type: 'section', label: 'Contact & personal' },
  { type: 'metric', label: 'Email', render: (c) => dash(c.email) },
  { type: 'metric', label: 'Mobile', render: (c) => dash(c.mobile) },
  { type: 'metric', label: 'Gender', render: (c) => dash(c.gender) },
  { type: 'metric', label: 'Date of birth', render: (c) => dash(c.dateOfBirth) },
  { type: 'metric', label: 'Marital status', render: (c) => dash(c.maritalStatus) },
  { type: 'metric', label: 'Address', render: (c) => dash(c.address) },
  { type: 'metric', label: 'Current city', render: (c) => dash(c.currentCity || c.city) },
  {
    type: 'metric',
    label: 'Preferred locations',
    render: (c) => dash(c.preferredLocations.join(', ')),
  },
  {
    type: 'metric',
    label: 'Ready to relocate',
    render: (c) => (c.readyToRelocate ? 'Yes' : 'No'),
  },

  { type: 'section', label: 'Career' },
  { type: 'metric', label: 'Experience', render: (c) => dash(c.experience) },
  { type: 'metric', label: 'Current company', render: (c) => dash(c.company) },
  {
    type: 'metric',
    label: 'Current designation',
    render: (c) => dash(c.currentDesignation),
  },
  { type: 'metric', label: 'Current CTC', render: (c) => formatInr(c.currentCtc) },
  { type: 'metric', label: 'Notice period', render: (c) => dash(c.notice) },
  { type: 'metric', label: 'Industry', render: (c) => dash(c.industry) },
  { type: 'metric', label: 'Department', render: (c) => dash(c.department) },
  { type: 'metric', label: 'Role category', render: (c) => dash(c.roleCategory) },
  { type: 'metric', label: 'Job role', render: (c) => dash(c.jobRole) },
  { type: 'metric', label: 'Desired job type', render: (c) => dash(c.desiredJobType) },
  {
    type: 'metric',
    label: 'Employment type',
    render: (c) => dash(c.desiredEmploymentType),
  },
  { type: 'metric', label: 'Preferred shift', render: (c) => dash(c.preferredShift) },
  { type: 'metric', label: 'Work modes', render: (c) => dash(c.preferredWorkModes) },
  { type: 'metric', label: 'Preferred salary', render: (c) => formatInr(c.preferredSalary) },
  { type: 'metric', label: 'Preferred roles', render: (c) => dash(c.preferredJobRoles) },

  { type: 'section', label: 'Skills' },
  {
    type: 'metric',
    label: 'Key skills',
    render: (c) =>
      c.skills.length ? (
        <div className="flex flex-wrap gap-1">
          {c.skills.map((s) => (
            <span key={s} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">
              {s}
            </span>
          ))}
        </div>
      ) : (
        '—'
      ),
  },
  {
    type: 'metric',
    label: 'IT skills',
    render: (c) => (
      <MultiLine
        lines={c.itSkills.map((s) => {
          const exp =
            s.expYears != null || s.expMonths != null
              ? ` · ${s.expYears ?? 0}y ${s.expMonths ?? 0}m`
              : '';
          const ver = s.version ? ` (${s.version})` : '';
          return `${s.name}${ver}${exp}`;
        })}
      />
    ),
  },

  { type: 'section', label: 'Experience history' },
  {
    type: 'metric',
    label: 'Employment',
    render: (c) => (
      <MultiLine
        lines={c.employment.map((e) => {
          const dates = `${e.from || '?'} – ${e.current ? 'Present' : e.to || '?'}`;
          const pay = e.salary != null ? ` · ${formatInr(e.salary)}` : '';
          const desc = e.description ? `\n${e.description}` : '';
          return `${e.designation || 'Role'} @ ${e.employer}\n${dates}${pay}${desc}`;
        })}
      />
    ),
  },

  { type: 'section', label: 'Education' },
  {
    type: 'metric',
    label: 'Education',
    render: (c) => (
      <MultiLine
        lines={c.education.map((ed) => {
          const title = [ed.degree, ed.course].filter(Boolean).join(' · ') || 'Education';
          const meta = [ed.institute, ed.year, ed.mode, ed.marks].filter(Boolean).join(' · ');
          return meta ? `${title}\n${meta}` : title;
        })}
      />
    ),
  },

  { type: 'section', label: 'Projects & credentials' },
  {
    type: 'metric',
    label: 'Projects',
    render: (c) => (
      <MultiLine
        lines={c.projects.map((p) => {
          const meta = [p.clientName, p.status, p.role, p.from && `${p.from} – ${p.to || 'Present'}`]
            .filter(Boolean)
            .join(' · ');
          const skills = p.skillsUsed ? `\nSkills: ${p.skillsUsed}` : '';
          return meta ? `${p.title}\n${meta}${skills}` : `${p.title}${skills}`;
        })}
      />
    ),
  },
  {
    type: 'metric',
    label: 'Certificates',
    render: (c) => (
      <MultiLine
        lines={c.certificates.map((cert) => {
          const meta = [cert.certificationId, cert.validFrom && `From ${cert.validFrom}`, cert.validTill]
            .filter(Boolean)
            .join(' · ');
          return meta ? `${cert.name}\n${meta}` : cert.name;
        })}
      />
    ),
  },
  {
    type: 'metric',
    label: 'Accomplishments',
    render: (c) => (
      <MultiLine
        lines={c.accomplishments.map((a) => {
          const meta = [a.kind, a.when].filter(Boolean).join(' · ');
          return meta ? `${a.title}\n${meta}` : a.title;
        })}
      />
    ),
  },

  { type: 'section', label: 'Resume' },
  {
    type: 'metric',
    label: 'Resume uploaded',
    render: (c) => (c.hasResume ? 'Yes' : 'No'),
  },
  { type: 'metric', label: 'Resume file', render: (c) => dash(c.resumeFileName) },
  {
    type: 'metric',
    label: 'Resume uploaded at',
    render: (c) => (c.resumeUploadedAt ? new Date(c.resumeUploadedAt).toLocaleString() : '—'),
  },
];

export function ComparePage() {
  const { data: applicantsRes, isLoading, isError, error } = useApplicants({ page: 1, pageSize: 100 });
  const applicants = useMemo(() => applicantsRes?.items ?? [], [applicantsRes?.items]);
  const decide = useDecideApplicant();
  const [selected, setSelected] = useState<number[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [draftSelected, setDraftSelected] = useState<number[]>([]);
  const [jobFilter, setJobFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{
    id: number;
    name: string;
    decision: Extract<ApplicantDecision, 'Shortlisted' | 'Rejected'>;
  } | null>(null);

  const listCandidates = useMemo(
    () => applicants.filter((a) => selected.includes(a.jobSubscriberMapId)),
    [applicants, selected],
  );

  const {
    details,
    isLoading: detailsLoading,
    isError: detailsError,
    error: detailsErr,
  } = useApplicantDetails(selected);

  const candidates = useMemo(() => {
    const byId = new Map(details.map((d) => [d.jobSubscriberMapId, d]));
    return selected.map((id) => byId.get(id)).filter((d): d is EmployerApplicantDetail => Boolean(d));
  }, [details, selected]);

  const jobOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of applicants) {
      const key = a.designation?.trim() || 'Unknown role';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([label, count]) => ({ label, count }));
  }, [applicants]);

  const filteredApplicants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicants.filter((a) => {
      const job = a.designation?.trim() || 'Unknown role';
      if (jobFilter !== 'all' && job !== jobFilter) return false;
      if (!q) return true;
      return (
        a.fullName.toLowerCase().includes(q) ||
        a.city.toLowerCase().includes(q) ||
        a.company.toLowerCase().includes(q) ||
        (a.email ?? '').toLowerCase().includes(q) ||
        job.toLowerCase().includes(q)
      );
    });
  }, [applicants, jobFilter, search]);

  const openPicker = () => {
    setDraftSelected(selected);
    setJobFilter('all');
    setSearch('');
    setPickerOpen(true);
  };

  const toggleDraft = (id: number) => {
    setDraftSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  const confirmPicker = () => {
    setSelected(draftSelected);
    setPickerOpen(false);
  };

  const removeSelected = (id: number) => {
    setSelected((prev) => prev.filter((x) => x !== id));
  };

  const decideOne = async () => {
    if (!confirm) return;
    const { id, decision } = confirm;
    setActionError(null);
    setBusyId(id);
    try {
      await decide.mutateAsync({ jobSubscriberMapId: id, decision });
      setConfirm(null);
    } catch (err) {
      setActionError(getErrorMessage(err, `Failed to ${decision.toLowerCase()} candidate`));
      setConfirm(null);
    } finally {
      setBusyId(null);
    }
  };

  const atMax = draftSelected.length >= MAX_COMPARE;
  const colSpan = Math.max(candidates.length, 1) + 1;

  return (
    <div>
      <PageHeader
        title="Compare Candidates"
        subtitle="Add up to 4 candidates and compare full profiles side by side."
      />

      {isError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(error, 'Failed to load applicants')}
        </p>
      )}
      {detailsError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {getErrorMessage(detailsErr, 'Failed to load full candidate profiles')}
        </p>
      )}
      {actionError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p>
      )}

      <section className="mb-3 rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold text-slate-800">
            Select candidates
            <span className="ml-1.5 font-normal text-slate-400">
              ({selected.length}/{MAX_COMPARE})
            </span>
          </h3>
          <SecondaryButton type="button" onClick={openPicker} disabled={isLoading || !applicants.length}>
            <Plus className="h-3.5 w-3.5" />
            Add candidate
          </SecondaryButton>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-400">Loading…</p>
        ) : !applicants.length ? (
          <EmptyState title="No applicants" description="Candidates appear here after they apply to your jobs." />
        ) : selected.length ? (
          <div className="flex flex-wrap gap-1.5">
            {listCandidates.map((a) => (
              <span
                key={a.jobSubscriberMapId}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#1A56DB]/30 bg-[#EBF2FF] py-1 pl-2.5 pr-1 text-xs text-[#1A56DB]"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{a.fullName || 'Candidate'}</span>
                  <span className="block truncate text-[10px] opacity-80">{a.designation}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${a.fullName}`}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-[#1A56DB] hover:bg-white/80"
                  onClick={() => removeSelected(a.jobSubscriberMapId)}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Click Add candidate to pick up to {MAX_COMPARE} people to compare.</p>
        )}
      </section>

      {selected.length ? (
        detailsLoading && !candidates.length ? (
          <EmptyState title="Loading profiles…" description="Fetching full candidate details for comparison." />
        ) : candidates.length ? (
          <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
            <div className="thin-scroll max-h-[75vh] overflow-auto">
              <table className="min-w-full text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur">
                  <tr>
                    <th className="min-w-[9rem] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Field
                    </th>
                    {candidates.map((c) => (
                      <th key={c.jobSubscriberMapId} className="min-w-[12rem] px-3 py-2 align-top">
                        <p className="font-semibold text-slate-800">{c.fullName}</p>
                        <p className="text-[11px] font-normal text-slate-400">
                          {c.resumeHeadline || c.designation || c.currentDesignation || '—'}
                        </p>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {compareRows.map((row) =>
                    row.type === 'section' ? (
                      <tr key={`section-${row.label}`} className="bg-slate-50/80">
                        <td
                          colSpan={colSpan}
                          className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-600"
                        >
                          {row.label}
                        </td>
                      </tr>
                    ) : (
                      <tr key={row.label}>
                        <td className="px-3 py-2 align-top font-medium text-slate-500">{row.label}</td>
                        {candidates.map((c) => (
                          <td key={c.jobSubscriberMapId} className="px-3 py-2 align-top text-slate-800">
                            {row.render(c)}
                          </td>
                        ))}
                      </tr>
                    ),
                  )}
                  <tr>
                    <td className="px-3 py-2.5 font-medium text-slate-500">Actions</td>
                    {candidates.map((c) => {
                      const id = c.jobSubscriberMapId;
                      const busy = busyId === id || decide.isPending;
                      return (
                        <td key={id} className="px-3 py-2.5 align-top">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={busy || c.status === 'Shortlisted'}
                              onClick={() =>
                                setConfirm({ id, name: c.fullName, decision: 'Shortlisted' })
                              }
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-[#1A56DB] bg-[#1A56DB] px-2.5 text-[11px] font-medium text-white transition hover:bg-[#1648b8] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ThumbsUp className="h-3 w-3" />
                              Shortlist
                            </button>
                            <button
                              type="button"
                              disabled={busy || c.status === 'Rejected'}
                              onClick={() => setConfirm({ id, name: c.fullName, decision: 'Rejected' })}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 text-[11px] font-medium text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <ThumbsDown className="h-3 w-3" />
                              Reject
                            </button>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState title="Could not load profiles" description="Try removing and re-adding candidates." />
        )
      ) : (
        <EmptyState title="Select candidates" description={`Pick up to ${MAX_COMPARE} applicants to compare.`} />
      )}

      <Modal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Add candidates"
        className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden"
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <p className="mb-2 shrink-0 text-xs text-slate-500">
            Filter by job, then select up to {MAX_COMPARE} candidates with checkboxes.
            <span className="ml-1 font-medium text-slate-700">
              ({draftSelected.length}/{MAX_COMPARE} selected)
            </span>
          </p>

          <div className="mb-2 flex shrink-0 flex-col gap-2 sm:flex-row">
            <select
              className={cn(fieldClass, 'sm:max-w-[14rem]')}
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              aria-label="Filter by job"
            >
              <option value="all">All jobs ({applicants.length})</option>
              {jobOptions.map((j) => (
                <option key={j.label} value={j.label}>
                  {j.label} ({j.count})
                </option>
              ))}
            </select>
            <input
              className={fieldClass}
              placeholder="Search name, city, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="thin-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-lg border border-slate-200">
            {filteredApplicants.length ? (
              <ul className="divide-y divide-slate-100">
                {filteredApplicants.map((a: EmployerApplicant) => {
                  const id = a.jobSubscriberMapId;
                  const checked = draftSelected.includes(id);
                  const disabled = !checked && atMax;
                  return (
                    <li key={id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition',
                          checked ? 'bg-[#EBF2FF]/60' : 'hover:bg-slate-50',
                          disabled && 'cursor-not-allowed opacity-50',
                        )}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#1A56DB] focus:ring-[#1A56DB]/30"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleDraft(id)}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium text-slate-800">
                            {a.fullName || 'Candidate'}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-slate-500">
                            {a.designation || '—'}
                            {a.city ? ` · ${a.city}` : ''}
                            {a.experience ? ` · ${a.experience}` : ''}
                          </span>
                          <span className="mt-0.5 block text-[10px] text-slate-400">
                            {a.status}
                            {a.company ? ` · ${a.company}` : ''}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="px-3 py-6 text-center text-xs text-slate-400">No candidates match this filter.</p>
            )}
          </div>

          {atMax && (
            <p className="mt-2 shrink-0 text-[11px] text-amber-700">
              Maximum {MAX_COMPARE} candidates. Uncheck one to select another.
            </p>
          )}

          <div className="mt-3 flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-3">
            <SecondaryButton type="button" onClick={() => setPickerOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="button" onClick={confirmPicker}>
              Add selected ({draftSelected.length})
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm != null}
        title={confirm ? decisionConfirm(confirm.decision, confirm.name).title : ''}
        description={confirm ? decisionConfirm(confirm.decision, confirm.name).description : undefined}
        confirmLabel={confirm ? decisionConfirm(confirm.decision, confirm.name).confirmLabel : 'Confirm'}
        tone={confirm ? decisionConfirm(confirm.decision, confirm.name).tone : 'primary'}
        loading={busyId != null && decide.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void decideOne()}
      />
    </div>
  );
}
