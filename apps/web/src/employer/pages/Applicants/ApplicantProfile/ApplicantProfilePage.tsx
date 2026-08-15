import { useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Award,
  Briefcase,
  CalendarClock,
  Download,
  FileText,
  FolderKanban,
  GraduationCap,
  MapPin,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
} from 'lucide-react';
import {
  EmployerBadge,
  EmptyState,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { ConfirmDialog } from '@/employer/components/ConfirmDialog';
import { employerPaths } from '@/employer/constants/paths';
import {
  downloadApplicantResume,
  useApplicant,
  useApplicantNotes,
  useApplicantResumeBlob,
  useDecideApplicant,
  useSaveApplicantNote,
} from '@/employer/services/employer.api';
import type { ApplicantDecision, ApplicantPipelineStatus } from '@/employer/services/employer.types';
import { decisionConfirm } from '@/employer/utils/decisionConfirm';
import { getErrorMessage } from '@/lib/axios';

function statusTone(status: ApplicantPipelineStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'Hired') return 'success';
  if (status === 'Shortlisted') return 'primary';
  if (status === 'Interview') return 'warning';
  if (status === 'Rejected') return 'danger';
  return 'neutral';
}

function formatInr(amount: number | null | undefined) {
  if (amount == null || Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const text = value == null || value === '' ? '—' : String(value);
  return (
    <div>
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-800">{text}</dd>
    </div>
  );
}

export function ApplicantProfilePage() {
  const { id } = useParams();
  const mapId = id && /^\d+$/.test(id) ? Number(id) : null;
  const { data: applicant, isLoading, isError, error } = useApplicant(mapId);
  const { data: notesData } = useApplicantNotes(mapId);
  const resumeQuery = useApplicantResumeBlob(mapId, Boolean(applicant?.hasResume));
  const decide = useDecideApplicant();
  const saveNote = useSaveApplicantNote(mapId ?? 0);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<ApplicantDecision | null>(null);

  useEffect(() => {
    const url = resumeQuery.data?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [resumeQuery.data?.url]);

  const runDecide = async () => {
    if (!mapId || !pendingDecision) return;
    setActionError(null);
    try {
      await decide.mutateAsync({ jobSubscriberMapId: mapId, decision: pendingDecision });
      setPendingDecision(null);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update status'));
      setPendingDecision(null);
    }
  };

  const submitNote = async () => {
    if (!mapId || !note.trim()) return;
    setActionError(null);
    try {
      await saveNote.mutateAsync(note.trim());
      setNote('');
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to save note'));
    }
  };

  const onDownloadResume = async () => {
    if (!mapId) return;
    setDownloading(true);
    setActionError(null);
    try {
      await downloadApplicantResume(mapId, applicant?.resumeFileName);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to download resume'));
    } finally {
      setDownloading(false);
    }
  };

  if (!mapId) {
    return <EmptyState title="Invalid applicant" description="Missing application id." />;
  }

  if (isLoading) {
    return <EmptyState title="Loading…" description="Fetching applicant profile." />;
  }

  if (isError || !applicant) {
    return (
      <EmptyState
        title="Applicant not found"
        description={getErrorMessage(error, 'This application may have been removed or you do not have access.')}
        action={
          <Link to={employerPaths.applicants}>
            <SecondaryButton>Back to applicants</SecondaryButton>
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <PageHeader
        title={applicant.fullName || 'Applicant'}
        subtitle={[
          applicant.resumeHeadline || applicant.designation || applicant.currentDesignation,
          applicant.experience || null,
          applicant.company || null,
        ]
          .filter(Boolean)
          .join(' · ')}
        actions={
          <>
            <EmployerBadge tone={statusTone(applicant.status)}>{applicant.status}</EmployerBadge>
            <SecondaryButton disabled={decide.isPending} onClick={() => setPendingDecision('Shortlisted')}>
              <ThumbsUp className="h-4 w-4" />
              Shortlist
            </SecondaryButton>
            <SecondaryButton disabled={decide.isPending} onClick={() => setPendingDecision('Interview')}>
              <CalendarClock className="h-4 w-4" />
              Interview
            </SecondaryButton>
            <PrimaryButton disabled={decide.isPending} onClick={() => setPendingDecision('Hired')}>
              <UserCheck className="h-4 w-4" />
              Hire
            </PrimaryButton>
            <SecondaryButton disabled={decide.isPending} onClick={() => setPendingDecision('Rejected')}>
              <ThumbsDown className="h-4 w-4" />
              Reject
            </SecondaryButton>
            {applicant.hasResume ? (
              <SecondaryButton disabled={downloading} onClick={() => void onDownloadResume()}>
                <Download className="h-4 w-4" />
                {downloading ? 'Downloading…' : 'Download CV'}
              </SecondaryButton>
            ) : null}
          </>
        }
      />

      {actionError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          {applicant.profileSummary ? (
            <Section title="Profile summary">
              <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">{applicant.profileSummary}</p>
            </Section>
          ) : null}

          <Section title="Contact & personal">
            <dl className="grid gap-2 sm:grid-cols-2 text-xs">
              <Field label="Email" value={applicant.email} />
              <Field label="Mobile" value={applicant.mobile} />
              <Field label="Gender" value={applicant.gender} />
              <Field label="Date of birth" value={applicant.dateOfBirth} />
              <Field label="Marital status" value={applicant.maritalStatus} />
              <Field label="Address" value={applicant.address} />
              <Field label="Current city" value={applicant.currentCity || applicant.city} />
              <Field label="Preferred locations" value={applicant.preferredLocations.join(', ')} />
              <Field label="Ready to relocate" value={applicant.readyToRelocate ? 'Yes' : 'No'} />
              <Field label="Applied on" value={applicant.appliedOn} />
            </dl>
          </Section>

          <Section title="Career overview">
            <dl className="grid gap-2 sm:grid-cols-2 text-xs">
              <Field label="Applied for" value={applicant.designation} />
              <Field label="Job location" value={applicant.jobCity} />
              <Field label="Current role" value={applicant.currentDesignation} />
              <Field label="Current company" value={applicant.company} />
              <Field label="Experience" value={applicant.experience} />
              <Field label="Current CTC" value={formatInr(applicant.currentCtc)} />
              <Field label="Notice period" value={applicant.notice} />
              <Field label="Industry" value={applicant.industry} />
              <Field label="Department" value={applicant.department} />
              <Field label="Role category" value={applicant.roleCategory} />
              <Field label="Job role" value={applicant.jobRole} />
              <Field label="Desired job type" value={applicant.desiredJobType} />
              <Field label="Employment type" value={applicant.desiredEmploymentType} />
              <Field label="Preferred shift" value={applicant.preferredShift} />
              <Field label="Work modes" value={applicant.preferredWorkModes} />
              <Field label="Preferred salary" value={formatInr(applicant.preferredSalary)} />
              <Field label="Preferred roles" value={applicant.preferredJobRoles} />
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Skills</dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {applicant.skills.length ? (
                    applicant.skills.map((s) => (
                      <span key={s} className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700">
                        {s}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-800">—</span>
                  )}
                </dd>
              </div>
            </dl>
          </Section>

          <Section title="Experience" icon={<Briefcase className="h-3.5 w-3.5" />}>
            {applicant.employment.length ? (
              <ul className="space-y-2">
                {applicant.employment.map((e, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">
                      {e.designation || 'Role'} · {e.employer}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {e.from || '?'} — {e.current ? 'Present' : e.to || '?'}
                      {e.salary != null ? ` · ${formatInr(e.salary)}` : ''}
                    </p>
                    {e.description ? (
                      <p className="mt-1 text-[11px] text-slate-600 whitespace-pre-wrap">{e.description}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No employment history on file.</p>
            )}
          </Section>

          <Section title="Education" icon={<GraduationCap className="h-3.5 w-3.5" />}>
            {applicant.education.length ? (
              <ul className="space-y-2">
                {applicant.education.map((ed, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">
                      {[ed.degree, ed.course].filter(Boolean).join(' · ') || 'Education'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {[ed.institute, ed.year, ed.mode, ed.marks].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No education records on file.</p>
            )}
          </Section>

          {applicant.itSkills.length ? (
            <Section title="IT skills">
              <ul className="space-y-2">
                {applicant.itSkills.map((s, i) => (
                  <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">
                      {s.name}
                      {s.version ? ` (${s.version})` : ''}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {[
                        s.expYears != null || s.expMonths != null
                          ? `${s.expYears ?? 0}y ${s.expMonths ?? 0}m`
                          : null,
                        s.lastUsedYear ? `Last used ${s.lastUsedYear}` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {applicant.projects.length ? (
            <Section title="Projects" icon={<FolderKanban className="h-3.5 w-3.5" />}>
              <ul className="space-y-2">
                {applicant.projects.map((p, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">{p.title}</p>
                    <p className="text-[11px] text-slate-400">
                      {[p.clientName, p.status, p.from && `${p.from} – ${p.to || 'Present'}`, p.role]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {p.skillsUsed ? <p className="mt-0.5 text-[11px] text-slate-600">Skills: {p.skillsUsed}</p> : null}
                    {p.details ? <p className="mt-1 text-[11px] text-slate-600 whitespace-pre-wrap">{p.details}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {applicant.certificates.length ? (
            <Section title="Certificates" icon={<Award className="h-3.5 w-3.5" />}>
              <ul className="space-y-2">
                {applicant.certificates.map((c, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">
                      {c.url ? (
                        <a href={c.url} target="_blank" rel="noreferrer" className="text-[#1A56DB] hover:underline">
                          {c.name}
                        </a>
                      ) : (
                        c.name
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {[c.certificationId, c.validFrom && `From ${c.validFrom}`, c.validTill && `Till ${c.validTill}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {applicant.accomplishments.length ? (
            <Section title="Accomplishments">
              <ul className="space-y-2">
                {applicant.accomplishments.map((a, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-[#1A56DB] hover:underline">
                          {a.title}
                        </a>
                      ) : (
                        a.title
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {[a.kind, a.when].filter(Boolean).join(' · ')}
                    </p>
                    {a.description ? <p className="mt-1 text-[11px] text-slate-600">{a.description}</p> : null}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          <Section title="Resume" icon={<FileText className="h-3.5 w-3.5" />}>
            {!applicant.hasResume ? (
              <p className="text-xs text-slate-400">No resume uploaded for this candidate.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-slate-800">{applicant.resumeFileName || 'Resume.pdf'}</p>
                    {applicant.resumeUploadedAt ? (
                      <p className="text-[11px] text-slate-400">
                        Uploaded {new Date(applicant.resumeUploadedAt).toLocaleString()}
                      </p>
                    ) : null}
                  </div>
                  <SecondaryButton disabled={downloading} onClick={() => void onDownloadResume()}>
                    <Download className="h-4 w-4" />
                    Download
                  </SecondaryButton>
                </div>
                {resumeQuery.isLoading ? (
                  <p className="text-xs text-slate-400">Loading resume preview…</p>
                ) : resumeQuery.isError ? (
                  <p className="text-xs text-rose-600">Could not load resume preview. Try downloading instead.</p>
                ) : resumeQuery.data?.isPdf && resumeQuery.data.url ? (
                  <iframe
                    title="Resume preview"
                    src={resumeQuery.data.url}
                    className="h-[70vh] w-full rounded-lg border border-slate-200 bg-slate-50"
                  />
                ) : (
                  <p className="rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-500">
                    Preview is available for PDF resumes. Use Download to open this file.
                  </p>
                )}
              </div>
            )}
          </Section>
        </section>

        <aside className="space-y-3">
          <Section title="Location" icon={<MapPin className="h-3.5 w-3.5" />}>
            <dl className="grid gap-2 text-xs">
              <Field label="City" value={applicant.city} />
              <Field label="Job city" value={applicant.jobCity} />
              <Field label="Preferred" value={applicant.preferredLocations.join(', ') || '—'} />
            </dl>
          </Section>

          <Section title="Timeline">
            {applicant.timeline.length ? (
              <ul className="space-y-2">
                {applicant.timeline.map((t, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">{t.status || 'Update'}</p>
                    <p className="text-[11px] text-slate-400">{t.at ? new Date(t.at).toLocaleString() : ''}</p>
                    {t.comments ? <p className="mt-0.5 text-[11px] text-slate-600">{t.comments}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No status history yet.</p>
            )}
          </Section>

          <Section title="Notes" icon={<StickyNote className="h-3.5 w-3.5" />}>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add an internal note…"
              className="mb-2 w-full rounded-lg border border-slate-500 px-2.5 py-1.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
            />
            <PrimaryButton disabled={saveNote.isPending || !note.trim()} onClick={() => void submitNote()}>
              Save note
            </PrimaryButton>
            <ul className="mt-3 space-y-2">
              {(notesData?.notes ?? []).map((n) => (
                <li key={n.noteId} className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{n.note}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{new Date(n.createdAt).toLocaleString()}</p>
                </li>
              ))}
              {!notesData?.notes?.length && <p className="text-xs text-slate-400">No notes yet.</p>}
            </ul>
          </Section>
        </aside>
      </div>

      <ConfirmDialog
        open={pendingDecision != null}
        title={pendingDecision ? decisionConfirm(pendingDecision, applicant.fullName).title : ''}
        description={
          pendingDecision ? decisionConfirm(pendingDecision, applicant.fullName).description : undefined
        }
        confirmLabel={
          pendingDecision ? decisionConfirm(pendingDecision, applicant.fullName).confirmLabel : 'Confirm'
        }
        tone={pendingDecision ? decisionConfirm(pendingDecision, applicant.fullName).tone : 'primary'}
        loading={decide.isPending}
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => void runDecide()}
      />
    </div>
  );
}
