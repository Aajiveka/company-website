import { useRef, useState } from 'react';
import { FileText, UploadCloud } from 'lucide-react';
import { isAxiosError } from 'axios';
import { cn } from '@/lib/cn';
import { useUploadResume } from '../../candidate.api';
import type { CandidateProfile } from '../../candidate.types';
import { longDate } from '../format';
import { StepShell, type StepProps } from './StepShell';

const MAX_BYTES = 5 * 1024 * 1024;

/** Step 8 — Resume upload (Figma 7:4838 / container 1:1991). */
export function ResumeStep({
  profile,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { profile: CandidateProfile | undefined }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useUploadResume();

  const accept = (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF files are accepted.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 5 MB.');
      return;
    }

    setProgress(0);
    upload.mutate(
      { file, onProgress: setProgress },
      {
        onSuccess: () => setProgress(null),
        onError: (err) => {
          setProgress(null);
          setError(
            isAxiosError(err) && err.response?.status === 413
              ? 'That file is too large for the server.'
              : 'Upload failed. Please try again.',
          );
        },
      },
    );
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onNext();
  };

  return (
    <StepShell
      number={8}
      title="Resume"
      blurb="Upload your latest CV"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={upload.isPending}
      error={error}
    >
      <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-gray-300">
        Upload Resume (PDF) <span className="text-red-600">*</span>
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
          accept(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          'rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors',
          dragging ? 'border-aj-blue bg-blue-50 dark:bg-blue-950' : 'border-aj-line bg-aj-surface-soft dark:bg-gray-900',
        )}
      >
        <UploadCloud className="mx-auto size-8 text-aj-blue" aria-hidden />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 block w-full text-sm font-semibold text-slate-700 hover:text-aj-blue dark:text-gray-200"
        >
          Drop your resume here or click to upload
        </button>
        <p className="mt-1 text-xs text-slate-400">PDF only · Max 5 MB</p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            accept(file);
          }}
        />

        {progress != null && (
          <div
            className="mx-auto mt-4 h-1.5 max-w-xs overflow-hidden rounded-full bg-aj-line"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-aj-blue transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      {profile?.resumeUrl && progress == null && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-aj-line bg-white px-3.5 py-3 dark:border-gray-700 dark:bg-gray-800">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-aj-blue text-white">
            <FileText className="size-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">
              {profile.resumeFileName ?? 'Resume.pdf'}
            </p>
            <p className="truncate text-xs text-slate-500">
              {longDate(profile.resumeUploadedAt) ? `Updated ${longDate(profile.resumeUploadedAt)}` : 'Uploaded'}
            </p>
          </div>
        </div>
      )}
    </StepShell>
  );
}
