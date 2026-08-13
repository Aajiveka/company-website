import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useDeleteLanguage, useUpdateKeySkills, useUpsertLanguage } from '../../candidate.api';
import type { CvEditProfile, LanguageProficiency } from '../../candidate.types';
import { Btn, Chip, Field, Input, Select } from '../components/primitives';
import { AddAnother, StepShell, type StepProps } from './StepShell';

const PROFICIENCIES: { id: LanguageProficiency; label: string }[] = [
  { id: 1, label: 'Beginner' },
  { id: 2, label: 'Proficient' },
  { id: 3, label: 'Expert' },
];

/** Step 5 — Skills & languages (Figma 7:4501). */
export function SkillsStep({
  cv,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { cv: CvEditProfile }) {
  const [skills, setSkills] = useState<string[]>(cv.professional?.tagNames ?? []);
  const [entry, setEntry] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [langDraft, setLangDraft] = useState<{ name: string; proficiencyId: string } | null>(null);

  const saveSkills = useUpdateKeySkills();
  const saveLanguage = useUpsertLanguage();
  const removeLanguage = useDeleteLanguage();

  const addSkill = () => {
    const value = entry.trim();
    if (!value) return;
    if (skills.some((s) => s.toLowerCase() === value.toLowerCase())) {
      setEntry('');
      return;
    }
    setSkills((prev) => [...prev, value]);
    setEntry('');
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // A skill typed but not yet committed with Enter should still count.
    const pending = entry.trim();
    const finalSkills =
      pending && !skills.some((s) => s.toLowerCase() === pending.toLowerCase()) ? [...skills, pending] : skills;

    try {
      const changed =
        finalSkills.length !== (cv.professional?.tagNames.length ?? 0) ||
        finalSkills.some((s, i) => s !== cv.professional?.tagNames[i]);
      if (changed) await saveSkills.mutateAsync({ tagNames: finalSkills });

      if (langDraft?.name.trim()) {
        await saveLanguage.mutateAsync({
          languageName: langDraft.name.trim(),
          proficiencyId: (Number(langDraft.proficiencyId) || 2) as LanguageProficiency,
        });
      }
      onNext();
    } catch {
      setError('Could not save your skills. Please try again.');
    }
  };

  return (
    <StepShell
      number={5}
      title="Skills"
      blurb="Technical skills & languages"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={saveSkills.isPending || saveLanguage.isPending}
      error={error}
    >
      <Field label="Skills" htmlFor="skill">
        <div className="flex gap-2">
          <Input
            id="skill"
            value={entry}
            placeholder="Type a skill and press Enter"
            onChange={(e) => setEntry(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                // Enter inside the wizard form would otherwise submit the step.
                e.preventDefault();
                addSkill();
              }
            }}
          />
          <Btn variant="secondary" onClick={addSkill} disabled={!entry.trim()}>
            Add
          </Btn>
        </div>
      </Field>

      {skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {skills.map((s) => (
            <Chip key={s} label={s} onRemove={() => setSkills((prev) => prev.filter((x) => x !== s))} />
          ))}
        </div>
      )}

      <div className="mt-6 border-t border-aj-line-soft pt-5 dark:border-gray-700">
        <h3 className="mb-3 font-display text-sm font-bold text-slate-800 dark:text-gray-100">Languages</h3>

        {cv.languages.length > 0 && (
          <div className="mb-3 space-y-2">
            {cv.languages.map((l) => (
              <div
                key={l.subscriberLanguageId}
                className="flex items-center justify-between gap-3 rounded-lg border border-aj-line bg-aj-surface-soft px-3.5 py-2.5 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">
                  {l.languageName}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">
                    {PROFICIENCIES.find((p) => p.id === l.proficiencyId)?.label ?? '—'}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLanguage.mutate(l.subscriberLanguageId)}
                    disabled={removeLanguage.isPending}
                    aria-label={`Remove ${l.languageName}`}
                    className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {langDraft ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Language" htmlFor="langName">
              <Input
                id="langName"
                placeholder="e.g. Hindi"
                value={langDraft.name}
                onChange={(e) => setLangDraft({ ...langDraft, name: e.target.value })}
              />
            </Field>
            <Field label="Proficiency" htmlFor="langProf">
              <Select
                id="langProf"
                value={langDraft.proficiencyId}
                onChange={(e) => setLangDraft({ ...langDraft, proficiencyId: e.target.value })}
              >
                {PROFICIENCIES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <AddAnother label="Add language" onClick={() => setLangDraft({ name: '', proficiencyId: '2' })} />
        )}
      </div>
    </StepShell>
  );
}
