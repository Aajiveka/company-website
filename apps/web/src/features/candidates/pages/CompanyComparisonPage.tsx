import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Building2, Plus, Search, X } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, Input, Skeleton } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CompanySearchResult {
  id: number;
  name: string;
  industry: string;
  location: string;
}

interface CompanyDetail {
  id: number;
  name: string;
  industry: string;
  location: string;
  employeeCount: number;
  rating: number;
  openPositions: number;
  benefits: string[];
}

/* ------------------------------------------------------------------ */
/*  Hooks                                                              */
/* ------------------------------------------------------------------ */

function useCompanySearch(query: string) {
  return useQuery({
    queryKey: ['companies', 'search', query],
    queryFn: () =>
      api.get<CompanySearchResult[]>('/companies/search', { params: { q: query } }).then((r) => r.data),
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  });
}

function useCompanyDetail(id: number | null) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => api.get<CompanyDetail>(`/companies/${id}`).then((r) => r.data),
    enabled: id !== null,
  });
}

/* ------------------------------------------------------------------ */
/*  Company search input with API autocomplete                         */
/* ------------------------------------------------------------------ */

function CompanySearchInput({
  onSelect,
  disabled,
}: {
  onSelect: (company: CompanySearchResult) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const { data: results = [], isFetching } = useCompanySearch(query);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Scroll active into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const select = useCallback(
    (company: CompanySearchResult) => {
      onSelect(company);
      setQuery('');
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [onSelect],
  );

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && e.key === 'ArrowDown') {
      setIsOpen(true);
      return;
    }
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i < results.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) select(results[activeIndex]);
        break;
      case 'Escape':
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
        <Input
          placeholder={t('companyCompare.searchPlaceholder')}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className="pl-9"
          aria-label={t('companyCompare.searchPlaceholder')}
        />
      </div>

      {isOpen && (results.length > 0 || isFetching) && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
        >
          {isFetching && results.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-gray-400">{t('companyCompare.searching')}</li>
          ) : (
            results.map((c, i) => (
              <li
                key={c.id}
                role="option"
                aria-selected={i === activeIndex}
                className={cn(
                  'cursor-pointer px-3 py-2.5 text-sm transition',
                  i === activeIndex
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700',
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  select(c);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-gray-400">{c.industry}</span>
              </li>
            ))
          )}
        </ul>
      )}

      {isOpen && query.trim().length >= 2 && !isFetching && results.length === 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-400 shadow-lg dark:border-gray-600 dark:bg-gray-800 dark:text-gray-500">
          {t('companyCompare.noResults')}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison row component                                           */
/* ------------------------------------------------------------------ */

const ATTRIBUTES = [
  'name',
  'industry',
  'location',
  'employeeCount',
  'rating',
  'openPositions',
  'benefits',
] as const;

type Attribute = (typeof ATTRIBUTES)[number];

function renderCell(attr: Attribute, company: CompanyDetail) {
  switch (attr) {
    case 'name':
      return <span className="font-semibold text-navy dark:text-gray-100">{company.name}</span>;
    case 'industry':
      return <Badge tone="blue">{company.industry}</Badge>;
    case 'location':
      return company.location;
    case 'employeeCount':
      return company.employeeCount.toLocaleString();
    case 'rating':
      return (
        <span className="flex items-center gap-1">
          <span className="text-amber-500">{'★'.repeat(Math.round(company.rating))}</span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{company.rating.toFixed(1)}</span>
        </span>
      );
    case 'openPositions': {
      const tone: BadgeTone = company.openPositions > 10 ? 'green' : company.openPositions > 0 ? 'amber' : 'gray';
      return <Badge tone={tone}>{company.openPositions}</Badge>;
    }
    case 'benefits':
      return (
        <div className="flex flex-wrap gap-1">
          {company.benefits.map((b) => (
            <Badge key={b} tone="purple">{b}</Badge>
          ))}
        </div>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

const MAX_COMPANIES = 3;

export default function CompanyComparisonPage() {
  const { t } = useTranslation('dashboard');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const company0 = useCompanyDetail(selectedIds[0] ?? null);
  const company1 = useCompanyDetail(selectedIds[1] ?? null);
  const company2 = useCompanyDetail(selectedIds[2] ?? null);
  const queries = [company0, company1, company2];

  const companies = selectedIds
    .map((_, i) => queries[i]?.data)
    .filter((c): c is CompanyDetail => c !== undefined);

  const isLoading = selectedIds.some((_, i) => queries[i]?.isLoading);

  const handleSelect = (company: CompanySearchResult) => {
    if (selectedIds.includes(company.id)) return;
    if (selectedIds.length >= MAX_COMPANIES) return;
    setSelectedIds((prev) => [...prev, company.id]);
  };

  const handleRemove = (id: number) => {
    setSelectedIds((prev) => prev.filter((cid) => cid !== id));
  };

  return (
    <div className="mx-auto max-w-5xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('companyCompare.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy dark:text-gray-100">
        {t('companyCompare.heading')}
      </h1>

      {/* Search + selected chips */}
      <Card className="mb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <CompanySearchInput
            onSelect={handleSelect}
            disabled={selectedIds.length >= MAX_COMPANIES}
          />
          {selectedIds.length < MAX_COMPANIES && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <Plus className="mr-1 inline-block h-3.5 w-3.5" aria-hidden />
              {t('companyCompare.addUpTo', { count: MAX_COMPANIES - selectedIds.length })}
            </p>
          )}
        </div>

        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {selectedIds.map((id, i) => {
              const c = queries[i]?.data;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                  {c?.name ?? `#${id}`}
                  <button
                    onClick={() => handleRemove(id)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-primary/20"
                    aria-label={t('companyCompare.remove')}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
            {selectedIds.length > 1 && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds([])}>
                {t('companyCompare.clearAll')}
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Comparison table */}
      {selectedIds.length === 0 ? (
        <Card className="py-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden />
          <p className="text-gray-500 dark:text-gray-400">{t('companyCompare.emptyState')}</p>
        </Card>
      ) : isLoading ? (
        <Card>
          <div className="space-y-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-6 w-32" />
                {selectedIds.map((_, j) => (
                  <Skeleton key={j} className="h-6 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-gray-200 bg-brand-soft text-navy dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-200">
              <tr>
                <th className="px-4 py-3 font-semibold">{t('companyCompare.attribute')}</th>
                {companies.map((c) => (
                  <th key={c.id} className="px-4 py-3 font-semibold">{c.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ATTRIBUTES.map((attr) => (
                <tr
                  key={attr}
                  className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-medium text-navy dark:text-gray-200">
                    {t(`companyCompare.attrs.${attr}`)}
                  </td>
                  {companies.map((c) => (
                    <td key={c.id} className="px-4 py-3 text-gray-700 dark:text-gray-300">
                      {renderCell(attr, c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
