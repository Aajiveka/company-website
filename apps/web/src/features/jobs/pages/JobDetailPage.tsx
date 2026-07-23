import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getErrorMessage } from '@/lib/axios';
import { Briefcase, Building2, IndianRupee, MapPin } from 'lucide-react';
import { Breadcrumbs, Button, Card, JobDetailSkeleton, useToast } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { useAuth } from '@/features/auth/auth.store';
import { Role } from '@/types/roles';
import { useApplyToJob, useJob } from '../jobs.api';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

/** Public — a single job listing, with an Apply CTA (job-details.aspx). */
export default function JobDetailPage() {
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
        notify('Application submitted.', 'success');
      },
      onError: (e) =>
        notify(getErrorMessage(e, 'Could not submit your application'), 'error'),
    });
  };

  return (
    <section className="py-12 md:py-16">
      {job && (
        <Seo
          title={`${job.designation} at ${job.company}`}
          description={`Apply for ${job.designation} at ${job.company}. ${job.city ? `Location: ${job.city}.` : ''} Find your next career opportunity on Aajiveka.`}
          path={`/jobs/${id}`}
        />
      )}
      <div className="container max-w-3xl">
        <Breadcrumbs items={[{ label: 'Jobs', to: '/jobs' }, { label: 'Job Details' }]} />

        {isLoading || !job ? (
          <JobDetailSkeleton />
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
                {job.minExp === 0 ? 'Fresher' : `${job.minExp}+ yrs`} · {job.workMode} · {job.employmentType}
              </span>
              <span className="flex items-center gap-1.5">
                <IndianRupee className="h-4 w-4 text-gray-400" /> {lpa(job.minCtc)}–{lpa(job.maxCtc)} LPA
              </span>
            </div>

            <div className="mt-8">
              {applied ? (
                <p className="text-sm font-medium text-green-700">You've applied to this job.</p>
              ) : isAuthenticated && user?.roleId !== Role.Subscriber ? (
                <p className="text-sm text-gray-500">Only candidate accounts can apply to jobs.</p>
              ) : (
                <Button onClick={onApply} disabled={apply.isPending}>
                  {apply.isPending ? 'Applying…' : 'Apply Now'}
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </section>
  );
}
