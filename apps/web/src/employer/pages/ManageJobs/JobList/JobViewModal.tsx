import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '@/components/ui/Modal';
import { EmployerBadge, PrimaryButton, SecondaryButton } from '@/employer/components/Cards/ui';
import { employerPaths } from '@/employer/constants/paths';
import { useCompanyJob } from '@/employer/services/employer.api';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-slate-100 py-1.5 text-xs last:border-0">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export function JobViewModal({
  jobId,
  open,
  onClose,
}: {
  jobId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data: job, isLoading, isError } = useCompanyJob(open ? jobId : null);

  return (
    <Modal open={open} onClose={onClose} title={job?.designation ?? 'Job details'}>
      {isLoading && <p className="text-xs text-slate-500">Loading…</p>}
      {isError && <p className="text-xs text-rose-600">Failed to load job.</p>}
      {job && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <EmployerBadge
              tone={
                job.status === 'Active'
                  ? 'success'
                  : job.status === 'Archived'
                    ? 'danger'
                    : job.status === 'Draft'
                      ? 'warning'
                      : 'neutral'
              }
            >
              {job.status}
            </EmployerBadge>
            <span className="text-[11px] text-slate-400">#{job.jobId}</span>
            <span className="text-[11px] text-slate-400">Posted {job.postedOn}</span>
          </div>
          <dl>
            <Row label="Location" value={job.city} />
            <Row label="Employment" value={job.employmentType} />
            <Row label="Work mode" value={job.workMode} />
            <Row
              label="Experience"
              value={job.maxExp != null ? `${job.minExp}–${job.maxExp} yrs` : `${job.minExp}+ yrs`}
            />
            <Row
              label="CTC"
              value={`${job.minCtc.toLocaleString()}–${job.maxCtc.toLocaleString()}`}
            />
            <Row label="Industry" value={job.industryType} />
            <Row label="Department" value={job.department} />
            <Row label="Sub-dept" value={job.subDepartment} />
            <Row label="Report to" value={job.reportTo} />
            <Row label="Team size" value={job.teamSize} />
            <Row label="Education" value={job.educationDetail} />
            <Row label="Skills" value={(job.skills ?? []).join(', ')} />
            <Row label="Applicants" value={job.applicants} />
            <Row label="Description" value={<span className="whitespace-pre-wrap">{job.description}</span>} />
            <Row
              label="Interview"
              value={
                job.interviewProcess?.length
                  ? job.interviewProcess.map((r) => `R${r.round}: ${r.process}`).join(' · ')
                  : '—'
              }
            />
          </dl>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={onClose}>Close</SecondaryButton>
            <Link to={employerPaths.editJob(job.jobId)} onClick={onClose}>
              <PrimaryButton>Edit job</PrimaryButton>
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
