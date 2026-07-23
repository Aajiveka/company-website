import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import { Briefcase, Building2, IndianRupee, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, CardSkeleton, useToast } from '@/components/ui';
import { Seo, SITE_URL } from '@/components/Seo';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';
import { useApplyToJob, useJob } from '../jobs.api';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

/** Public — a single job listing, with an Apply CTA (job-details.aspx). */
export default function JobDetailPage() {
  const { t } = useTranslation('jobs');
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
            description: `${job.designation} at ${job.company}`,
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
            url: `${SITE_URL}/jobs/${id}`,
          }}
        />
      )}
      <div className="container max-w-3xl">
        <Breadcrumbs items={[{ label: t('detail.breadcrumbJobs'), to: '/jobs' }, { label: t('detail.breadcrumbDetails') }]} />

        {isLoading || !job ? (
          <CardSkeleton />
        ) : (
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="font-heading text-2xl font-bold text-navy">{job.designation}</h1>
                <p className="mt-1 flex items-center gap-1.5 text-gray-600">
                  <Building2 className="h-4 w-4 text-primary" /> {job.company}
                </p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {job.industry}
              </span>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-gray-400" /> {job.city}</span>
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-4 w-4 text-gray-400" />
                {job.minExp === 0 ? t('search.fresher') : `${job.minExp}+ ${t('search.yrs')}`} · {job.workMode} · {job.employmentType}
              </span>
              <span className="flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-gray-400" /> {lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA
              </span>
            </div>

            <div className="mt-8">
              {applied ? (
                <p className="text-sm font-medium text-green-700">{t('detail.alreadyApplied')}</p>
              ) : isAuthenticated && user?.roleId !== Role.Subscriber ? (
                <p className="text-sm text-gray-500">{t('detail.candidateOnly')}</p>
              ) : (
                <Button onClick={onApply} disabled={apply.isPending}>
                  {apply.isPending ? t('detail.applying') : t('detail.applyNow')}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
