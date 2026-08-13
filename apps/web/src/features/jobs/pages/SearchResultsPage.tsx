import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Briefcase,
  Building2,
  IndianRupee,
  MapPin,
  Search,
  User,
} from 'lucide-react';
import { api } from '@/lib/axios';
import { Badge, Card, Pagination, Skeleton } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { cn } from '@/lib/cn';

/* ---------- types ---------- */
type SearchTab = 'jobs' | 'companies' | 'candidates';

interface JobResult {
  jobId: number;
  designation: string;
  company: string;
  city: string;
  minCtc: number;
  maxCtc: number;
  postedOn: string;
}

interface CompanyResult {
  id: number;
  name: string;
  industry: string;
  city: string;
  jobCount: number;
}

interface CandidateResult {
  id: number;
  name: string;
  designation: string;
  experience: number;
  skills: string[];
}

interface SearchResponse {
  jobs: { rows: JobResult[]; total: number };
  companies: { rows: CompanyResult[]; total: number };
  candidates: { rows: CandidateResult[]; total: number };
}

const PAGE_SIZE = 10;

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

/* ---------- component ---------- */
export default function SearchResultsPage() {
  const { t } = useTranslation('jobs');
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') ?? '';
  // Tab lives in the URL so it can be linked to (the portal header's "Companies"
  // entry points at /search?tab=companies) and survives a reload. Anything other
  // than a known tab falls back to jobs, which is what it defaulted to before.
  const tabParam = searchParams.get('tab');
  const activeTab: SearchTab = (['jobs', 'companies', 'candidates'] as const).includes(tabParam as SearchTab)
    ? (tabParam as SearchTab)
    : 'jobs';
  const setActiveTab = (tab: SearchTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };
  const [pages, setPages] = useState<Record<SearchTab, number>>({
    jobs: 1,
    companies: 1,
    candidates: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['globalSearch', query, activeTab, pages[activeTab]],
    queryFn: async () => {
      const { data } = await api.get<SearchResponse>('/search', {
        params: {
          q: query,
          type: activeTab,
          page: pages[activeTab],
          pageSize: PAGE_SIZE,
        },
      });
      return data;
    },
    enabled: !!query,
  });

  const currentData = data?.[activeTab];
  const total = (currentData as { total: number } | undefined)?.total ?? 0;
  const pageCount = Math.ceil(total / PAGE_SIZE);

  const handlePageChange = (page: number) => {
    setPages((prev) => ({ ...prev, [activeTab]: page }));
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const q = (fd.get('q') as string)?.trim();
    if (q) {
      setSearchParams({ q });
      setPages({ jobs: 1, companies: 1, candidates: 1 });
    }
  };

  const TABS: { key: SearchTab; count: number }[] = [
    { key: 'jobs', count: data?.jobs.total ?? 0 },
    { key: 'companies', count: data?.companies.total ?? 0 },
    { key: 'candidates', count: data?.candidates.total ?? 0 },
  ];

  return (
    <>
      <Seo
        title={query ? `${t('search.resultsFor', { query })}` : t('search.heading')}
        description="Search for jobs, companies, and candidates on Aajiveka."
        path="/search"
      />

      <section className="bg-navy py-10 text-white">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="font-heading text-2xl font-bold">
            {query
              ? t('search.resultsFor', { query })
              : t('search.globalHeading')}
          </h1>
          <form onSubmit={handleSearch} className="relative mt-6">
            <Search
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
            <input
              name="q"
              defaultValue={query}
              placeholder={t('search.globalPlaceholder')}
              className="w-full rounded-xl bg-white py-3 pl-12 pr-4 text-gray-800 shadow-lg outline-none focus:ring-2 focus:ring-primary/40 dark:bg-gray-800 dark:text-white"
            />
          </form>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="container mx-auto max-w-4xl">
          {/* Tabs */}
          <div className="mb-8 flex gap-2 border-b border-gray-200 dark:border-gray-700">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition',
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400',
                )}
              >
                {t(`search.tab_${tab.key}`)}
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs',
                    activeTab === tab.key
                      ? 'bg-primary/10 text-primary'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Loading */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-3 rounded-xl bg-white p-5 shadow-card dark:bg-gray-800">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
              ))}
            </div>
          ) : !query ? (
            <Card className="text-center">
              <div className="flex flex-col items-center gap-3 py-8">
                <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden />
                <p className="text-navy dark:text-white">{t('search.enterQuery')}</p>
              </div>
            </Card>
          ) : total === 0 ? (
            <Card className="text-center">
              <div className="flex flex-col items-center gap-3 py-8">
                <Search className="h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden />
                <p className="text-navy dark:text-white">{t('search.noResults')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('search.tryDifferentQuery')}</p>
              </div>
            </Card>
          ) : (
            <>
              {/* Job results */}
              {activeTab === 'jobs' && (
                <div className="space-y-4">
                  {(data?.jobs.rows ?? []).map((job) => (
                    <Link key={job.jobId} to={`/jobs/${job.jobId}`} className="block">
                      <Card className="transition hover:shadow-md">
                        <h3 className="font-heading text-lg font-semibold text-navy dark:text-white">
                          {job.designation}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300">
                          <Building2 className="h-4 w-4 text-primary" aria-hidden />
                          {job.company}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-gray-400" aria-hidden />
                            {job.city}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <IndianRupee className="h-4 w-4 text-gray-400" aria-hidden />
                            {lpa(job.minCtc)}-{lpa(job.maxCtc)} LPA
                          </span>
                          <span className="text-xs text-gray-400">
                            {t('search.postedOn', { date: job.postedOn })}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* Company results */}
              {activeTab === 'companies' && (
                <div className="space-y-4">
                  {(data?.companies.rows ?? []).map((company) => (
                    <Link key={company.id} to={`/companies/${company.id}`} className="block">
                      <Card className="transition hover:shadow-md">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                            <Building2 className="h-6 w-6 text-primary" aria-hidden />
                          </div>
                          <div>
                            <h3 className="font-heading text-lg font-semibold text-navy dark:text-white">
                              {company.name}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{company.industry}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-gray-400" aria-hidden />
                            {company.city}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Briefcase className="h-4 w-4 text-gray-400" aria-hidden />
                            {t('search.jobsCount', { count: company.jobCount })}
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}

              {/* Candidate results */}
              {activeTab === 'candidates' && (
                <div className="space-y-4">
                  {(data?.candidates.rows ?? []).map((candidate) => (
                    <Card key={candidate.id} className="transition hover:shadow-md">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                          <User className="h-6 w-6 text-gray-400" aria-hidden />
                        </div>
                        <div>
                          <h3 className="font-heading text-base font-semibold text-navy dark:text-white">
                            {candidate.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{candidate.designation}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
                        <span>
                          {t('search.experience', { years: candidate.experience })}
                        </span>
                      </div>
                      {candidate.skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {candidate.skills.map((skill) => (
                            <Badge key={skill} tone="blue">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              {/* Pagination */}
              {pageCount > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination
                    page={pages[activeTab]}
                    pageCount={pageCount}
                    onChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
