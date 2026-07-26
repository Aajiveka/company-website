import { useMemo } from 'react';
import { ChevronDown, ChevronUp, SlidersHorizontal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RangeSlider, MultiSelect } from '@/components/ui';
import type { MultiSelectOption } from '@/components/ui';
import { useJobFilters } from '../jobs.api';

const POSTED_WITHIN_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Any time', value: '' },
  { label: 'Today (24h)', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
];

const SALARY_MIN = 0;
const SALARY_MAX = 5_000_000;
const SALARY_STEP = 50_000;

const EXP_MIN = 0;
const EXP_MAX = 30;

export interface FilterValues {
  workMode: string;
  employmentType: string;
  industry: string;
  minExp?: number;
  maxExp?: number;
  minCtc: number;
  maxCtc: number;
  sortBy: 'newest' | 'salary_high' | 'salary_low' | 'relevance';
  workModes: string[];
  employmentTypes: string[];
  locationsList: string[];
  skills: string[];
  postedWithin: '' | '24h' | '7d' | '30d';
}

// eslint-disable-next-line react-refresh/only-export-components
export const DEFAULT_FILTERS: FilterValues = {
  workMode: '',
  employmentType: '',
  industry: '',
  minExp: undefined,
  maxExp: undefined,
  minCtc: 0,
  maxCtc: SALARY_MAX,
  sortBy: 'newest',
  workModes: [],
  employmentTypes: [],
  locationsList: [],
  skills: [],
  postedWithin: '',
};

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
    if (values.workModes.length > 0) n++;
    if (values.employmentTypes.length > 0) n++;
    if (values.industry) n++;
    if (values.minExp != null && values.minExp > 0) n++;
    if (values.maxExp != null && values.maxExp < EXP_MAX) n++;
    if (values.minCtc > 0 || values.maxCtc < SALARY_MAX) n++;
    if (values.locationsList.length > 0) n++;
    if (values.skills.length > 0) n++;
    if (values.postedWithin) n++;
    if (values.sortBy !== 'newest') n++;
    // Legacy single-value backward compat
    if (values.workMode) n++;
    if (values.employmentType) n++;
    return n;
  }, [values]);

  const set = <K extends keyof FilterValues>(key: K, val: FilterValues[K]) =>
    onChange({ ...values, [key]: val });

  const clearAll = () => onChange({ ...DEFAULT_FILTERS });

  const lpa = (v: number) => {
    const l = v / 100_000;
    return l >= 100 ? `${(l / 10).toFixed(0)} Cr` : `${l.toFixed(1).replace(/\.0$/, '')} L`;
  };

  const workModeOptions: MultiSelectOption[] = useMemo(
    () => (data?.workModes ?? []).map((m) => ({ label: m, value: m })),
    [data?.workModes],
  );

  const empTypeOptions: MultiSelectOption[] = useMemo(
    () => (data?.employmentTypes ?? []).map((t) => ({ label: t, value: t })),
    [data?.employmentTypes],
  );

  const locationOptions: MultiSelectOption[] = useMemo(
    () => (data?.locations ?? []).map((l) => ({ label: l, value: l })),
    [data?.locations],
  );

  const skillOptions: MultiSelectOption[] = useMemo(
    () => (data?.skills ?? []).map((s) => ({ label: s, value: s })),
    [data?.skills],
  );

  return (
    <div className="mt-6">
      {/* Toggle bar */}
      <div className="flex flex-wrap items-center gap-3">
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

        {/* Sort dropdown -- always visible */}
        <select
          value={values.sortBy}
          onChange={(e) => set('sortBy', e.target.value as FilterValues['sortBy'])}
          className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-navy outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
          aria-label={t('search.sortBy')}
        >
          <option value="newest">{t('search.sortNewest')}</option>
          <option value="salary_high">{t('search.sortSalaryHigh')}</option>
          <option value="salary_low">{t('search.sortSalaryLow')}</option>
          <option value="relevance">Relevance</option>
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

      {/* Collapsible panel -- slide-out on mobile */}
      {open && (
        <>
          {/* Mobile overlay */}
          <div
            className="fixed inset-0 z-40 bg-black/30 lg:hidden"
            onClick={onToggle}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-80 overflow-y-auto bg-white p-5 shadow-xl lg:relative lg:inset-auto lg:z-auto lg:mt-4 lg:w-full lg:rounded-xl lg:border lg:border-gray-200 lg:p-4 lg:shadow-none dark:bg-gray-800 dark:lg:border-gray-700">
            {/* Mobile close */}
            <div className="mb-4 flex items-center justify-between lg:hidden">
              <h3 className="text-lg font-semibold text-navy dark:text-white">Filters</h3>
              <button onClick={onToggle} className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* Salary Range */}
              <div className="sm:col-span-2 lg:col-span-1">
                <RangeSlider
                  label={t('search.salary')}
                  min={SALARY_MIN}
                  max={SALARY_MAX}
                  step={SALARY_STEP}
                  value={[values.minCtc, values.maxCtc]}
                  onChange={([lo, hi]) => onChange({ ...values, minCtc: lo, maxCtc: hi })}
                  formatValue={(v) => `\u20B9${lpa(v)}`}
                />
              </div>

              {/* Experience Range */}
              <div>
                <RangeSlider
                  label={t('search.experience')}
                  min={EXP_MIN}
                  max={EXP_MAX}
                  step={1}
                  value={[values.minExp ?? EXP_MIN, values.maxExp ?? EXP_MAX]}
                  onChange={([lo, hi]) => onChange({ ...values, minExp: lo, maxExp: hi })}
                  formatValue={(v) => `${v} yr${v !== 1 ? 's' : ''}`}
                />
              </div>

              {/* Work Mode MultiSelect */}
              <div>
                <MultiSelect
                  label={t('search.workMode')}
                  options={workModeOptions}
                  value={values.workModes}
                  onChange={(v) => set('workModes', v)}
                  placeholder="All work modes"
                />
              </div>

              {/* Employment Type MultiSelect */}
              <div>
                <MultiSelect
                  label={t('search.employmentType')}
                  options={empTypeOptions}
                  value={values.employmentTypes}
                  onChange={(v) => set('employmentTypes', v)}
                  placeholder="All types"
                />
              </div>

              {/* Posted Within */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Posted within
                </label>
                <select
                  value={values.postedWithin}
                  onChange={(e) => set('postedWithin', e.target.value as FilterValues['postedWithin'])}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  {POSTED_WITHIN_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Location MultiSelect */}
              <div>
                <MultiSelect
                  label="Cities"
                  options={locationOptions}
                  value={values.locationsList}
                  onChange={(v) => set('locationsList', v)}
                  placeholder="All cities"
                />
              </div>

              {/* Skills MultiSelect */}
              <div>
                <MultiSelect
                  label="Skills"
                  options={skillOptions}
                  value={values.skills}
                  onChange={(v) => set('skills', v)}
                  placeholder="All skills"
                />
              </div>

              {/* Industry */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('search.industry')}
                </label>
                <select
                  value={values.industry}
                  onChange={(e) => set('industry', e.target.value)}
                  className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
                >
                  <option value="">All industries</option>
                  {(data?.industries ?? []).map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Mobile apply button */}
            <div className="mt-5 flex gap-3 lg:hidden">
              <button
                onClick={clearAll}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-600 dark:border-gray-600 dark:text-gray-300"
              >
                Clear all
              </button>
              <button
                onClick={onToggle}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white"
              >
                Apply filters
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
