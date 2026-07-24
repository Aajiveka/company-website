import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Scale, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCompareStore } from '../compare.store';

const lpa = (rupees: number) => (rupees / 100_000).toFixed(1).replace(/\.0$/, '');

function CompareRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-700">
      <td className="whitespace-nowrap py-3 pr-4 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </td>
      {children}
    </tr>
  );
}

/** Full-screen comparison modal for 2–3 jobs. */
export function CompareModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation('jobs');
  const { jobs, remove, clear } = useCompareStore();

  if (jobs.length < 2) return null;

  const maxSalary = Math.max(...jobs.map((j) => j.maxCtc));
  const minExp = Math.min(...jobs.map((j) => j.minExp));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm">
      <div className="mt-8 w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl dark:bg-gray-800 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-navy sm:text-xl">
            <Scale className="h-5 w-5 text-primary" />
            {t('compare.title')}
          </h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-200 dark:border-gray-600">
                <th className="py-3 pr-4 text-left text-sm font-medium text-gray-400">{t('compare.attribute')}</th>
                {jobs.map((job) => (
                  <th key={job.jobId} className="px-3 py-3 text-left">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/jobs/${job.jobId}`} className="font-semibold text-primary hover:underline">
                        {job.designation}
                      </Link>
                      <button
                        onClick={() => remove(job.jobId)}
                        className="rounded p-1 text-gray-400 hover:text-red-500"
                        aria-label={t('compare.removeJob')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <CompareRow label={t('compare.company')}>
                {jobs.map((j) => (
                  <td key={j.jobId} className="px-3 py-3 text-sm text-navy">{j.company}</td>
                ))}
              </CompareRow>
              <CompareRow label={t('compare.location')}>
                {jobs.map((j) => (
                  <td key={j.jobId} className="px-3 py-3 text-sm text-navy">{j.city}</td>
                ))}
              </CompareRow>
              <CompareRow label={t('compare.industry')}>
                {jobs.map((j) => (
                  <td key={j.jobId} className="px-3 py-3 text-sm text-navy">{j.industry}</td>
                ))}
              </CompareRow>
              <CompareRow label={t('compare.workMode')}>
                {jobs.map((j) => (
                  <td key={j.jobId} className="px-3 py-3 text-sm text-navy">{j.workMode}</td>
                ))}
              </CompareRow>
              <CompareRow label={t('compare.type')}>
                {jobs.map((j) => (
                  <td key={j.jobId} className="px-3 py-3 text-sm text-navy">{j.employmentType}</td>
                ))}
              </CompareRow>
              <CompareRow label={t('compare.experience')}>
                {jobs.map((j) => (
                  <td
                    key={j.jobId}
                    className={cn('px-3 py-3 text-sm', j.minExp === minExp ? 'font-semibold text-green-600' : 'text-navy')}
                  >
                    {j.minExp === 0 ? t('search.fresher') : `${j.minExp}+ ${t('search.yrs')}`}
                  </td>
                ))}
              </CompareRow>
              <CompareRow label={t('compare.salary')}>
                {jobs.map((j) => (
                  <td
                    key={j.jobId}
                    className={cn('px-3 py-3 text-sm', j.maxCtc === maxSalary ? 'font-semibold text-green-600' : 'text-navy')}
                  >
                    {lpa(j.minCtc)}–{lpa(j.maxCtc)} LPA
                  </td>
                ))}
              </CompareRow>
              <CompareRow label={t('compare.posted')}>
                {jobs.map((j) => (
                  <td key={j.jobId} className="px-3 py-3 text-sm text-navy">{j.postedOn}</td>
                ))}
              </CompareRow>
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => { clear(); onClose(); }}>
            {t('compare.clearAll')}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Floating bar at the bottom of the job search page. */
export function CompareBar() {
  const { t } = useTranslation('jobs');
  const { jobs, remove, clear } = useCompareStore();
  const [showModal, setShowModal] = useState(false);

  if (jobs.length === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-gray-800/95">
        <div className="container flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Scale className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-navy">
              {t('compare.comparing', { count: jobs.length })}
            </span>
            {jobs.map((job) => (
              <span
                key={job.jobId}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
              >
                {job.designation}
                <button onClick={() => remove(job.jobId)} className="hover:text-red-500" aria-label="Remove">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clear}>
              {t('compare.clearAll')}
            </Button>
            <Button size="sm" disabled={jobs.length < 2} onClick={() => setShowModal(true)}>
              <ArrowRight className="mr-1 h-3.5 w-3.5" />
              {t('compare.compareNow')}
            </Button>
          </div>
        </div>
      </div>

      {showModal && <CompareModal onClose={() => setShowModal(false)} />}
    </>
  );
}
