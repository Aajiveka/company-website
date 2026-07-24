import { Link, useParams } from 'react-router-dom';
import { Briefcase, Building2, Globe, IndianRupee, Mail, MapPin, Phone } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Card, CompanyProfileSkeleton } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { api } from '@/lib/axios';
import type { CompanyProfile } from '../client.types';

interface PublicCompanyData extends CompanyProfile {
  openJobs: {
    jobId: number;
    designation: string;
    city: string;
    workMode: string;
    minExp: number;
    minCtc: number;
    maxCtc: number;
  }[];
}

function usePublicCompany(id: string) {
  return useQuery({
    queryKey: ['company', 'public', id],
    queryFn: () => api.get<PublicCompanyData>(`/clients/${id}/public`).then((r) => r.data),
    enabled: !!id,
  });
}

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

/** Public, read-only company profile — shareable link. */
export default function CompanyPublicPage() {
  const { t } = useTranslation('dashboard');
  const { id = '' } = useParams();
  const { data, isLoading, isError } = usePublicCompany(id);

  return (
    <section className="py-12 md:py-16">
      {data && (
        <Seo
          title={`${data.clientName} — Jobs & Company Profile`}
          description={`View ${data.clientName}'s profile and open positions on Aajiveka. ${data.industry} company based in ${data.city}.`}
          path={`/companies/${id}`}
          ogImage={data.logoUrl || undefined}
        />
      )}
      <div className="container max-w-4xl">
        <Breadcrumbs items={[{ label: 'Companies', to: '/jobs' }, { label: data?.clientName ?? 'Company' }]} />

        {isLoading ? (
          <CompanyProfileSkeleton />
        ) : isError || !data ? (
          <Card className="py-10 text-center">
            <p className="text-navy">{t('publicCompany.notAvailable')}</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Company Header */}
            <Card className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <img
                src={data.logoUrl ?? '/files/no-logo.png'}
                alt={data.clientName}
                className="h-20 w-20 rounded-lg border border-gray-100 object-contain p-2 dark:border-gray-700"
              />
              <div className="flex-1 text-center sm:text-left">
                <h1 className="font-heading text-2xl font-bold text-navy">{data.clientName}</h1>
                <p className="text-primary">{data.industry}</p>
                <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-gray-600 dark:text-gray-300 sm:justify-start">
                  {data.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> {data.city}
                    </span>
                  )}
                  {data.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-4 w-4" /> {data.email}
                    </span>
                  )}
                  {data.contactNo && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" /> {data.contactNo}
                    </span>
                  )}
                  {data.website && (
                    <a
                      href={data.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Globe className="h-4 w-4" /> Website
                    </a>
                  )}
                </div>
                {data.description && (
                  <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">{data.description}</p>
                )}
              </div>
            </Card>

            {/* Open Positions */}
            <div>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-navy">
                <Briefcase className="h-5 w-5 text-primary" />
                {t('publicCompany.openPositions')} ({data.openJobs?.length ?? 0})
              </h2>
              {!data.openJobs?.length ? (
                <Card className="text-center">
                  <p className="text-sm text-gray-500">{t('publicCompany.noOpenings')}</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {data.openJobs.map((job) => (
                    <Link key={job.jobId} to={`/jobs/${job.jobId}`} className="block">
                      <Card className="transition hover:shadow-md">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h3 className="font-heading text-base font-semibold text-navy hover:text-primary">
                              {job.designation}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" /> {job.city}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3.5 w-3.5" /> {job.workMode}
                              </span>
                              <span className="flex items-center gap-1">
                                <Briefcase className="h-3.5 w-3.5" />
                                {job.minExp === 0 ? 'Fresher' : `${job.minExp}+ yrs`}
                              </span>
                              <span className="flex items-center gap-1">
                                <IndianRupee className="h-3.5 w-3.5" />
                                {lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA
                              </span>
                            </div>
                          </div>
                          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                            View →
                          </span>
                        </div>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
