import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  Briefcase,
  Building2,
  Calendar,
  ClipboardCheck,
  GraduationCap,
  IndianRupee,
  Link2,
  MapPin,
  Share2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, JobCardSkeleton, useToast } from '@/components/ui';
import { Seo, SITE_URL } from '@/components/Seo';
import { useAuth } from '@/features/auth/auth.store';
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
        <Seo
          title={`${job.designation} at ${job.company}`}
          description={`Apply for ${job.designation} at ${job.company}. ${job.city ? `Location: ${job.city}.` : ''} Find your next career opportunity on Aajiveka.`}
          path={`/jobs/${id}`}
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'JobPosting',
            title: job.designation,
            description: job.description ?? `${job.designation} at ${job.company}`,
            datePosted: job.postedOn,
            hiringOrganization: {
              '@type': 'Organization',
              name: job.company,
            },
            jobLocation: {
              '@type': 'Place',
              address: {
                '@type': 'PostalAddress',
                addressLocality: job.city,
                addressCountry: 'IN',
              },
            },
            baseSalary: {
              '@type': 'MonetaryAmount',
              currency: 'INR',
              value: {
                '@type': 'QuantitativeValue',
                minValue: job.minCtc,
                maxValue: job.maxCtc,
                unitText: 'YEAR',
              },
            },
            employmentType: job.employmentType?.toUpperCase().replace(/\s+/g, '_'),
            experienceRequirements: {
              '@type': 'OccupationalExperienceRequirements',
              monthsOfExperience: job.minExp * 12,
            },
            skills: job.skills.length > 0 ? job.skills.join(', ') : undefined,
            url: shareUrl,
          }}
        />
      )}
      <div className="container max-w-3xl">
        <Breadcrumbs items={[{ label: t('detail.breadcrumbJobs'), to: '/jobs' }, { label: t('detail.breadcrumbDetails') }]} />

        {isLoading || !job ? (
          <JobCardSkeleton />
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
                    <p className="mt-1 flex items-center gap-1.5 text-gray-600">
                      <Building2 className="h-4 w-4 text-primary" /> {job.company}
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
                  <MapPin className="h-4 w-4 shrink-0 text-primary" />
                  <span>{job.city}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                  <Briefcase className="h-4 w-4 shrink-0 text-primary" />
                  <span>{expLabel}</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                  <IndianRupee className="h-4 w-4 shrink-0 text-primary" />
                  <span>{lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-700/50">
                  <ClipboardCheck className="h-4 w-4 shrink-0 text-primary" />
                  <span>{job.workMode} · {job.employmentType}</span>
                </div>
              </div>

              {/* Posted date + share */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4 dark:border-gray-700">
                <p className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Calendar className="h-3.5 w-3.5" />
                  {t('detail.postedOn', { date: formatDate(job.postedOn, i18n.language) })}
                </p>
                <button
                  onClick={onShare}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  {t('detail.shareJob')}
                </button>
              </div>
            </Card>

            {/* Job Description */}
            {job.description && (
              <Card>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
                  <Briefcase className="h-5 w-5 text-primary" />
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
                  <ClipboardCheck className="h-5 w-5 text-primary" />
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
                      <Link2 className="h-5 w-5 text-primary" />
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
                      <GraduationCap className="h-5 w-5 text-primary" />
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
