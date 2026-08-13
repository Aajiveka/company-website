import type { ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { EmployerBadge, PrimaryButton, SecondaryButton } from '@/employer/components/Cards/ui';

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[8rem_1fr] gap-2 border-b border-slate-100 py-1.5 text-xs last:border-0">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="text-slate-800">{value || '—'}</dd>
    </div>
  );
}

export type JobPreviewData = {
  designation: string;
  employmentType: string;
  workMode: string;
  city: string;
  industryType: string;
  minExp: string;
  maxExp: string;
  minCtc: string;
  maxCtc: string;
  educationDetail: string;
  reportTo: string;
  teamSize: string;
  department: string;
  subDepartment: string;
  description: string;
  skills: string[];
  interviewRounds: { round: number; process: string }[];
};

export function JobPreviewModal({
  open,
  onClose,
  data,
  draftPreview,
}: {
  open: boolean;
  onClose: () => void;
  data: JobPreviewData | null;
  draftPreview?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={data?.designation || 'Job preview'} className="max-w-lg">
      {!data ? (
        <p className="text-xs text-slate-500">Nothing to preview yet.</p>
      ) : (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <EmployerBadge tone={draftPreview ? 'warning' : 'neutral'}>
              {draftPreview ? 'Draft preview' : 'Preview'}
            </EmployerBadge>
            <span className="text-[11px] text-slate-400">Not published yet — review before saving</span>
          </div>
          <dl>
            <Row label="Location" value={data.city} />
            <Row label="Employment" value={data.employmentType} />
            <Row label="Work mode" value={data.workMode} />
            <Row
              label="Experience"
              value={data.maxExp ? `${data.minExp || '0'}–${data.maxExp} yrs` : `${data.minExp || '0'}+ yrs`}
            />
            <Row
              label="CTC"
              value={`${Number(data.minCtc || 0).toLocaleString()}–${Number(data.maxCtc || 0).toLocaleString()}`}
            />
            <Row label="Industry" value={data.industryType} />
            <Row label="Department" value={data.department} />
            <Row label="Sub-dept" value={data.subDepartment} />
            <Row label="Report to" value={data.reportTo} />
            <Row label="Team size" value={data.teamSize} />
            <Row label="Education" value={data.educationDetail} />
            <Row label="Skills" value={data.skills.length ? data.skills.join(', ') : '—'} />
            <Row label="Description" value={<span className="whitespace-pre-wrap">{data.description}</span>} />
            <Row
              label="Interview"
              value={
                data.interviewRounds.length
                  ? data.interviewRounds.map((r) => `R${r.round}: ${r.process}`).join(' · ')
                  : '—'
              }
            />
          </dl>
          <div className="mt-3 flex justify-end gap-2">
            <SecondaryButton onClick={onClose}>Close</SecondaryButton>
            <PrimaryButton onClick={onClose}>Continue editing</PrimaryButton>
          </div>
        </div>
      )}
    </Modal>
  );
}
