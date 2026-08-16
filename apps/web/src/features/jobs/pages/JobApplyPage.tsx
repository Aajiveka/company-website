import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { ArrowLeft, Check, FileText, Sparkles, Upload } from 'lucide-react';
import { useToast } from '@/components/ui';
import { useCandidateProfile, useCvEditProfile, useUploadResume } from '@/features/candidates/candidate.api';
import {
  Btn,
  Card,
  CardBody,
  ErrorState,
  Input,
  SkeletonRows,
  Textarea,
} from '@/features/candidates/portal/components/primitives';
import { longDate } from '@/features/candidates/portal/format';
import { useApplyToJob, useJob } from '../jobs.api';
import type { ApplyFormValues } from '../jobs.types';

type Stage = 'form' | 'review' | 'done';

const REQUIRED: (keyof ApplyFormValues)[] = ['fullName', 'email', 'phone'];

/**
 * Apply flow — Figma nodes 28:4658 (empty), 28:4794 (pre-filled), 28:4935 (review) and
 * 28:5072 (submitted).
 *
 * Three stages on one route rather than three routes: the form is unsaved state, so landing
 * on /review directly could only ever show an empty summary. Back and Cancel step through the
 * stages, and the job itself stays one navigation away.
 */
export default function JobApplyPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { notify } = useToast();

  const { data: job, isLoading: jobLoading, isError: jobError, refetch } = useJob(id);
  const { data: profile } = useCandidateProfile();
  const { data: cv, isLoading: cvLoading } = useCvEditProfile();
  const apply = useApplyToJob(id);
  const uploadResume = useUploadResume();

  const [stage, setStage] = useState<Stage>('form');
  const [values, setValues] = useState<ApplyFormValues | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof ApplyFormValues, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);

  // Pre-fill once the profile lands. Guarded on `values` so a later refetch cannot overwrite
  // edits the candidate has already made on this screen — which is also why it has to wait
  // for the CV: seeding on the profile alone locks in blank expected salary, notice period
  // and LinkedIn whenever /candidates/me answers before /candidates/me/cv-edit, and the
  // guard then stops the CV from ever filling them in.
  useEffect(() => {
    if (values || !profile || cvLoading) return;
    setValues({
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      phone: profile.mobile ?? '',
      totalExperience: profile.totalExperience ?? '',
      currentLocation: profile.city ?? '',
      expectedSalary: cv?.careerProfile?.preferredSalary ? String(cv.careerProfile.preferredSalary) : '',
      noticePeriod: cv?.professional?.noticePeriod != null ? `${cv.professional.noticePeriod} Days` : '',
      linkedInUrl: cv?.accomplishments?.find((a) => a.kind === 'ONLINE_PROFILE')?.url ?? '',
      portfolioUrl: '',
      coverLetter: '',
    });
  }, [profile, cv, cvLoading, values]);

  const prefilled = useMemo(
    () => !!profile && !!(profile.fullName || profile.email || profile.mobile),
    [profile],
  );

  if (jobError) {
    return (
      <Card>
        <ErrorState message="We could not load this job." onRetry={refetch} />
      </Card>
    );
  }

  if (jobLoading || !job || !values) {
    return (
      <Card>
        <CardBody>
          <SkeletonRows rows={5} />
        </CardBody>
      </Card>
    );
  }

  const set = <K extends keyof ApplyFormValues>(key: K, value: ApplyFormValues[K]) =>
    setValues((v) => (v ? { ...v, [key]: value } : v));

  const validate = () => {
    const next: Partial<Record<keyof ApplyFormValues, string>> = {};
    for (const key of REQUIRED) if (!values[key]?.trim()) next[key] = 'This field is required.';
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) next.email = 'Enter a valid email address.';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onReview = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validate()) return;
    setStage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onSubmit = () => {
    setSubmitError(null);
    apply.mutate(
      { ...values, resumeFileName: profile?.resumeFileName ?? undefined },
      {
        onSuccess: (res) => {
          setReference(res.reference);
          setStage('done');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        onError: (err) =>
          setSubmitError(
            isAxiosError(err) && err.response?.status === 400
              ? 'You have already applied to this job.'
              : 'We could not submit your application. Please try again.',
          ),
      },
    );
  };

  const onResumePick = (file: File | undefined) => {
    if (!file) return;
    uploadResume.mutate(
      { file },
      {
        onSuccess: () => notify('Resume updated.', 'success'),
        onError: () => notify('Could not upload that resume.', 'error'),
      },
    );
  };

  if (stage === 'done') {
    return <Submitted job={job} reference={reference} />;
  }

  if (stage === 'review') {
    return (
      <Review
        job={job}
        values={values}
        resumeFileName={profile?.resumeFileName ?? null}
        onEdit={() => setStage('form')}
        onSubmit={onSubmit}
        submitting={apply.isPending}
        error={submitError}
      />
    );
  }

  return (
    <>
      <Link
        to={`/jobs/${id}`}
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-aj-blue"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to job details
      </Link>

      <h1 className="mt-3 font-display text-3xl font-bold text-slate-800 dark:text-gray-100">
        Apply — {job.designation}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {[job.company, job.city, job.workMode].filter(Boolean).join(' · ')}
      </p>

      {prefilled && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-blue-50 px-4 py-3.5 text-sm text-aj-blue dark:bg-blue-950">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          We&apos;ve pre-filled details from your profile. Review and edit anything before continuing.
        </div>
      )}

      <form onSubmit={onReview} noValidate>
        <Card className="mt-4">
          <CardBody className="sm:p-6">
            <div className="grid gap-5 sm:grid-cols-2">
              <ApplyField id="apply-fullName" label="Full name" required error={errors.fullName}>
                <Input
                  id="apply-fullName"
                  value={values.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                  placeholder="Your name"
                  invalid={!!errors.fullName}
                />
              </ApplyField>

              <ApplyField id="apply-email" label="Email" required error={errors.email}>
                <Input
                  id="apply-email"
                  type="email"
                  value={values.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="you@email.com"
                  invalid={!!errors.email}
                />
              </ApplyField>

              <ApplyField id="apply-phone" label="Phone number" required error={errors.phone}>
                <Input
                  id="apply-phone"
                  value={values.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+91 1234567890"
                  invalid={!!errors.phone}
                />
              </ApplyField>

              <ApplyField id="apply-totalExperience" label="Total experience">
                <Input
                  id="apply-totalExperience"
                  value={values.totalExperience}
                  onChange={(e) => set('totalExperience', e.target.value)}
                  placeholder="e.g. 5 years"
                />
              </ApplyField>

              <ApplyField id="apply-currentLocation" label="Current location">
                <Input
                  id="apply-currentLocation"
                  value={values.currentLocation}
                  onChange={(e) => set('currentLocation', e.target.value)}
                  placeholder="e.g. Bengaluru"
                />
              </ApplyField>

              <ApplyField id="apply-expectedSalary" label="Expected salary">
                <Input
                  id="apply-expectedSalary"
                  value={values.expectedSalary}
                  onChange={(e) => set('expectedSalary', e.target.value)}
                  placeholder="e.g. ₹20 LPA"
                />
              </ApplyField>

              <ApplyField id="apply-linkedInUrl" label="LinkedIn profile">
                <Input
                  id="apply-linkedInUrl"
                  value={values.linkedInUrl}
                  onChange={(e) => set('linkedInUrl', e.target.value)}
                  placeholder="linkedin.com/in/…"
                />
              </ApplyField>

              <ApplyField id="apply-portfolioUrl" label="Portfolio URL">
                <Input
                  id="apply-portfolioUrl"
                  value={values.portfolioUrl}
                  onChange={(e) => set('portfolioUrl', e.target.value)}
                  placeholder="yoursite.com"
                />
              </ApplyField>

              <ApplyField id="apply-noticePeriod" label="Notice period">
                <Input
                  id="apply-noticePeriod"
                  value={values.noticePeriod}
                  onChange={(e) => set('noticePeriod', e.target.value)}
                  placeholder="e.g. 30 Days"
                />
              </ApplyField>
            </div>

            <div className="mt-5">
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">Resume / CV</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-aj-line bg-aj-surface-soft px-3.5 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900">
                  <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                  <span className={profile?.resumeFileName ? 'truncate text-slate-700 dark:text-gray-200' : 'text-slate-400'}>
                    {profile?.resumeFileName ?? 'No file selected'}
                  </span>
                </div>
                <label className="shrink-0">
                  <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-aj-blue px-4 py-2.5 text-sm font-semibold text-aj-blue transition-colors hover:bg-blue-50 dark:hover:bg-blue-950">
                    <Upload className="size-4" aria-hidden />
                    {uploadResume.isPending ? 'Uploading…' : profile?.resumeFileName ? 'Replace' : 'Upload'}
                  </span>
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      onResumePick(file);
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="mt-5">
              <FieldLabel htmlFor="apply-coverLetter">Cover letter / additional information</FieldLabel>
              <Textarea
                id="apply-coverLetter"
                rows={5}
                value={values.coverLetter}
                onChange={(e) => set('coverLetter', e.target.value)}
                placeholder="Tell the recruiter why you're a great fit (optional)…"
              />
            </div>
          </CardBody>
        </Card>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <Btn variant="secondary" onClick={() => navigate(`/jobs/${id}`)}>
            Cancel
          </Btn>
          <Btn type="submit">Review application</Btn>
        </div>
      </form>
    </>
  );
}

/**
 * A real <label for>, not a styled span: without it the inputs have no accessible name, so a
 * screen reader announces ten unlabelled text boxes and nothing can be found by label.
 */
function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-slate-500"
    >
      {children}
      {required && <span className="text-red-600"> *</span>}
    </label>
  );
}

function ApplyField({
  id,
  label,
  required,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <FieldLabel htmlFor={id} required={required}>
        {label}
      </FieldLabel>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

/* --------------------------------- Review --------------------------------- */

function Review({
  job,
  values,
  resumeFileName,
  onEdit,
  onSubmit,
  submitting,
  error,
}: {
  job: { designation: string; company: string };
  values: ApplyFormValues;
  resumeFileName: string | null;
  onEdit: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const rows: [string, string][] = [
    ['Full name', values.fullName],
    ['Email', values.email],
    ['Phone', values.phone],
    ['Total experience', values.totalExperience],
    ['Current location', values.currentLocation],
    ['Expected salary', values.expectedSalary],
    ['Notice period', values.noticePeriod],
    ['LinkedIn', values.linkedInUrl],
    ['Portfolio', values.portfolioUrl],
    ['Resume', resumeFileName ?? ''],
  ];

  return (
    <>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 transition-colors hover:text-aj-blue"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to form
      </button>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-800 dark:text-gray-100">Review your application</h1>
          <p className="mt-1 text-sm text-slate-500">
            {job.designation} · {job.company}
          </p>
        </div>
        <Btn variant="secondary" onClick={onEdit}>
          Edit
        </Btn>
      </div>

      <Card className="mt-4">
        <CardBody className="sm:p-6">
          <dl className="grid gap-5 sm:grid-cols-2">
            {rows
              .filter(([, v]) => v?.trim())
              .map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[13px] text-slate-400">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm text-slate-800 dark:text-gray-100">{value}</dd>
                </div>
              ))}
          </dl>

          {values.coverLetter.trim() && (
            <div className="mt-5 border-t border-aj-line-soft pt-5 dark:border-gray-700">
              <dt className="text-[13px] text-slate-400">Cover letter</dt>
              <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-slate-800 dark:text-gray-100">
                {values.coverLetter}
              </dd>
            </div>
          )}
        </CardBody>
      </Card>

      <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Btn variant="secondary" onClick={onEdit}>
          Edit
        </Btn>
        <Btn onClick={onSubmit} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit application'}
        </Btn>
      </div>
    </>
  );
}

/* -------------------------------- Submitted -------------------------------- */

function Submitted({
  job,
  reference,
}: {
  job: { designation: string; company: string };
  reference: string | null;
}) {
  return (
    <div className="mx-auto max-w-xl py-6 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50">
        <Check className="size-8 text-emerald-600" aria-hidden />
      </div>

      <h1 className="mt-5 font-display text-3xl font-bold text-slate-800 dark:text-gray-100">
        Application submitted successfully
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Your application for <strong className="text-slate-700 dark:text-gray-200">{job.designation}</strong> at{' '}
        <strong className="text-slate-700 dark:text-gray-200">{job.company}</strong> has been sent to the recruiter.
      </p>

      <Card className="mt-6 text-left">
        <CardBody className="sm:p-6">
          <dl className="grid grid-cols-2 gap-5">
            <div>
              <dt className="text-[13px] text-slate-400">Reference ID</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-800 dark:text-gray-100">{reference ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-slate-400">Applied on</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-800 dark:text-gray-100">
                {longDate(new Date().toISOString())}
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-slate-400">Role</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-800 dark:text-gray-100">{job.designation}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-slate-400">Company</dt>
              <dd className="mt-0.5 text-sm font-bold text-slate-800 dark:text-gray-100">{job.company}</dd>
            </div>
          </dl>

          <div className="mt-5 border-t border-aj-line-soft pt-5 dark:border-gray-700">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">What happens next</p>
            <ul className="mt-3 space-y-2">
              {[
                'The recruiter reviews your application.',
                "You'll get updates in Applications and Notifications.",
                "If shortlisted, you'll be invited to interview.",
              ].map((line) => (
                <li key={line} className="flex gap-2.5 text-sm text-slate-700 dark:text-gray-300">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-aj-blue" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          to="/candidate/applications"
          className="rounded-lg bg-aj-blue px-5 py-2.5 text-sm font-semibold text-white shadow-aj-raised transition-colors hover:bg-aj-blue-hover"
        >
          View My Applications
        </Link>
        <Link
          to="/jobs"
          className="rounded-lg border border-aj-line bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:border-aj-blue hover:text-aj-blue dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
        >
          Browse More Jobs
        </Link>
      </div>
    </div>
  );
}
