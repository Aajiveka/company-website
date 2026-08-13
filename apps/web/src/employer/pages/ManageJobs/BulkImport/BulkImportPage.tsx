import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, FileSpreadsheet, Upload, Send } from 'lucide-react';
import {
  EmployerBadge,
  PageHeader,
  PrimaryButton,
  SecondaryButton,
} from '@/employer/components/Cards/ui';
import {
  JOB_IMPORT_COLUMNS,
  downloadJobImportTemplate,
} from '@/employer/constants/jobFields';
import { employerPaths } from '@/employer/constants/paths';
import { useUploadBulkJobs } from '@/employer/services/employer.api';
import type { BulkUploadResult } from '@/employer/services/employer.types';

const STEPS = ['Download Template', 'Upload', 'Validation', 'Preview', 'Publish'] as const;

const requiredColumns = JOB_IMPORT_COLUMNS.filter((c) => c.required);
const optionalColumns = JOB_IMPORT_COLUMNS.filter((c) => !c.required);

export function BulkImportPage() {
  const upload = useUploadBulkJobs();
  const [step, setStep] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const goNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const runUpload = async (file: File) => {
    setError(null);
    setFileName(file.name);
    setProgress(0);
    setResult(null);
    setStep(1);
    try {
      const data = await upload.mutateAsync({
        file,
        onProgress: (pct) => setProgress(pct),
      });
      setProgress(100);
      setResult(data);
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
      setProgress(0);
    }
  };

  const previewRows = result?.preview ?? [];
  const validCount = result?.imported ?? 0;
  const errorCount = result?.skipped ?? previewRows.filter((r) => r.status === 'Error').length;

  return (
    <div>
      <PageHeader
        title="Bulk Import Jobs"
        subtitle="Template columns match Post a New Job. Names must match master data (Position, City, Skills, …)."
      />

      <ol className="mb-3 flex flex-wrap gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li
              key={label}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium ${
                current
                  ? 'bg-[#1A56DB] text-white'
                  : done
                    ? 'bg-[#EBF2FF] text-[#1A56DB]'
                    : 'border border-slate-200 bg-white text-slate-500'
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] ${
                  current ? 'bg-white/20' : done ? 'bg-[#1A56DB] text-white' : 'bg-slate-100'
                }`}
              >
                {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
              </span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        {step === 0 && (
          <div className="py-6">
            <div className="text-center">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-[#1A56DB]" />
              <h3 className="mt-2 text-xs font-semibold text-slate-800">Step 1 — Download Template</h3>
              <p className="mx-auto mt-1 max-w-xl text-xs text-slate-500">
                CSV columns mirror Post a New Job. Use pipe <code className="rounded bg-slate-100 px-1">|</code> to
                separate interview rounds/processes. Master names must match exactly (e.g. Software Developer,
                Gurugram, Full Time).
              </p>
            </div>

            <div className="mx-auto mt-4 grid max-w-3xl gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Required</p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-slate-700">
                  {requiredColumns.map((c) => (
                    <li key={c.key}>
                      {c.label}
                      <span className="text-rose-600">*</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3 text-left">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Optional</p>
                <ul className="mt-1.5 space-y-0.5 text-xs text-slate-700">
                  {optionalColumns.map((c) => (
                    <li key={c.key}>{c.label}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <SecondaryButton onClick={() => downloadJobImportTemplate('csv')}>
                <Download className="h-4 w-4" />
                Download CSV
              </SecondaryButton>
              <SecondaryButton onClick={() => downloadJobImportTemplate('xlsx-hint')}>
                <Download className="h-4 w-4" />
                Download Excel
              </SecondaryButton>
              <PrimaryButton onClick={goNext}>Continue to Upload</PrimaryButton>
            </div>
          </div>
        )}

        {step === 1 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Step 2 — Upload File</h3>
            <p className="mt-0.5 text-[11px] text-slate-500">
              File must include the same headers as the template. Valid rows are imported immediately.
            </p>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files?.[0];
                if (f) void runUpload(f);
              }}
              className={`mt-3 flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-8 transition ${
                dragging ? 'border-[#1A56DB] bg-[#EBF2FF]' : 'border-slate-200 bg-slate-50/50'
              }`}
            >
              <Upload className="h-8 w-8 text-[#1A56DB]" />
              <p className="mt-2 text-xs font-medium text-slate-700">Drag & drop your file here</p>
              <p className="mt-0.5 text-[11px] text-slate-400">CSV up to 5 MB</p>
              <label className="mt-3 cursor-pointer">
                <span className="inline-flex h-8 items-center justify-center gap-2 rounded-lg bg-[#1A56DB] px-3 text-xs font-medium text-white shadow-sm hover:bg-[#1648b8]">
                  Browse files
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void runUpload(f);
                  }}
                />
              </label>
            </div>
            {fileName && (
              <div className="mt-3">
                <p className="text-xs text-slate-600">
                  Uploading <span className="font-medium">{fileName}</span>…
                </p>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-[#1A56DB] transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{progress}%</p>
              </div>
            )}
            {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
            <div className="mt-3 flex justify-between">
              <SecondaryButton onClick={goBack}>Back</SecondaryButton>
            </div>
          </div>
        )}

        {step === 2 && result && (
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Step 3 — Validation</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Imported {validCount} job(s). {errorCount} row(s) skipped.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg bg-emerald-50 px-3 py-2">
                <p className="text-[11px] text-emerald-700">Imported</p>
                <p className="text-lg font-semibold text-emerald-800">{validCount}</p>
              </div>
              <div className="rounded-lg bg-rose-50 px-3 py-2">
                <p className="text-[11px] text-rose-700">Errors</p>
                <p className="text-lg font-semibold text-rose-800">{errorCount}</p>
              </div>
              <div className="rounded-lg bg-[#EBF2FF] px-3 py-2">
                <p className="text-[11px] text-[#1A56DB]">Total rows</p>
                <p className="text-lg font-semibold text-[#1A56DB]">{previewRows.length}</p>
              </div>
            </div>
            <ul className="mt-3 max-h-40 space-y-1.5 overflow-y-auto text-xs">
              {(result.errors ?? []).map((r) => (
                <li key={`${r.row}-${r.reason}`} className="rounded-lg border border-rose-100 bg-rose-50/50 px-2.5 py-1.5 text-rose-700">
                  Row {r.row}: {r.reason}
                </li>
              ))}
              {!result.errors?.length && (
                <li className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-2.5 py-1.5 text-emerald-700">
                  All rows imported successfully.
                </li>
              )}
            </ul>
            <div className="mt-3 flex justify-between">
              <SecondaryButton onClick={goBack}>Back</SecondaryButton>
              <PrimaryButton onClick={goNext}>Continue to Preview</PrimaryButton>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h3 className="text-xs font-semibold text-slate-800">Step 4 — Preview</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-3 py-1.5">Position</th>
                    <th className="whitespace-nowrap px-3 py-1.5">Employment type</th>
                    <th className="whitespace-nowrap px-3 py-1.5">Experience</th>
                    <th className="whitespace-nowrap px-3 py-1.5">Work mode</th>
                    <th className="whitespace-nowrap px-3 py-1.5">CTC</th>
                    <th className="whitespace-nowrap px-3 py-1.5">Department</th>
                    <th className="whitespace-nowrap px-3 py-1.5">Location</th>
                    <th className="whitespace-nowrap px-3 py-1.5">Skills</th>
                    <th className="whitespace-nowrap px-3 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {previewRows.map((r) => (
                    <tr key={r.row}>
                      <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-800">{r.position || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.employmentType || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.experience || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.workMode || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                        {r.ctcMin != null || r.ctcMax != null ? `${r.ctcMin ?? '—'}–${r.ctcMax ?? '—'}` : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.department || '—'}</td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-600">{r.location || '—'}</td>
                      <td className="max-w-[10rem] truncate px-3 py-2 text-slate-600" title={r.skills}>
                        {r.skills || '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <EmployerBadge tone={r.status === 'Valid' ? 'success' : 'danger'}>{r.status}</EmployerBadge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 flex justify-between">
              <SecondaryButton onClick={goBack}>Back</SecondaryButton>
              <PrimaryButton onClick={goNext}>Done</PrimaryButton>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-[#EBF2FF] text-[#1A56DB]">
              <Send className="h-5 w-5" />
            </div>
            <h3 className="mt-2 text-xs font-semibold text-slate-800">Step 5 — Complete</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {validCount} job(s) were imported as Active postings.
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <SecondaryButton
                onClick={() => {
                  setStep(0);
                  setFileName(null);
                  setProgress(0);
                  setResult(null);
                  setError(null);
                }}
              >
                Import more
              </SecondaryButton>
              <Link to={employerPaths.jobList}>
                <PrimaryButton>View Manage Jobs</PrimaryButton>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
