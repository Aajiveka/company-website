import { Globe, Mail, MapPin, Phone } from 'lucide-react';
import { Breadcrumbs, Card, CompanyProfileSkeleton, Table, type Column } from '@/components/ui';
import { useCompanyJobs, useCompanyProfile } from '../client.api';
import type { JobListing } from '../client.types';

const inr = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

const jobColumns: Column<JobListing>[] = [
  { key: 'designation', header: 'Designation' },
  { key: 'city', header: 'Location' },
  { key: 'workMode', header: 'Work Mode' },
  { key: 'exp', header: 'Min Exp', render: (j) => `${j.minExp} yrs` },
  { key: 'ctc', header: 'CTC', render: (j) => `${inr(j.minCtc)} – ${inr(j.maxCtc)}` },
  { key: 'applicants', header: 'Applicants' },
  {
    key: 'status',
    header: 'Status',
    render: (j) => (
      <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
        {j.status}
      </span>
    ),
  },
];

/** Company profile + posted-jobs listing (company-profile.aspx). */
export default function CompanyProfilePage() {
  const { data: company, isLoading } = useCompanyProfile();
  const { data: jobs, isLoading: jobsLoading } = useCompanyJobs();

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/company/profile' }, { label: 'Company Profile' }]} />

      {isLoading || !company ? (
        <CompanyProfileSkeleton />
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
                <Globe className="h-4 w-4" /> Website
              </a>
            </div>
            <p className="mt-3 text-sm text-gray-600">{company.description}</p>
          </div>
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold text-navy">Posted Jobs</h2>
      <Table
        columns={jobColumns}
        data={jobs ?? []}
        rowKey={(j) => j.jobId}
        isLoading={jobsLoading}
        emptyMessage="No jobs posted yet."
      />
    </div>
  );
}
