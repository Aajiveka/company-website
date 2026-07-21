import { Link, useSearchParams } from 'react-router-dom';
import { Briefcase, Building2, IndianRupee, MapPin } from 'lucide-react';
import { Card, CardSkeleton, Pagination } from '@/components/ui';
import { PageBanner } from '@/features/public/components/PageBanner';
import { JobSearchBar } from '../components/JobSearchBar';
import { usePublicJobs } from '../jobs.api';
import type { PublicJob } from '../jobs.types';

const PAGE_SIZE = 10;

/** CTC is stored in rupees; the listings show it in lakhs, like the reference site. */
const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

function JobCard({ job }: { job: PublicJob }) {
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
            {job.minExp === 0 ? 'Fresher' : `${job.minExp}+ yrs`} · {job.workMode} · {job.employmentType}
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
      <PageBanner variant="jobs" title="Find your next role">
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
            {isLoading ? 'Searching…' : `${data?.total ?? 0} job${data?.total === 1 ? '' : 's'} found`}
            {designation && ` for ${designation}`}
            {location && ` · ${location}`}
          </p>

          {isLoading ? (
            <div className="space-y-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
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
              <p className="text-navy">No jobs match your search.</p>
              <p className="mt-1 text-sm text-gray-500">
                Try a different function or location.
              </p>
            </Card>
          )}
        </div>
      </section>
    </>
  );
}
