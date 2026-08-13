import { Link, useParams } from 'react-router-dom';
import {
  Award,
  Briefcase,
  CheckCircle2,
  Download,
  GraduationCap,
  MessageSquare,
  StickyNote,
  ThumbsDown,
  ThumbsUp,
  UserCheck,
} from 'lucide-react';
import {
  EmployerBadge,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import { mockApplicants } from '@/employer/constants/mockData';
import { employerPaths } from '@/employer/constants/paths';

export function ApplicantProfilePage() {
  const { id } = useParams();
  const applicant =
    mockApplicants.find((a) => String(a.id) === String(id)) ?? mockApplicants[0];

  return (
    <div>
      <PageHeader
        title={applicant.name}
        subtitle={`${applicant.role} · ${applicant.experience} · ${applicant.company}`}
        actions={
          <>
            <EmployerBadge tone="primary">Score {applicant.score}%</EmployerBadge>
            <SecondaryButton>
              <ThumbsUp className="h-4 w-4" />
              Shortlist
            </SecondaryButton>
            <SecondaryButton>
              <ThumbsDown className="h-4 w-4" />
              Reject
            </SecondaryButton>
            <PrimaryButton>
              <UserCheck className="h-4 w-4" />
              Hire
            </PrimaryButton>
            <Link to={employerPaths.messages}>
              <SecondaryButton>
                <MessageSquare className="h-4 w-4" />
                Message
              </SecondaryButton>
            </Link>
            <SecondaryButton>
              <Download className="h-4 w-4" />
              Download
            </SecondaryButton>
          </>
        }
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Briefcase className="h-3.5 w-3.5 text-[#1A56DB]" />
              Resume Summary
            </h2>
            <p className="text-xs leading-relaxed text-slate-600">
              {applicant.name} is a {applicant.experience} professional specializing in{' '}
              {applicant.skills.join(', ')}. Currently at {applicant.company} with a notice period of{' '}
              {applicant.notice}. Resume match score against the role is {applicant.score}%.
            </p>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Briefcase className="h-3.5 w-3.5 text-[#1A56DB]" />
              Experience
            </h2>
            <ul className="space-y-2">
              <li className="border-l-2 border-[#1A56DB] pl-2.5">
                <p className="text-xs font-medium text-slate-800">{applicant.role}</p>
                <p className="text-[11px] text-slate-500">
                  {applicant.company} · 2022 – Present
                </p>
                <p className="mt-0.5 text-xs text-slate-600">Led feature delivery and mentoring for junior engineers.</p>
              </li>
              <li className="border-l-2 border-slate-200 pl-2.5">
                <p className="text-xs font-medium text-slate-800">Associate Engineer</p>
                <p className="text-[11px] text-slate-500">Previous Employer · 2019 – 2022</p>
                <p className="mt-0.5 text-xs text-slate-600">Built customer-facing modules and improved release cycle.</p>
              </li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <GraduationCap className="h-3.5 w-3.5 text-[#1A56DB]" />
              Education
            </h2>
            <p className="text-xs font-medium text-slate-800">B.Tech Computer Science</p>
            <p className="text-[11px] text-slate-500">VTU · 2015 – 2019 · CGPA 8.2</p>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold text-slate-800">Projects</h2>
            <ul className="space-y-1.5 text-xs text-slate-600">
              <li className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <span className="font-medium text-slate-800">Hiring Portal Revamp</span> — React + NestJS ATS modules
              </li>
              <li className="rounded-lg bg-slate-50 px-2.5 py-1.5">
                <span className="font-medium text-slate-800">Analytics Dashboard</span> — Funnel charts & export pipeline
              </li>
            </ul>
          </section>
        </div>

        <div className="space-y-3">
          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold text-slate-800">Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {applicant.skills.map((s) => (
                <span key={s} className="rounded-md bg-[#EBF2FF] px-2 py-0.5 text-[11px] font-medium text-[#1A56DB]">
                  {s}
                </span>
              ))}
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">Communication</span>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <Award className="h-3.5 w-3.5 text-[#1A56DB]" />
              Certificates
            </h2>
            <ul className="space-y-1 text-xs text-slate-600">
              <li>AWS Cloud Practitioner</li>
              <li>Scrum Foundation</li>
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold text-slate-800">Timeline</h2>
            <ul className="space-y-2">
              {[
                { t: 'Applied', d: '2 days ago', icon: CheckCircle2 },
                { t: 'Resume screened', d: 'Yesterday', icon: CheckCircle2 },
                { t: 'Awaiting interview', d: 'Today', icon: CheckCircle2 },
              ].map((item) => (
                <li key={item.t} className="flex items-start gap-1.5">
                  <item.icon className="mt-0.5 h-3.5 w-3.5 text-[#1A56DB]" />
                  <div>
                    <p className="text-xs font-medium text-slate-800">{item.t}</p>
                    <p className="text-[11px] text-slate-400">{item.d}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
            <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
              <StickyNote className="h-3.5 w-3.5 text-[#1A56DB]" />
              Notes
            </h2>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs outline-none focus:border-[#1A56DB] focus:ring-2 focus:ring-[#1A56DB]/20"
              rows={3}
              placeholder="Add internal notes…"
              defaultValue="Strong culture fit. Prefer video first round."
            />
            <PrimaryButton className="mt-2 w-full">Save Note</PrimaryButton>
          </section>
        </div>
      </div>
    </div>
  );
}
