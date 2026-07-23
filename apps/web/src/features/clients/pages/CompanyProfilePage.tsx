import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Card, CardSkeleton, Table, type Column } from '@/components/ui';
import { useCompanyJobs, useCompanyProfile } from '../client.api';
import type { JobListing } from '../client.types';

const inr = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

/** Company profile + posted-jobs listing (company-profile.aspx). */
export default function CompanyProfilePage() {
  const { t } = useTranslation('dashboard');
  const { data: company, isLoading } = useCompanyProfile();
  const { data: jobs, isLoading: jobsLoading } = useCompanyJobs();

  const jobColumns: Column<JobListing>[] = [
    { key: 'designation', header: t('common:labels.designation') },
    { key: 'city', header: t('common:labels.location') },
    { key: 'workMode', header: t('common:labels.workMode') },
    { key: 'exp', header: t('company.minExp'), render: (j) => `${j.minExp} ${t('common:labels.yrs')}` },
    { key: 'ctc', header: t('company.ctc'), render: (j) => `${inr(j.minCtc)} – ${inr(j.maxCtc)}` },
    { key: 'applicants', header: t('company.applicants') },
    {
      key: 'status',
      header: t('common:labels.status'),
      render: (j) => (
        <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
          {j.status}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/company/profile' }, { label: t('company.heading') }]} />

      {isLoading || !company ? (
        <CardSkeleton />
      ) : (
        <Card className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-center">
          <img
            src={company.logoUrl ?? '/files/no-logo.png'}
            alt={company.clientName}
            className="h-20 w-20 rounded-lg border border-gray-100 object-contain p-2"
          />
          <div className="flex-1">
            <h1 className="font-heading text-2xl font-bold text-navy">{company.clientName}</h1>
            <p className="text-primary">{company.industry}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Mail className="h-4 w-4" /> {company.email}
              </span>
              <span className="flex items-center gap-1.5">
                <Phone className="h-4 w-4" /> {company.contactNo}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4" /> {company.city}
              </span>
              <a
                href={company.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-primary hover:underline"
              >
                <Globe className="h-4 w-4" /> {t('company.website')}
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-600">{company.description}</p>
          </div>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold text-navy">{t('company.postedJobs')}</h2>
      <Table
        columns={jobColumns}
        data={jobs ?? []}
        rowKey={(j) => j.jobId}
        isLoading={jobsLoading}
        emptyMessage={t('company.noJobs')}
      />
    </div>
  );
}
