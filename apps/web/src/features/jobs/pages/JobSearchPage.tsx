import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Building2, IndianRupee, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, JobCardSkeleton, Pagination } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { PageBanner } from '@/features/public/components/PageBanner';
import { JobSearchBar } from '../components/JobSearchBar';
import { usePublicJobs } from '../jobs.api';
import type { PublicJob } from '../jobs.types';

const PAGE_SIZE = 10;

/** CTC is stored in rupees; the listings show it in lakhs, like the reference site. */
const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

function JobCard({ job }: { job: PublicJob }) {
  const { t } = useTranslation('jobs');
  return (
    <Link to={`/jobs/${job.jobId}`} className="block">
      <Card className="transition hover:shadow-md">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-semibold text-navy">{job.designation}</h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
              <Building2 className="h-4 w-4 text-primary" aria-hidden />
              {job.company}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {job.industry}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-gray-400" aria-hidden />
            {job.city}
          </span>
          <span className="flex items-center gap-1.5">
            <Briefcase className="h-4 w-4 text-gray-400" aria-hidden />
            {job.minExp === 0 ? t('search.fresher') : `${job.minExp}+ ${t('search.yrs')}`} · {job.workMode} · {job.employmentType}
          </span>
          <span className="flex items-center gap-1.5">
            <IndianRupee className="h-4 w-4 text-gray-400" aria-hidden />
            {lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA
          </span>
        </div>
      </Card>
    </Link>
  );
}

/** Public job search results — driven entirely by the `function`/`location`/`page` query params. */
export default function JobSearchPage() {
  const { t } = useTranslation('jobs');
  const [searchParams, setSearchParams] = useSearchParams();
  const designation = searchParams.get('designation') ?? '';
  const location = searchParams.get('location') ?? '';
  const page = Number(searchParams.get('page') ?? '1');

  const { data, isLoading } = usePublicJobs({ designation, location, page, pageSize: PAGE_SIZE });
  const pageCount = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  const goToPage = (next: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(next));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <>
      <Seo
        title="Find Jobs"
        description="Browse thousands of job openings across India. Filter by location, industry, and experience to find your perfect role on Aajiveka."
        path="/jobs"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://aajiveka.com/' },
            { '@type': 'ListItem', position: 2, name: 'Find Jobs', item: 'https://aajiveka.com/jobs' },
          ],
        }}
      />
      <PageBanner variant="jobs" title={t('search.heading')}>
        <div className="mx-auto mt-8 max-w-3xl">
          {/* Remount on param change so the dropdowns reflect the URL after a back/forward. */}
          <JobSearchBar
            key={`${designation}|${location}`}
            initialDesignation={designation}
            initialLocation={location}
          />
        </div>
      </PageBanner>

      <section className="py-12 md:py-16">
        <div className="container">
          <p className="mb-6 text-sm text-gray-500">
            {isLoading ? t('search.searching') : t('search.jobsFound', { count: data?.total ?? 0 })}
            {designation && ` ${t('search.forDesignation', { designation })}`}
            {location && ` · ${location}`}
          </p>

          {isLoading ? (
            <div className="space-y-4">
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
            </div>
          ) : data && data.rows.length > 0 ? (
            <>
              <div className="space-y-4">
                {data.rows.map((job) => (
                  <JobCard key={job.jobId} job={job} />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <Pagination page={page} pageCount={pageCount} onChange={goToPage} />
              </div>
            </>
          ) : (
            <Card className="text-center">
              <p className="text-navy">{t('search.noMatch')}</p>
              <p className="mt-1 text-sm text-gray-500">
                {t('search.tryDifferent')}
              </p>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
