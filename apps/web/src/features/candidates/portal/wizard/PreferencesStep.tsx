import { useState } from 'react';
import { LocationMultiSelect } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useUpdateCareerProfile, useUpdateProfessional } from '../../candidate.api';
import { JOB_TYPES, WORK_MODES, type CvEditProfile, type CvMasters } from '../../candidate.types';
import { Field, Input, Select } from '../components/primitives';
import { FieldGrid, StepShell, type StepProps } from './StepShell';

const NOTICE_PERIODS = [0, 15, 30, 60, 90] as const;

/** Rupees ⇄ the lakh figure candidates actually type. */
const toLakh = (rupees: number | null | undefined) => (rupees ? String(rupees) : '');

/** Step 6 — Job Preferences (Figma 7:4662). */
export function PreferencesStep({
  cv,
  masters,
  onBack,
  onNext,
  isFirst,
  isLast,
  stepIndex,
  totalSteps,
}: StepProps & { cv: CvEditProfile; masters: CvMasters | undefined }) {
  const pro = cv.professional;
  const cp = cv.careerProfile;

  const [currentCtc, setCurrentCtc] = useState(toLakh(pro?.currentCtc));
  const [expectedCtc, setExpectedCtc] = useState(toLakh(cp.preferredSalary));
  const [workModes, setWorkModes] = useState<string[]>(cp.preferredWorkModes);
  const [notice, setNotice] = useState(pro?.noticePeriod != null ? String(pro.noticePeriod) : '');
  const [jobTypes, setJobTypes] = useState<string[]>(cp.desiredJobType);
  const [cityIds, setCityIds] = useState<number[]>(cp.preferredCityIds);
  const [relocate, setRelocate] = useState(!!pro?.flgReadyToRelocate);
  const [error, setError] = useState<string | null>(null);

  const saveCareer = useUpdateCareerProfile();
  const saveProfessional = useUpdateProfessional();

  const toggle = (list: string[], value: string, set: (next: string[]) => void) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    try {
      await saveCareer.mutateAsync({
        ...cp,
        preferredSalary: expectedCtc ? Number(expectedCtc) : null,
        preferredWorkModes: workModes,
        desiredJobType: jobTypes,
        preferredCityIds: cityIds,
      });

      await saveProfessional.mutateAsync({
        subFunctionId: pro?.subFunctionId ?? null,
        skillId: pro?.skillId ?? null,
        totalExp: pro?.totalExp ?? 0,
        currentCtc: currentCtc ? Number(currentCtc) : null,
        currentCityId: pro?.currentCityId ?? null,
        flgReadyToRelocate: relocate,
        noticePeriod: notice ? Number(notice) : null,
        industryTypeId: pro?.industryTypeId ?? null,
        preferredCityIds: cityIds,
        tagNames: pro?.tagNames ?? [],
      });

      onNext();
    } catch {
      setError('Could not save your preferences. Please try again.');
    }
  };

  return (
    <StepShell
      number={6}
      title="Job Preferences"
      blurb="What you are looking for"
      onSubmit={onSubmit}
      onBack={onBack}
      isFirst={isFirst}
      isLast={isLast}
      stepIndex={stepIndex}
      totalSteps={totalSteps}
      saving={saveCareer.isPending || saveProfessional.isPending}
      error={error}
    >
      <FieldGrid cols={2}>
        <Field label="Current CTC (₹ per year)" htmlFor="currentCtc">
          <Input
            id="currentCtc"
            inputMode="numeric"
            placeholder="e.g. 1500000"
            value={currentCtc}
            onChange={(e) => setCurrentCtc(e.target.value.replace(/\D/g, ''))}
          />
        </Field>

        <Field label="Expected CTC (₹ per year)" htmlFor="expectedCtc">
          <Input
            id="expectedCtc"
            inputMode="numeric"
            placeholder="e.g. 2000000"
            value={expectedCtc}
            onChange={(e) => setExpectedCtc(e.target.value.replace(/\D/g, ''))}
          />
        </Field>
      </FieldGrid>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-gray-300">
          Work Mode Preference (select all that apply)
        </legend>
        <div className="flex flex-wrap gap-2">
          {WORK_MODES.map((mode) => (
            <TogglePill
              key={mode}
              label={mode}
              selected={workModes.includes(mode)}
              onClick={() => toggle(workModes, mode, setWorkModes)}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4">
        <legend className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-gray-300">Job Type</legend>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map((type) => (
            <TogglePill
              key={type}
              label={type}
              selected={jobTypes.includes(type)}
              onClick={() => toggle(jobTypes, type, setJobTypes)}
            />
          ))}
        </div>
      </fieldset>

      <FieldGrid cols={2}>
        <Field label="Notice Period" htmlFor="notice" className="mt-4">
          <Select id="notice" value={notice} onChange={(e) => setNotice(e.target.value)}>
            <option value="">Select</option>
            {NOTICE_PERIODS.map((d) => (
              <option key={d} value={d}>
                {d === 0 ? 'Immediately available' : `${d} Days`}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Preferred Cities" className="mt-4">
          <LocationMultiSelect
            states={masters?.states}
            cities={masters?.cities}
            value={cityIds}
            onChange={setCityIds}
            placeholder="Add the cities you would work in"
          />
        </Field>
      </FieldGrid>

      <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
        <input
          type="checkbox"
          checked={relocate}
          onChange={(e) => setRelocate(e.target.checked)}
          className="size-4 rounded border-aj-line text-aj-blue focus:ring-aj-ring"
        />
        Open to relocation
      </label>
    </StepShell>
  );
}

function TogglePill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors',
        selected
          ? 'border-aj-blue bg-aj-blue text-white'
          : 'border-aj-line bg-white text-slate-600 hover:border-aj-blue hover:text-aj-blue dark:bg-gray-800 dark:text-gray-300',
      )}
    >
      {label}
    </button>
  );
}
