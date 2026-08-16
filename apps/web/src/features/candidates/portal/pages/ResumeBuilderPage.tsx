import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, Pencil, Plus } from 'lucide-react';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCvEditProfile, useCvMasters } from '../../candidate.api';
import type { CvEditProfile, CvMasters } from '../../candidate.types';
import { ModuleHeader } from '../components/ModuleFrame';
import { Btn, Card, CardBody, CardHeader, Chip, SkeletonRows } from '../components/primitives';
import { CertificationEditor } from '../components/CertificationEditor';
import { computeResumeScore, type SectionState } from '../resumeScore';
import { dotted, duration, educationTitle, labelOf, monthYear, years } from '../format';
import { stepHref, type WizardStepKey } from '../wizardSteps';

type Template = 'classic' | 'ats';
type SectionId = 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'certifications';

const SECTIONS: { id: SectionId; label: string; step: WizardStepKey }[] = [
  { id: 'personal', label: 'Personal Info', step: 'personal' },
  { id: 'summary', label: 'Summary', step: 'summary' },
  { id: 'experience', label: 'Work Experience', step: 'experience' },
  { id: 'education', label: 'Education', step: 'education' },
  { id: 'skills', label: 'Skills', step: 'skills' },
  { id: 'certifications', label: 'Certifications', step: 'skills' },
];

/**
 * Resume Builder — Figma nodes 7:6743 through 7:7714.
 *
 * Reads the same CV the profile does, so there is no second copy of a candidate's history to
 * drift: the builder chooses a template and exports, and every "Edit" goes to the wizard step
 * that owns the data.
 */
export default function ResumeBuilderPage() {
  const { data: cv, isLoading } = useCvEditProfile();
  const { data: masters } = useCvMasters();
  const { notify } = useToast();

  const [section, setSection] = useState<SectionId>('personal');
  const [template, setTemplate] = useState<Template>('classic');
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const scoring = useMemo(() => (cv ? computeResumeScore(cv) : null), [cv]);

  const onDownload = async () => {
    if (!sheetRef.current || !cv) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(sheetRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${(cv.personal?.fullName || 'resume').replace(/\s+/g, '_')}_Resume.pdf`);
    } catch {
      notify('Could not build the PDF. Try printing the preview instead.', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !cv || !scoring) {
    return (
      <>
        <ModuleHeader title="Resume Builder" />
        <Card>
          <CardBody>
            <SkeletonRows rows={4} />
          </CardBody>
        </Card>
      </>
    );
  }

  return (
    <>
      <ModuleHeader
        title="Resume Builder"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setPreview((v) => !v)}>
              <Eye className="size-4" aria-hidden />
              {preview ? 'Edit view' : 'Preview'}
            </Btn>
            <Btn onClick={onDownload} disabled={exporting}>
              <Download className="size-4" aria-hidden />
              {exporting ? 'Building…' : 'Download'}
            </Btn>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[200px_1fr_200px] lg:items-start">
        {/* Sections + templates */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Sections" />
            <CardBody className="space-y-1">
              {SECTIONS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSection(s.id);
                    setPreview(false);
                  }}
                  aria-current={section === s.id ? 'true' : undefined}
                  className={cn(
                    'block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors',
                    section === s.id
                      ? 'bg-blue-50 text-aj-blue dark:bg-blue-950'
                      : 'text-slate-600 hover:bg-aj-canvas dark:text-gray-300 dark:hover:bg-gray-700',
                  )}
                >
                  {s.label}
                </button>
              ))}
              {/* "Add Section" in the design opens the wizard, which is where a section that
                  has no content yet actually gets filled in. */}
              <Link
                to={stepHref('personal')}
                className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-aj-blue transition-colors hover:bg-blue-50 dark:hover:bg-blue-950"
              >
                <Plus className="size-4" aria-hidden />
                Add Section
              </Link>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Templates" />
            <CardBody className="space-y-2">
              {(
                [
                  { id: 'classic' as const, label: 'Classic', blurb: 'Headings with a rule' },
                  { id: 'ats' as const, label: 'ATS Pro', blurb: 'Plain, parser-friendly' },
                ]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTemplate(t.id)}
                  aria-pressed={template === t.id}
                  className={cn(
                    'block w-full rounded-lg border p-3 text-left transition-colors',
                    template === t.id
                      ? 'border-aj-blue bg-blue-50 dark:bg-blue-950'
                      : 'border-aj-line hover:border-aj-blue dark:border-gray-700',
                  )}
                >
                  <span className="block text-[13px] font-bold text-slate-800 dark:text-gray-100">{t.label}</span>
                  <span className="block text-[11px] text-slate-500">{t.blurb}</span>
                </button>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Sheet */}
        <Card className="min-w-0">
          <CardHeader
            title={preview ? 'Preview' : (SECTIONS.find((s) => s.id === section)?.label ?? 'Resume')}
            action={
              !preview && (
                <Link
                  to={stepHref(SECTIONS.find((s) => s.id === section)?.step ?? 'personal')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </Link>
              )
            }
          />
          <CardBody>
            {!preview && section === 'experience' && (
              <div className="mb-4">
                <Link
                  to={stepHref('experience')}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-aj-blue px-4 py-2 text-[13px] font-semibold text-aj-blue transition-colors hover:bg-blue-50 dark:hover:bg-blue-950"
                >
                  <Plus className="size-4" aria-hidden />
                  Add Experience
                </Link>
              </div>
            )}
            {!preview && section === 'certifications' ? (
              // The only section the design gives its own form rather than a preview.
              <CertificationEditor rows={cv.certificates} />
            ) : (
              <div ref={sheetRef} className="bg-white p-6 font-sans text-slate-800">
                {preview ? (
                  SECTIONS.map((s) => (
                    <SectionBody key={s.id} id={s.id} cv={cv} masters={masters} template={template} />
                  ))
                ) : (
                  <SectionBody id={section} cv={cv} masters={masters} template={template} />
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Score */}
        <Card>
          <CardHeader title="Resume Score" />
          <CardBody>
            <div className="text-center">
              <div className="font-display text-4xl font-bold text-aj-blue">{scoring.score}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-aj-line">
                <div
                  className="h-full rounded-full bg-aj-blue transition-[width]"
                  style={{ width: `${scoring.score}%` }}
                />
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {scoring.sections.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-600 dark:text-gray-300">{s.label}</span>
                  <span className={cn('shrink-0 font-semibold', STATE_CLASS[s.state])}>{s.hint}</span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </>
  );
}

const STATE_CLASS: Record<SectionState, string> = {
  complete: 'text-emerald-600',
  partial: 'text-amber-600',
  missing: 'text-slate-400',
};

function Heading({ children, template }: { children: string; template: Template }) {
  return (
    <h3
      className={cn(
        'mb-2 mt-5 font-display text-sm font-bold uppercase tracking-wide text-slate-800 first:mt-0',
        template === 'classic' && 'border-b border-slate-300 pb-1',
      )}
    >
      {children}
    </h3>
  );
}

function SectionBody({
  id,
  cv,
  masters,
  template,
}: {
  id: SectionId;
  cv: CvEditProfile;
  masters: CvMasters | undefined;
  template: Template;
}) {
  const empty = <p className="text-xs italic text-slate-400">Nothing added yet.</p>;

  switch (id) {
    case 'personal':
      return (
        <section>
          <h2 className="font-display text-xl font-bold text-slate-900">{cv.personal?.fullName || 'Your Name'}</h2>
          {cv.headline && <p className="text-sm font-semibold text-slate-600">{cv.headline}</p>}
          <p className="mt-1 text-xs text-slate-500">
            {dotted(cv.personal?.email, cv.personal?.mobile, cv.personal?.address)}
          </p>
        </section>
      );

    case 'summary':
      return (
        <section>
          <Heading template={template}>Summary</Heading>
          {cv.summary ? <p className="whitespace-pre-line text-[13px] leading-relaxed">{cv.summary}</p> : empty}
        </section>
      );

    case 'experience':
      return (
        <section>
          <Heading template={template}>Work Experience</Heading>
          {cv.employment.length
            ? cv.employment.map((e) => (
                <div key={e.subscriberEmployerId} className="mb-3">
                  <p className="text-[13px] font-bold">
                    {labelOf(masters?.designations, e.designationId) ?? 'Role'} — {e.employer}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dotted(
                      [monthYear(e.joiningDate), e.flgCurrent ? 'Present' : monthYear(e.releavingDate)]
                        .filter(Boolean)
                        .join(' – ') || null,
                      duration(e.joiningDate, e.flgCurrent ? null : e.releavingDate),
                    )}
                  </p>
                  {e.jobDescr && <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed">{e.jobDescr}</p>}
                </div>
              ))
            : empty}
        </section>
      );

    case 'education':
      return (
        <section>
          <Heading template={template}>Education</Heading>
          {cv.education.length
            ? cv.education.map((e) => (
                <div key={e.subscriberEducationId} className="mb-2">
                  <p className="text-[13px] font-bold">
                    {educationTitle(masters?.degrees, masters?.courses, e)}
                  </p>
                  <p className="text-xs text-slate-500">
                    {dotted(
                      e.instituteName,
                      // The branch, now that the qualification is the headline above it.
                      labelOf(masters?.courses, e.courseTypeId),
                      e.specialization || null,
                      years(e.startYear, e.passingYear),
                      e.marks || null,
                    )}
                  </p>
                </div>
              ))
            : empty}
        </section>
      );

    case 'skills':
      return (
        <section>
          <Heading template={template}>Skills</Heading>
          {cv.professional?.tagNames.length ? (
            template === 'ats' ? (
              // A parser reads a comma list far more reliably than styled chips.
              <p className="text-[13px]">{cv.professional.tagNames.join(', ')}</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {cv.professional.tagNames.map((s) => (
                  <Chip key={s} label={s} />
                ))}
              </div>
            )
          ) : (
            empty
          )}
          {cv.languages.length > 0 && (
            <p className="mt-2 text-xs text-slate-500">
              Languages: {cv.languages.map((l) => l.languageName).join(', ')}
            </p>
          )}
        </section>
      );

    case 'certifications':
      return (
        <section>
          <Heading template={template}>Certifications</Heading>
          {cv.certificates.length
            ? cv.certificates.map((c) => (
                <p key={c.subscriberCertificateId} className="mb-1 text-[13px]">
                  <span className="font-bold">{c.certificateName}</span>
                  {c.validFromYear ? <span className="text-slate-500"> · {c.validFromYear}</span> : null}
                </p>
              ))
            : empty}
        </section>
      );
  }
}
