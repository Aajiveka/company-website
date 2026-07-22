import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase, GraduationCap, Mail, MapPin, Phone } from 'lucide-react';
import { getErrorMessage } from '@/lib/axios';
import { Badge, Breadcrumbs, Button, Card, CardSkeleton, Modal, Select, statusTone } from '@/components/ui';
import { useToast } from '@/components/ui';
import {
  useActiveJobs,
  useAssignDocuments,
  useAssignJob,
  useCandidateDetail,
  useDecideCandidate,
  useDocumentTypes,
} from '../recruitment.api';

/** QC/Client — full candidate detail view (candidate-details.aspx). */
export default function CandidateDetailsPage() {
  const { id = '' } = useParams();
  const { data, isLoading } = useCandidateDetail(id);
  const decide = useDecideCandidate(id);
  const assignJob = useAssignJob(id);
  const { data: jobOptions } = useActiveJobs();
  const assignDocs = useAssignDocuments(id);
  const { data: documentTypes } = useDocumentTypes();
  const { notify } = useToast();

  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [docsOpen, setDocsOpen] = useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = useState<number[]>([]);

  const act = (decision: 'Approved' | 'Rejected') =>
    decide.mutate(decision, {
      onSuccess: () => notify(`Candidate ${decision.toLowerCase()}.`, decision === 'Approved' ? 'success' : 'info'),
      onError: (e) =>
        notify(getErrorMessage(e, 'Something went wrong'), 'error'),
    });

  const onAssign = () => {
    if (!selectedJobId) return;
    assignJob.mutate(Number(selectedJobId), {
      onSuccess: () => {
        notify('Candidate assigned to job.', 'success');
        setAssignOpen(false);
        setSelectedJobId('');
      },
      onError: (e) =>
        notify(getErrorMessage(e, 'Could not assign this job'), 'error'),
    });
  };

  const toggleDocType = (docTypeId: number) =>
    setSelectedDocTypes((prev) =>
      prev.includes(docTypeId) ? prev.filter((d) => d !== docTypeId) : [...prev, docTypeId],
    );

  const onAssignDocs = () => {
    if (!selectedDocTypes.length) return;
    assignDocs.mutate(selectedDocTypes, {
      onSuccess: () => {
        notify('Documents assigned to candidate.', 'success');
        setDocsOpen(false);
        setSelectedDocTypes([]);
      },
      onError: (e) =>
        notify(getErrorMessage(e, 'Could not assign documents'), 'error'),
    });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs items={[{ label: 'Candidates', to: '/recruitment/candidates' }, { label: 'Candidate Details' }]} />

      {isLoading || !data ? (
        <CardSkeleton />
      ) : (
        <div className="space-y-6">
          <Card className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
              <img
                src={data.photoUrl ?? '/files/no-image.png'}
                alt={data.fullName}
                className="h-24 w-24 rounded-full object-cover ring-4 ring-brand-soft"
              />
              <div className="text-center sm:text-left">
                <h1 className="font-heading text-2xl font-bold text-navy">{data.fullName}</h1>
                <p className="text-primary">{data.designation}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm text-gray-600 sm:justify-start">
                  <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" /> {data.email}</span>
                  <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" /> {data.mobile}</span>
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {data.city}</span>
                  <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {data.totalExperience}</span>
                </div>
                <div className="mt-2 flex justify-center sm:justify-start">
                  <Badge tone={statusTone(data.registrationStatus)}>{data.registrationStatus}</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {data.registrationStatus === 'Pending' && (
                <>
                  <Button variant="outline" size="sm" disabled={decide.isPending} onClick={() => act('Approved')}>
                    Approve CV
                  </Button>
                  <Button variant="danger" size="sm" disabled={decide.isPending} onClick={() => act('Rejected')}>
                    Reject
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                Assign Job
              </Button>
              <Button variant="outline" size="sm" onClick={() => setDocsOpen(true)}>
                Assign Documents
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 text-lg">Skills</h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <span key={s} className="rounded-full bg-brand-soft px-3 py-1 text-sm text-primary">{s}</span>
              ))}
            </div>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-lg"><Briefcase className="h-5 w-5 text-primary" /> Experience</h2>
              <ul className="space-y-4">
                {data.experience.map((e, i) => (
                  <li key={i} className="border-l-2 border-brand-soft pl-3">
                    <p className="font-medium text-navy">{e.designation}</p>
                    <p className="text-sm text-gray-600">{e.company}</p>
                    <p className="text-xs text-gray-400">{e.from} — {e.to}</p>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h2 className="mb-4 flex items-center gap-2 text-lg"><GraduationCap className="h-5 w-5 text-primary" /> Education</h2>
              <ul className="space-y-4">
                {data.education.map((e, i) => (
                  <li key={i} className="border-l-2 border-brand-soft pl-3">
                    <p className="font-medium text-navy">{e.degree}</p>
                    <p className="text-sm text-gray-600">{e.institute}</p>
                    <p className="text-xs text-gray-400">{e.year}</p>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      )}

      <Modal open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign Job">
        <div className="space-y-4">
          <Select
            label="Job opening"
            placeholder="Select a job…"
            options={(jobOptions ?? []).map((j) => ({ label: `${j.designation} — ${j.company}`, value: j.jobId }))}
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!selectedJobId || assignJob.isPending} onClick={onAssign}>
              Assign
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={docsOpen} onClose={() => setDocsOpen(false)} title="Assign Required Documents">
        <div className="space-y-4">
          <div className="space-y-2">
            {(documentTypes ?? []).map((d) => (
              <label key={d.documentTypeId} className="flex items-center gap-2 text-sm text-navy">
                <input
                  type="checkbox"
                  checked={selectedDocTypes.includes(d.documentTypeId)}
                  onChange={() => toggleDocType(d.documentTypeId)}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                {d.name}
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDocsOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!selectedDocTypes.length || assignDocs.isPending} onClick={onAssignDocs}>
              Assign
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
