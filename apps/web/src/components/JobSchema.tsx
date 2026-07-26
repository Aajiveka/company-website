import type { JobDetail } from '@/features/jobs/jobs.types';
import { SITE_URL } from './Seo';

export interface JobSchemaProps {
  job: JobDetail;
  /** Path to the job detail page, e.g. "/jobs/42" */
  path: string;
}

/**
 * Renders a Google-compatible JobPosting JSON-LD structured data block.
 * See https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
export function JobSchema({ job, path }: JobSchemaProps) {
  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.designation,
    description: job.description ?? `${job.designation} at ${job.company}`,
    datePosted: job.postedOn,
    hiringOrganization: {
      '@type': 'Organization',
      name: job.company,
      ...(job.companyLogo ? { logo: job.companyLogo } : {}),
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
    url: `${SITE_URL}${path}`,
  };

  if (job.skills.length > 0) {
    jsonLd.skills = job.skills.join(', ');
  }

  if (job.educationTypes.length > 0) {
    jsonLd.educationRequirements = {
      '@type': 'EducationalOccupationalCredential',
      credentialCategory: job.educationTypes.join(', '),
    };
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
