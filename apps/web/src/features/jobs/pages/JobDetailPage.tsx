import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  Bookmark,
  Briefcase,
  Building2,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Link2,
  Mail,
  MapPin,
  Share2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, JobDetailSkeleton, useToast } from '@/components/ui';
import { Seo, SITE_URL } from '@/components/Seo';
import { JobSchema } from '@/components/JobSchema';
import { cn } from '@/lib/cn';
import { useAuth } from '@/features/auth/auth.store';
import { useSavedJobIds, useSaveJob, useUnsaveJob } from '@/features/candidates/candidate.api';
import { Role } from '@/types/roles';
import { useApplyToJob, useJob } from '../jobs.api';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

const formatDate = (iso: string, locale?: string) =>
  new Date(iso).toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' });

/** Public — a single job listing, with an Apply CTA (job-details.aspx). */
export default function JobDetailPage() {
  const { t, i18n } = useTranslation('jobs');
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { data: job, isLoading } = useJob(id);
  const { user, isAuthenticated } = useAuth();
  const apply = useApplyToJob(id);
  const { notify } = useToast();

  const [applied, setApplied] = useState(false);

  const { data: savedIds } = useSavedJobIds();
  const saveJob = useSaveJob();
  const unsaveJob = useUnsaveJob();
  const isSaved = savedIds?.includes(Number(id)) ?? false;

  const onToggleSave = () => {
    if (!isAuthenticated) {
      navigate(`/login?next=/jobs/${id}`);
      return;
    }
    if (isSaved) {
      unsaveJob.mutate(Number(id));
    } else {
      saveJob.mutate(Number(id));
    }
  };

  const onApply = () => {
    if (!isAuthenticated) {
      navigate(`/login?next=/jobs/${id}`);
      return;
    }
    apply.mutate(undefined, {
      onSuccess: () => {
        setApplied(true);
        notify(t('detail.applicationSuccess'), 'success');
      },
      onError: (e) =>
        notify(
          isAxiosError(e) ? e.response?.data?.message ?? t('detail.applicationFailed') : t('detail.applicationFailed'),
          'error',
        ),
    });
  };

  const shareUrl = `${SITE_URL}/jobs/${id}`;
  const onShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: job?.designation, url: shareUrl });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      notify(t('detail.copied'), 'success');
    }
  };

  const expLabel = job
    ? job.minExp === 0 && !job.maxExp
      ? t('search.fresher')
      : job.maxExp
        ? t('detail.expRange', { min: job.minExp, max: job.maxExp })
        : t('detail.expMin', { min: job.minExp })
    : '';

  return (
    <section className="py-12 md:py-16">
      {job && (
        <>
          <Seo
            title={`${job.designation} at ${job.company}`}
            description={`Apply for ${job.designation} at ${job.company}. ${job.city ? `Location: ${job.city}.` : ''} Find your next career opportunity on Aajiveka.`}
            path={`/jobs/${id}`}
            ogImage={job.companyLogo || undefined}
          />
          <JobSchema job={job} path={`/jobs/${id}`} />
        </>
      )}
      <div className="container max-w-3xl">
        <Breadcrumbs items={[{ label: t('detail.breadcrumbJobs'), to: '/jobs' }, { label: t('detail.breadcrumbDetails') }]} />

        {isLoading || !job ? (
          <JobDetailSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Header card */}
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {job.companyLogo && (
                    <img
                      src={job.companyLogo}
                      alt={job.company}
                      className="hidden h-14 w-14 rounded-lg object-contain sm:block"
                    />
                  )}
                  <div>
                    <h1 className="font-heading text-2xl font-bold text-navy">{job.designation}</h1>
                    <p className="mt-1 flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                      <Building2 className="h-4 w-4 text-primary" aria-hidden /> {job.company}
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  {job.industry}
                </span>
              </div>

              {/* Key details grid */}
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                  <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{job.city}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                  <Briefcase className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{expLabel}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                  <IndianRupee className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                  <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <span>{job.workMode} · {job.employmentType}</span>
                </div>
              </div>

              {/* Posted date + share */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" aria-hidden />
                  {t('detail.postedOn', { date: formatDate(job.postedOn, i18n.language) })}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={onToggleSave}
                    className={cn(
                      'flex items-center gap-1.5 text-xs font-medium hover:underline',
                      isSaved ? 'text-primary' : 'text-gray-500',
                    )}
                    disabled={saveJob.isPending || unsaveJob.isPending}
                  >
                    <Bookmark className={cn('h-3.5 w-3.5', isSaved && 'fill-current')} aria-hidden />
                    {isSaved ? t('detail.saved') : t('detail.saveJob')}
                  </button>
                  <button
                    onClick={onShare}
                    className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Share2 className="h-3.5 w-3.5" aria-hidden />
                    {t('detail.shareJob')}
                  </button>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`${job.designation} at ${job.company} — ${shareUrl}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-green-600 hover:underline"
                    aria-label="Share on WhatsApp"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </a>
                  <a
                    href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-medium text-[#0077B5] hover:underline"
                    aria-label="Share on LinkedIn"
                  >
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    LinkedIn
                  </a>
                  <a
                    href={`mailto:?subject=${encodeURIComponent(`Job: ${job.designation} at ${job.company}`)}&body=${encodeURIComponent(`Check out this job: ${job.designation} at ${job.company}\n\n${shareUrl}`)}`}
                    className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:underline dark:text-gray-400"
                    aria-label="Share via Email"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden />
                    Email
                  </a>
                </div>
              </div>
            </Card>

            {/* Job Description */}
            {job.description && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
                  <Briefcase className="h-5 w-5 text-primary" aria-hidden />
                  {t('detail.description')}
                </h2>
                <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300">
                  {job.description.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </Card>
            )}

            {/* Candidate Requirements */}
            {job.candidateProfile && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
                  <ClipboardCheck className="h-5 w-5 text-primary" aria-hidden />
                  {t('detail.requirements')}
                </h2>
                <div className="prose prose-sm max-w-none text-gray-600 dark:text-gray-300">
                  {job.candidateProfile.split('\n').map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              </Card>
            )}

            {/* Skills + Education side by side */}
            {(job.skills.length > 0 || job.educationTypes.length > 0) && (
              <div className="grid gap-6 md:grid-cols-2">
                {job.skills.length > 0 && (
                  <Card>
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
                      <Link2 className="h-5 w-5 text-primary" aria-hidden />
                      {t('detail.skills')}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {job.skills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-brand-soft px-3 py-1 text-sm text-primary"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}
                {job.educationTypes.length > 0 && (
                  <Card>
                    <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
                      <GraduationCap className="h-5 w-5 text-primary" aria-hidden />
                      {t('detail.education')}
                    </h2>
                    <ul className="space-y-1.5">
                      {job.educationTypes.map((e) => (
                        <li key={e} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {e}
                        </li>
                      ))}
                    </ul>
                  </Card>
                )}
              </div>
            )}

            {/* Apply CTA */}
            <Card>
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                <div>
                  {applied ? (
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">{t('detail.alreadyApplied')}</p>
                  ) : isAuthenticated && user?.roleId !== Role.Subscriber ? (
                    <p className="text-sm text-gray-500">{t('detail.candidateOnly')}</p>
                  ) : (
                    <Button onClick={onApply} disabled={apply.isPending} size="lg">
                      {apply.isPending ? t('detail.applying') : t('detail.applyNow')}
                    </Button>
                  )}
                </div>
                <Link
                  to={`/jobs?designation=${encodeURIComponent(job.designation)}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {t('detail.similarJobs')} →
                </Link>
              </div>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}
