import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import {
  useDeleteItSkill,
  useDeleteLanguage,
  useUpdateKeySkills,
  useUpsertItSkill,
  useUpsertLanguage,
} from '../../candidate.api';
import type { CvEditProfile, LanguageProficiency } from '../../candidate.types';
import { Btn, Chip, Field, Input, Select } from '../components/primitives';
import { AddAnother, DraftHeader, StepShell, type StepProps } from './StepShell';

const PROFICIENCIES: { id: LanguageProficiency; label: string }[] = [
  { id: 1, label: 'Beginner' },
  { id: 2, label: 'Proficient' },
  { id: 3, label: 'Expert' },
];

interface LangDraft {
  name: string;
  proficiencyId: string;
}

const emptyLangDraft = (): LangDraft => ({ name: '', proficiencyId: '2' });

interface ItSkillDraft {
  name: string;
  version: string;
  lastUsedYear: string;
}

const CURRENT_YEAR = new Date().getFullYear();
/** The range tblSubscriberITSkill accepts, newest first — nobody scrolls to 1950. */
const IT_SKILL_YEARS = Array.from({ length: 31 }, (_, i) => CURRENT_YEAR - i);

const emptyItSkillDraft = (): ItSkillDraft => ({ name: '', version: '', lastUsedYear: String(CURRENT_YEAR) });

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

  const [langDraft, setLangDraft] = useState<LangDraft | null>(null);
  const [itDraft, setItDraft] = useState<ItSkillDraft | null>(null);

  const saveSkills = useUpdateKeySkills();
  const saveLanguage = useUpsertLanguage();
  const removeLanguage = useDeleteLanguage();
  const saveItSkill = useUpsertItSkill();
  const removeItSkill = useDeleteItSkill();

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

  /** Persists the open language editor. Returns false when it could not be saved. */
  const saveLangDraft = async (): Promise<boolean> => {
    const name = langDraft?.name.trim();
    if (!name) return true;
    try {
      await saveLanguage.mutateAsync({
        languageName: name,
        proficiencyId: (Number(langDraft?.proficiencyId) || 2) as LanguageProficiency,
      });
      return true;
    } catch {
      setError('Could not save this language. Please try again.');
      return false;
    }
  };

  /** Commits what is on screen before clearing the editor, so nothing is silently lost. */
  const addAnotherLanguage = async () => {
    setError(null);
    if (await saveLangDraft()) setLangDraft(emptyLangDraft());
  };

  /** Persists the open IT-skill editor. Returns false when it could not be saved. */
  const saveItDraft = async (): Promise<boolean> => {
    const name = itDraft?.name.trim();
    if (!name) return true;
    try {
      await saveItSkill.mutateAsync({
        skillName: name,
        version: itDraft?.version.trim() || undefined,
        lastUsedYear: Number(itDraft?.lastUsedYear) || undefined,
      });
      return true;
    } catch {
      setError('Could not save this IT skill. Please try again.');
      return false;
    }
  };

  const addAnotherItSkill = async () => {
    setError(null);
    if (await saveItDraft()) setItDraft(emptyItSkillDraft());
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
    } catch {
      setError('Could not save your skills. Please try again.');
      return;
    }

    if (!(await saveItDraft())) return;
    if (await saveLangDraft()) onNext();
  };

  return (
    <StepShell
      number={stepIndex + 1}
      title="Skills"
      blurb="Technical skills & languages"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={saveSkills.isPending || saveLanguage.isPending || saveItSkill.isPending}
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

      {/* IT skills are a separate table from the key-skill chips above: each row carries a
          version and the year it was last used, which is what recruiters filter on. */}
      <div className="mt-6 border-t border-aj-line-soft pt-5 dark:border-gray-700">
        <h3 className="mb-3 font-display text-sm font-bold text-slate-800 dark:text-gray-100">IT Skills</h3>

        {cv.itSkills.length > 0 && (
          <div className="mb-3 space-y-2">
            {cv.itSkills.map((it) => (
              <div
                key={it.subscriberItSkillId}
                className="flex items-center justify-between gap-3 rounded-lg border border-aj-line bg-aj-surface-soft px-3.5 py-2.5 dark:border-gray-700 dark:bg-gray-900"
              >
                <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-gray-100">
                  {it.skillName}
                  {it.version && <span className="font-normal text-slate-500"> {it.version}</span>}
                </span>
                <div className="flex items-center gap-3">
                  {it.lastUsedYear && <span className="text-xs text-slate-500">Last used {it.lastUsedYear}</span>}
                  <button
                    type="button"
                    onClick={() => removeItSkill.mutate(it.subscriberItSkillId)}
                    disabled={removeItSkill.isPending}
                    aria-label={`Remove ${it.skillName}`}
                    className="text-slate-400 transition-colors hover:text-red-600 disabled:opacity-50"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {itDraft ? (
          <>
            {cv.itSkills.length > 0 && (
              <DraftHeader
                title="New IT skill"
                onClose={() => {
                  setError(null);
                  setItDraft(null);
                }}
              />
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Skill" htmlFor="itName">
                <Input
                  id="itName"
                  placeholder="e.g. PostgreSQL"
                  value={itDraft.name}
                  onChange={(e) => setItDraft({ ...itDraft, name: e.target.value })}
                />
              </Field>
              <Field label="Version" htmlFor="itVersion">
                <Input
                  id="itVersion"
                  placeholder="e.g. 16"
                  value={itDraft.version}
                  onChange={(e) => setItDraft({ ...itDraft, version: e.target.value })}
                />
              </Field>
              <Field label="Last Used" htmlFor="itYear">
                <Select
                  id="itYear"
                  value={itDraft.lastUsedYear}
                  onChange={(e) => setItDraft({ ...itDraft, lastUsedYear: e.target.value })}
                >
                  {IT_SKILL_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            <div className="mt-3">
              <AddAnother label="Add another IT skill" onClick={addAnotherItSkill} />
            </div>
          </>
        ) : (
          <AddAnother label="Add IT skill" onClick={() => setItDraft(emptyItSkillDraft())} />
        )}
      </div>

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
          <>
            {cv.languages.length > 0 && (
              <DraftHeader
                title="New language"
                onClose={() => {
                  setError(null);
                  setLangDraft(null);
                }}
              />
            )}

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

            <div className="mt-3">
              <AddAnother label="Add another language" onClick={addAnotherLanguage} />
            </div>
          </>
        ) : (
          <AddAnother label="Add language" onClick={() => setLangDraft(emptyLangDraft())} />
        )}
      </div>
    </StepShell>
  );
}
