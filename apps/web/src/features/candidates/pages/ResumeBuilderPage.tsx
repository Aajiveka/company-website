import { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Download, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, Card, CardSkeleton, useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCvEditProfile } from '../candidate.api';
import type { CvEditProfile } from '../candidate.types';

type Template = 'modern' | 'classic' | 'minimal';

const TEMPLATES: { id: Template; label: string; accent: string }[] = [
  { id: 'modern', label: 'Modern', accent: 'bg-primary text-white' },
  { id: 'classic', label: 'Classic', accent: 'bg-navy text-white' },
  { id: 'minimal', label: 'Minimal', accent: 'bg-gray-800 text-white' },
];

const DEFAULT_SECTIONS = ['personal', 'skills', 'experience', 'education', 'certificates'] as const;
type SectionId = (typeof DEFAULT_SECTIONS)[number];

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const copy = [...arr];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

function ResumeSection({ id, data, template }: { id: SectionId; data: CvEditProfile; template: Template }) {
  const accentColor = template === 'modern' ? 'text-primary' : template === 'classic' ? 'text-navy' : 'text-gray-800';
  const borderColor = template === 'modern' ? 'border-primary' : template === 'classic' ? 'border-navy' : 'border-gray-400';

  switch (id) {
    case 'personal':
      return data.personal ? (
        <div className="mb-6">
          <h1 className={cn('text-2xl font-bold', accentColor)}>{data.personal.fullName}</h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            {data.personal.email && <span>{data.personal.email}</span>}
            {data.personal.mobile && <span>{data.personal.mobile}</span>}
            {data.personal.address && <span>{data.personal.address}</span>}
          </div>
          {data.professional && data.professional.totalExp > 0 && (
            <p className="mt-1 text-sm text-gray-500">{data.professional.totalExp} years experience</p>
          )}
        </div>
      ) : null;

    case 'skills':
      if (!data.professional?.tagNames?.length) return null;
      return (
        <div className="mb-5">
          <h2 className={cn('mb-2 border-b-2 pb-1 text-base font-semibold uppercase tracking-wide', accentColor, borderColor)}>Skills</h2>
          <div className="flex flex-wrap gap-2">
            {data.professional.tagNames.map((s) => (
              <span key={s} className={cn(
                'rounded px-2 py-0.5 text-xs',
                template === 'modern' ? 'bg-primary/10 text-primary' : template === 'classic' ? 'bg-navy/10 text-navy' : 'bg-gray-100 text-gray-700',
              )}>{s}</span>
            ))}
          </div>
        </div>
      );

    case 'experience':
      if (!data.employment.length) return null;
      return (
        <div className="mb-5">
          <h2 className={cn('mb-2 border-b-2 pb-1 text-base font-semibold uppercase tracking-wide', accentColor, borderColor)}>Experience</h2>
          <div className="space-y-3">
            {data.employment.map((e) => (
              <div key={e.subscriberEmployerId}>
                <p className="font-medium text-gray-800">{e.designationId ? `Role #${e.designationId}` : 'Role'}</p>
                <p className="text-sm text-gray-600">{e.employer}</p>
                <p className="text-xs text-gray-400">{e.joiningDate} — {e.flgCurrent ? 'Present' : e.releavingDate}</p>
                {e.jobDescr && <p className="mt-1 text-xs text-gray-500">{e.jobDescr}</p>}
              </div>
            ))}
          </div>
        </div>
      );

    case 'education':
      if (!data.education.length) return null;
      return (
        <div className="mb-5">
          <h2 className={cn('mb-2 border-b-2 pb-1 text-base font-semibold uppercase tracking-wide', accentColor, borderColor)}>Education</h2>
          <div className="space-y-2">
            {data.education.map((e) => (
              <div key={e.subscriberEducationId}>
                <p className="font-medium text-gray-800">{e.degreeId ? `Degree #${e.degreeId}` : 'Degree'}</p>
                <p className="text-xs text-gray-500">{e.courseTypeId ? `Course #${e.courseTypeId}` : 'Course'}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case 'certificates':
      if (!data.certificates.length) return null;
      return (
        <div className="mb-5">
          <h2 className={cn('mb-2 border-b-2 pb-1 text-base font-semibold uppercase tracking-wide', accentColor, borderColor)}>Certificates</h2>
          <ul className="list-inside list-disc space-y-1 text-sm text-gray-700">
            {data.certificates.map((c) => (
              <li key={c.subscriberCertificateId}>{c.certificateName}</li>
            ))}
          </ul>
        </div>
      );

    default:
      return null;
  }
}

export default function ResumeBuilderPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const { data, isLoading } = useCvEditProfile();
  const printRef = useRef<HTMLDivElement>(null);
  const [template, setTemplate] = useState<Template>('modern');
  const [sections, setSections] = useState<SectionId[]>([...DEFAULT_SECTIONS]);
  const [exporting, setExporting] = useState(false);

  const onMoveUp = (i: number) => { if (i > 0) setSections((s) => moveItem(s, i, i - 1)); };
  const onMoveDown = (i: number) => { if (i < sections.length - 1) setSections((s) => moveItem(s, i, i + 1)); };

  const onExportPdf = async () => {
    if (!printRef.current || !data?.personal) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, -y, imgW, imgH);
        y += pageH;
      }
      pdf.save(`${data.personal.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch {
      notify(t('resumeBuilder.exportFailed'), 'error');
    } finally {
      setExporting(false);
    }
  };

  const templateBg = template === 'modern' ? 'border-l-4 border-primary' : template === 'classic' ? 'border-t-4 border-navy' : '';

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs items={[{ label: t('common:dashboard'), to: '/candidate/profile' }, { label: t('resumeBuilder.heading') }]} />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('resumeBuilder.heading')}</h1>

      {isLoading ? (
        <CardSkeleton />
      ) : !data ? (
        <Card><p className="text-sm text-gray-500">{t('resumeBuilder.noData')}</p></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Controls sidebar */}
          <div className="space-y-4">
            {/* Template picker */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-navy">{t('resumeBuilder.chooseTemplate')}</h3>
              <div className="space-y-2">
                {TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    onClick={() => setTemplate(tmpl.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition',
                      template === tmpl.id ? 'border-primary bg-primary/5 text-primary' : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-gray-600 dark:text-gray-300',
                    )}
                  >
                    <div className={cn('h-4 w-4 rounded', tmpl.accent)} />
                    {tmpl.label}
                  </button>
                ))}
              </div>
            </Card>

            {/* Section order */}
            <Card>
              <h3 className="mb-3 text-sm font-semibold text-navy">{t('resumeBuilder.sectionOrder')}</h3>
              <div className="space-y-1">
                {sections.map((sec, i) => (
                  <div key={sec} className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm dark:bg-gray-700">
                    <span className="flex-1 capitalize">{sec}</span>
                    <button onClick={() => onMoveUp(i)} disabled={i === 0} className="p-0.5 text-gray-400 hover:text-primary disabled:opacity-30">
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onMoveDown(i)} disabled={i === sections.length - 1} className="p-0.5 text-gray-400 hover:text-primary disabled:opacity-30">
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Actions */}
            <Button className="w-full" onClick={onExportPdf} isLoading={exporting}>
              <Download className="mr-1.5 h-4 w-4" /> {t('resumeBuilder.downloadPdf')}
            </Button>
          </div>

          {/* Live preview */}
          <Card className="overflow-hidden">
            <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
              <Eye className="h-4 w-4" /> {t('resumeBuilder.livePreview')}
            </div>
            <div
              ref={printRef}
              className={cn('mx-auto max-w-[210mm] bg-white p-8 shadow-sm', templateBg)}
              style={{ minHeight: '297mm' }}
            >
              {sections.map((sec) => (
                <ResumeSection key={sec} id={sec} data={data} template={template} />
              ))}
              <p className="mt-8 text-center text-[10px] text-gray-300">Generated on Aajiveka — aajiveka.com</p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
