import { useState } from 'react';
import { useUpdateSummary } from '../../candidate.api';
import type { CvEditProfile } from '../../candidate.types';
import { Field, Textarea } from '../components/primitives';
import { StepShell, type StepProps } from './StepShell';

const MAX = 600;

/** Step 2 — Profile Summary (Figma 7:3977). */
export function SummaryStep({
  cv,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { cv: CvEditProfile }) {
  const [value, setValue] = useState(cv.summary ?? '');
  const [error, setError] = useState<string | null>(null);
  const save = useUpdateSummary();

  const tooLong = value.length > MAX;

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (tooLong) return;
    setError(null);
    try {
      if (value !== (cv.summary ?? '')) await save.mutateAsync({ profileSummary: value });
      onNext();
    } catch {
      setError('Could not save your summary. Please try again.');
    }
  };

  return (
    <StepShell
      number={2}
      title="Profile Summary"
      blurb="Your professional bio"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={save.isPending}
      error={error}
    >
      <Field
        label="Professional Summary"
        htmlFor="summary"
        error={tooLong ? `Keep it under ${MAX} characters.` : undefined}
      >
        <Textarea
          id="summary"
          rows={6}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          invalid={tooLong}
          placeholder="Write 3–5 sentences about your background, key skills, and career goals. Recruiters read this first."
        />
      </Field>
      <p className={`mt-1.5 text-right text-xs ${tooLong ? 'text-red-600' : 'text-slate-400'}`}>
        {value.length}/{MAX} characters
      </p>
    </StepShell>
  );
}
