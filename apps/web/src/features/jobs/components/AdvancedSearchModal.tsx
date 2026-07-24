import { useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal } from '@/components/ui';
import { cn } from '@/lib/cn';

export interface AdvancedFilters {
  keywords: string[];
  excludeKeywords: string[];
  exactTitle: string;
  companies: string[];
  postedWithin: '24h' | '7d' | '30d' | 'all';
  salaryMin: number;
  salaryMax: number;
  experienceMin: number;
  experienceMax: number;
}

const EMPTY_FILTERS: AdvancedFilters = {
  keywords: [],
  excludeKeywords: [],
  exactTitle: '',
  companies: [],
  postedWithin: 'all',
  salaryMin: 0,
  salaryMax: 0,
  experienceMin: 0,
  experienceMax: 0,
};

interface AdvancedSearchModalProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: AdvancedFilters) => void;
  initialFilters?: AdvancedFilters;
}

type PostedWithin = AdvancedFilters['postedWithin'];

const POSTED_OPTIONS: { value: PostedWithin; labelKey: string }[] = [
  { value: '24h', labelKey: 'advancedSearch.last24h' },
  { value: '7d', labelKey: 'advancedSearch.last7d' },
  { value: '30d', labelKey: 'advancedSearch.last30d' },
  { value: 'all', labelKey: 'advancedSearch.anyTime' },
];

function TagInput({
  tags,
  onAdd,
  onRemove,
  placeholder,
}: {
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
  placeholder: string;
}) {
  const [value, setValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
      }
      setValue('');
    }
    if (e.key === 'Backspace' && !value && tags.length > 0) {
      onRemove(tags.length - 1);
    }
  };

  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 transition focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 dark:border-gray-600 dark:bg-gray-800">
      {tags.map((tag, i) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(i)}
            className="rounded-full p-0.5 transition hover:bg-primary/20"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400 dark:text-gray-100 dark:placeholder:text-gray-500"
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
      {children}
    </label>
  );
}

export function AdvancedSearchModal({ open, onClose, onApply, initialFilters }: AdvancedSearchModalProps) {
  const { t } = useTranslation('jobs');
  const [filters, setFilters] = useState<AdvancedFilters>(initialFilters ?? EMPTY_FILTERS);

  const update = <K extends keyof AdvancedFilters>(key: K, value: AdvancedFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const addTag = (key: 'keywords' | 'excludeKeywords' | 'companies', tag: string) => {
    setFilters((prev) => ({ ...prev, [key]: [...prev[key], tag] }));
  };

  const removeTag = (key: 'keywords' | 'excludeKeywords' | 'companies', index: number) => {
    setFilters((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== index) }));
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('advancedSearch.title')} className="max-w-lg">
      <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
        <div>
          <SectionLabel>{t('advancedSearch.keywords')}</SectionLabel>
          <TagInput
            tags={filters.keywords}
            onAdd={(tag) => addTag('keywords', tag)}
            onRemove={(i) => removeTag('keywords', i)}
            placeholder={t('advancedSearch.keywordsPlaceholder')}
          />
        </div>

        <div>
          <SectionLabel>{t('advancedSearch.excludeKeywords')}</SectionLabel>
          <TagInput
            tags={filters.excludeKeywords}
            onAdd={(tag) => addTag('excludeKeywords', tag)}
            onRemove={(i) => removeTag('excludeKeywords', i)}
            placeholder={t('advancedSearch.excludeKeywordsPlaceholder')}
          />
        </div>

        <div>
          <SectionLabel>{t('advancedSearch.exactTitle')}</SectionLabel>
          <Input
            value={filters.exactTitle}
            onChange={(e) => update('exactTitle', e.target.value)}
            placeholder={t('advancedSearch.exactTitlePlaceholder')}
          />
        </div>

        <div>
          <SectionLabel>{t('advancedSearch.companies')}</SectionLabel>
          <TagInput
            tags={filters.companies}
            onAdd={(tag) => addTag('companies', tag)}
            onRemove={(i) => removeTag('companies', i)}
            placeholder={t('advancedSearch.companiesPlaceholder')}
          />
        </div>

        <div>
          <SectionLabel>{t('advancedSearch.postedWithin')}</SectionLabel>
          <div className="flex flex-wrap gap-3">
            {POSTED_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="postedWithin"
                  value={opt.value}
                  checked={filters.postedWithin === opt.value}
                  onChange={() => update('postedWithin', opt.value)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-gray-700 dark:text-gray-300">{t(opt.labelKey)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>{t('advancedSearch.salaryRange')}</SectionLabel>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ₹
              </span>
              <input
                type="number"
                min={0}
                value={filters.salaryMin || ''}
                onChange={(e) => update('salaryMin', Number(e.target.value))}
                placeholder={t('advancedSearch.min')}
                className={cn(
                  'h-11 w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 text-sm outline-none transition',
                  'placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30',
                  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
                )}
              />
            </div>
            <span className="text-sm text-gray-400">—</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                ₹
              </span>
              <input
                type="number"
                min={0}
                value={filters.salaryMax || ''}
                onChange={(e) => update('salaryMax', Number(e.target.value))}
                placeholder={t('advancedSearch.max')}
                className={cn(
                  'h-11 w-full rounded-lg border border-gray-300 bg-white pl-7 pr-3 text-sm outline-none transition',
                  'placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/30',
                  'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-500',
                )}
              />
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>{t('advancedSearch.experience')}</SectionLabel>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min={0}
              value={filters.experienceMin || ''}
              onChange={(e) => update('experienceMin', Number(e.target.value))}
              placeholder={t('advancedSearch.minYears')}
            />
            <span className="text-sm text-gray-400">—</span>
            <Input
              type="number"
              min={0}
              value={filters.experienceMax || ''}
              onChange={(e) => update('experienceMax', Number(e.target.value))}
              placeholder={t('advancedSearch.maxYears')}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
        <Button variant="ghost" onClick={handleReset}>
          {t('advancedSearch.reset')}
        </Button>
        <Button onClick={handleApply}>
          {t('advancedSearch.apply')}
        </Button>
      </div>
    </Modal>
  );
}
