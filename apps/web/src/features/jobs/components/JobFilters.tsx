import { useMemo } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useJobFilters } from '../jobs.api';

const EXP_RANGES = [
  { label: 'anyExperience', min: undefined, max: undefined },
  { label: 'fresher', min: 0, max: 0 },
  { label: '1–3 yrs', min: 1, max: 3 },
  { label: '3–5 yrs', min: 3, max: 5 },
  { label: '5–10 yrs', min: 5, max: 10 },
  { label: '10+ yrs', min: 10, max: undefined },
] as const;

const SALARY_STEPS = [0, 100_000, 200_000, 300_000, 500_000, 800_000, 1_200_000, 2_000_000, 3_000_000, 5_000_000];

export interface FilterValues {
  workMode: string;
  employmentType: string;
  minExp?: number;
  maxExp?: number;
  minCtc: number;
  sortBy: 'newest' | 'salary_high' | 'salary_low';
}

interface JobFiltersProps {
  open: boolean;
  onToggle: () => void;
  values: FilterValues;
  onChange: (next: FilterValues) => void;
}

export function JobFiltersPanel({ open, onToggle, values, onChange }: JobFiltersProps) {
  const { t } = useTranslation('jobs');
  const { data } = useJobFilters();

  const activeCount = useMemo(() => {
    let n = 0;
    if (values.workMode) n++;
    if (values.employmentType) n++;
    if (values.minExp != null || values.maxExp != null) n++;
    if (values.minCtc > 0) n++;
    if (values.sortBy !== 'newest') n++;
    return n;
  }, [values]);

  const set = <K extends keyof FilterValues>(key: K, val: FilterValues[K]) =>
    onChange({ ...values, [key]: val });

  const clearAll = () =>
    onChange({ workMode: '', employmentType: '', minExp: undefined, maxExp: undefined, minCtc: 0, sortBy: 'newest' });

  const salaryIndex = SALARY_STEPS.indexOf(values.minCtc) >= 0 ? SALARY_STEPS.indexOf(values.minCtc) : 0;
  const lpa = (v: number) => (v / 100_000).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="mt-6">
      {/* Toggle bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-navy transition hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700"
        >
          <SlidersHorizontal className="h-4 w-4" aria-hidden />
          {open ? t('search.hideFilters') : t('search.filters')}
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-white">{activeCount}</span>
          )}
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>

        {/* Sort dropdown — always visible */}
        <select
          value={values.sortBy}
          onChange={(e) => set('sortBy', e.target.value as FilterValues['sortBy'])}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-navy outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          aria-label={t('search.sortBy')}
        >
          <option value="newest">{t('search.sortNewest')}</option>
          <option value="salary_high">{t('search.sortSalaryHigh')}</option>
          <option value="salary_low">{t('search.sortSalaryLow')}</option>
        </select>

        {activeCount > 0 && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            {t('search.clearFilters')}
          </button>
        )}
      </div>

      {/* Collapsible panel */}
      {open && (
        <div className="mt-4 grid gap-5 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-gray-700 dark:bg-gray-800">
          {/* Experience */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('search.experience')}</h4>
            <div className="flex flex-wrap gap-2">
              {EXP_RANGES.map((r, i) => {
                const active = values.minExp === r.min && values.maxExp === r.max;
                const label = i === 0 ? t(`search.${r.label}`) : i === 1 ? t('search.fresher') : r.label;
                return (
                  <button
                    key={i}
                    onClick={() => onChange({ ...values, minExp: r.min as number | undefined, maxExp: r.max as number | undefined })}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      active
                        ? 'border-primary bg-primary text-white'
                        : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work Mode */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('search.workMode')}</h4>
            <div className="flex flex-wrap gap-2">
              {(data?.workModes ?? []).map((mode) => (
                <button
                  key={mode}
                  onClick={() => set('workMode', values.workMode === mode ? '' : mode)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    values.workMode === mode
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Employment Type */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('search.employmentType')}</h4>
            <div className="flex flex-wrap gap-2">
              {(data?.employmentTypes ?? []).map((type) => (
                <button
                  key={type}
                  onClick={() => set('employmentType', values.employmentType === type ? '' : type)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    values.employmentType === type
                      ? 'border-primary bg-primary text-white'
                      : 'border-gray-200 text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Salary Range */}
          <div>
            <h4 className="mb-2 text-sm font-semibold text-navy">{t('search.salary')}</h4>
            <input
              type="range"
              min={0}
              max={SALARY_STEPS.length - 1}
              value={salaryIndex}
              onChange={(e) => set('minCtc', SALARY_STEPS[Number(e.target.value)])}
              className="w-full accent-primary"
              aria-label={t('search.salary')}
            />
            <p className="mt-1 text-center text-xs text-gray-500 dark:text-gray-400">
              {values.minCtc === 0 ? t('search.anyExperience') : `≥ ${t('search.salaryLpa', { value: lpa(values.minCtc) })}`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
