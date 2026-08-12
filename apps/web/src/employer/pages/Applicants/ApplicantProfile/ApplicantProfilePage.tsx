import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Briefcase,
  CalendarClock,
  Download,
  GraduationCap,
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
import { employerPaths } from '@/employer/constants/paths';
import {
  useApplicant,
  useApplicantNotes,
  useDecideApplicant,
  useSaveApplicantNote,
} from '@/employer/services/employer.api';
import type { ApplicantPipelineStatus } from '@/employer/services/employer.types';
import { getErrorMessage } from '@/lib/axios';

function statusTone(status: ApplicantPipelineStatus): 'neutral' | 'success' | 'warning' | 'danger' | 'primary' {
  if (status === 'Hired') return 'success';
  if (status === 'Shortlisted') return 'primary';
  if (status === 'Interview') return 'warning';
  if (status === 'Rejected') return 'danger';
  return 'neutral';
}

export function ApplicantProfilePage() {
  const { id } = useParams();
  const mapId = id && /^\d+$/.test(id) ? Number(id) : null;
  const { data: applicant, isLoading, isError, error } = useApplicant(mapId);
  const { data: notesData } = useApplicantNotes(mapId);
  const decide = useDecideApplicant();
  const saveNote = useSaveApplicantNote(mapId ?? 0);
  const [note, setNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const runDecide = async (decision: 'Shortlisted' | 'Interview' | 'Hired' | 'Rejected') => {
    if (!mapId) return;
    setActionError(null);
    try {
      await decide.mutateAsync({ jobSubscriberMapId: mapId, decision });
    } catch (err) {
      setActionError(getErrorMessage(err, 'Failed to update status'));
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
        subtitle={`${applicant.designation || 'Role'} · ${applicant.experience || 'Experience n/a'} · ${applicant.company || 'Company n/a'}`}
        actions={
          <>
            <EmployerBadge tone={statusTone(applicant.status)}>{applicant.status}</EmployerBadge>
            <SecondaryButton disabled={decide.isPending} onClick={() => void runDecide('Shortlisted')}>
              <ThumbsUp className="h-4 w-4" />
              Shortlist
            </SecondaryButton>
            <SecondaryButton disabled={decide.isPending} onClick={() => void runDecide('Interview')}>
              <CalendarClock className="h-4 w-4" />
              Interview
            </SecondaryButton>
            <PrimaryButton disabled={decide.isPending} onClick={() => void runDecide('Hired')}>
              <UserCheck className="h-4 w-4" />
              Hire
            </PrimaryButton>
            <SecondaryButton disabled={decide.isPending} onClick={() => void runDecide('Rejected')}>
              <ThumbsDown className="h-4 w-4" />
              Reject
            </SecondaryButton>
            {applicant.cvPath ? (
              <a href={applicant.cvPath} target="_blank" rel="noreferrer">
                <SecondaryButton>
                  <Download className="h-4 w-4" />
                  CV
                </SecondaryButton>
              </a>
            ) : null}
          </>
        }
      />

      {actionError && (
        <p className="mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{actionError}</p>
      )}

      <div className="grid gap-3 lg:grid-cols-3">
        <section className="space-y-3 lg:col-span-2">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Contact & summary</h3>
            <dl className="grid gap-2 sm:grid-cols-2 text-xs">
              <div>
                <dt className="text-slate-500">Email</dt>
                <dd className="text-slate-800">{applicant.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Mobile</dt>
                <dd className="text-slate-800">{applicant.mobile || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">City</dt>
                <dd className="text-slate-800">{applicant.city || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Notice</dt>
                <dd className="text-slate-800">{applicant.notice || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Applied</dt>
                <dd className="text-slate-800">{applicant.appliedOn || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Skills</dt>
                <dd className="text-slate-800">{applicant.skills.length ? applicant.skills.join(', ') : '—'}</dd>
              </div>
            </dl>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Briefcase className="h-3.5 w-3.5" />
              Experience
            </h3>
            {applicant.employment.length ? (
              <ul className="space-y-2">
                {applicant.employment.map((e, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">
                      {e.designation || 'Role'} · {e.employer}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {e.from || '?'} — {e.current ? 'Present' : e.to || '?'}
                    </p>
                    {e.description ? <p className="mt-1 text-[11px] text-slate-600 whitespace-pre-wrap">{e.description}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No employment history on file.</p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <GraduationCap className="h-3.5 w-3.5" />
              Education
            </h3>
            {applicant.education.length ? (
              <ul className="space-y-2">
                {applicant.education.map((ed, i) => (
                  <li key={i} className="border-b border-slate-100 pb-2 last:border-0">
                    <p className="text-xs font-medium text-slate-800">
                      {[ed.degree, ed.course].filter(Boolean).join(' · ') || 'Education'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {[ed.institute, ed.year, ed.mode].filter(Boolean).join(' · ')}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-400">No education records on file.</p>
            )}
          </div>
        </section>

        <aside className="space-y-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h3 className="mb-2 text-xs font-semibold text-slate-800">Timeline</h3>
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
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <StickyNote className="h-3.5 w-3.5" />
              Notes
            </h3>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add an internal note…"
              className="mb-2 w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
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
          </div>
        </aside>
      </div>
    </div>
  );
}
