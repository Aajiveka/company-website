import { useRef, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Breadcrumbs, Button, ProfileSkeleton } from '@/components/ui';
import { useCandidateProfile } from '../candidate.api';

export default function ResumePreviewPage() {
  const { t } = useTranslation('dashboard');
  const { data, isLoading, isError } = useCandidateProfile();
  const printRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const onPrint = () => {
    window.print();
  };

  const onExportPdf = async () => {
    if (!printRef.current || !data) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas-pro')).default;
      const { jsPDF } = await import('jspdf');

      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });

      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');

      // Handle multi-page if content is taller than A4
      const pageHeight = 297; // A4 height in mm
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

      pdf.save(`${data.fullName.replace(/\s+/g, '_')}_Resume.pdf`);
    } catch {
      // Fallback to print
      window.print();
    } finally {
      setExporting(false);
    }
  };

  if (isLoading) return <div className="mx-auto max-w-4xl"><ProfileSkeleton /></div>;
  if (isError || !data) return <div className="mx-auto max-w-4xl"><p>{t('profile.loadError')}</p></div>;

  return (
    <div className="mx-auto max-w-4xl">
      {/* Screen-only toolbar */}
      <div className="mb-4 print:hidden">
        <Breadcrumbs items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('resume.heading') },
        ]} />
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-heading text-2xl font-bold text-navy">{t('resume.heading')}</h1>
          <div className="flex gap-2">
            <Button onClick={onExportPdf} disabled={exporting}>
              <Download className="mr-2 h-4 w-4" />
              {exporting ? t('common:actions.loading') : t('resume.downloadPdf')}
            </Button>
            <Button variant="outline" onClick={onPrint}>
              <Printer className="mr-2 h-4 w-4" />
              {t('resume.printButton')}
            </Button>
          </div>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{t('resume.hint')}</p>
      </div>

      {/* Printable resume */}
      <div
        ref={printRef}
        className="resume-print rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8 print:border-none print:p-0 print:shadow-none dark:border-gray-700 dark:bg-gray-800 print:dark:bg-white print:dark:text-black"
      >
        {/* Header */}
        <div className="border-b-2 border-primary pb-5">
          <h1 className="text-2xl font-bold text-navy sm:text-3xl print:text-black">{data.fullName}</h1>
          <p className="mt-1 text-lg text-primary">{data.designation}</p>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600 print:text-gray-700 dark:text-gray-300">
            {data.email && <span>{'\u2709'} {data.email}</span>}
            {data.mobile && <span>{'\u260E'} {data.mobile}</span>}
            {data.city && <span>{'\uD83D\uDCCD'} {data.city}</span>}
            {data.totalExperience && <span>{'\uD83D\uDCBC'} {data.totalExperience} {t('resume.yearsExp')}</span>}
          </div>
        </div>

        {/* Skills */}
        {data.skills.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wider text-primary print:text-gray-800">
              {t('resume.skills')}
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((s) => (
                <span key={s} className="rounded bg-gray-100 px-2.5 py-0.5 text-sm text-gray-700 print:border print:border-gray-300 print:bg-transparent dark:bg-gray-700 dark:text-gray-300">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {data.experience.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary print:text-gray-800">
              {t('resume.experience')}
            </h2>
            <div className="space-y-4">
              {data.experience.map((e, i) => (
                <div key={i} className="border-l-2 border-gray-200 pl-4 print:border-gray-400 dark:border-gray-700">
                  <p className="font-semibold text-navy print:text-black">{e.designation}</p>
                  <p className="text-sm text-gray-600 print:text-gray-700 dark:text-gray-300">{e.company}</p>
                  <p className="text-xs text-gray-400 print:text-gray-500 dark:text-gray-500">{e.from} — {e.to}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {data.education.length > 0 && (
          <div className="mt-5">
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-primary print:text-gray-800">
              {t('resume.education')}
            </h2>
            <div className="space-y-3">
              {data.education.map((e, i) => (
                <div key={i} className="border-l-2 border-gray-200 pl-4 print:border-gray-400 dark:border-gray-700">
                  <p className="font-semibold text-navy print:text-black">{e.degree}</p>
                  {e.institute && <p className="text-sm text-gray-600 print:text-gray-700 dark:text-gray-300">{e.institute}</p>}
                  {e.year && <p className="text-xs text-gray-400 print:text-gray-500 dark:text-gray-500">{e.year}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 border-t border-gray-200 pt-3 text-center text-xs text-gray-400 print:border-gray-300 print:text-gray-500 dark:border-gray-700 dark:text-gray-500">
          {t('resume.generatedBy')}
        </div>
      </div>
    </div>
  );
}
