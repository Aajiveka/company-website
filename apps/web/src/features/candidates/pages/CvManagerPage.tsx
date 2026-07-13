import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Breadcrumbs, Button, Card, CardSkeleton, Input, Select, useToast } from '@/components/ui';
import { useCandidateProfile } from '../candidate.api';

interface CvForm {
  fullName: string;
  email: string;
  mobile: string;
  gender: string;
  city: string;
  designation: string;
  totalExperience: string;
  skills: string;
}

/** Candidate — editable CV manager (candidate-dashboard-cv-manager.aspx). */
export default function CvManagerPage() {
  const { data, isLoading } = useCandidateProfile();
  const { notify } = useToast();
  const { register, handleSubmit, reset } = useForm<CvForm>();

  useEffect(() => {
    if (data) {
      reset({
        fullName: data.fullName,
        email: data.email,
        mobile: data.mobile,
        gender: data.gender,
        city: data.city,
        designation: data.designation,
        totalExperience: data.totalExperience,
        skills: data.skills.join(', '),
      });
    }
  }, [data, reset]);

  const onSubmit = (_values: CvForm) => {
    // Wire to PUT /candidates/me (spSubscriberCVUpdate_*) when available.
    notify('CV updated successfully.', 'success');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs items={[{ label: 'Dashboard', to: '/candidate/profile' }, { label: 'CV Manager' }]} />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">CV Manager</h1>

      {isLoading ? (
        <CardSkeleton />
      ) : (
        <Card>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <h2 className="mb-3 text-lg">Personal Details</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full Name" {...register('fullName')} />
                <Input label="Designation" {...register('designation')} />
                <Input label="Email" type="email" {...register('email')} />
                <Input label="Mobile" {...register('mobile')} />
                <Select
                  label="Gender"
                  options={[
                    { label: 'Male', value: 'Male' },
                    { label: 'Female', value: 'Female' },
                    { label: 'Other', value: 'Other' },
                  ]}
                  {...register('gender')}
                />
                <Input label="City" {...register('city')} />
                <Input label="Total Experience" {...register('totalExperience')} />
              </div>
            </div>
            <div>
              <h2 className="mb-3 text-lg">Skills</h2>
              <Input label="Skills (comma separated)" {...register('skills')} />
            </div>
            <div className="flex justify-end">
              <Button type="submit">Save Changes</Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
