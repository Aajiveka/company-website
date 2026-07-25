import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GitCompareArrows, Users } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, Skeleton } from '@/components/ui';
import { cn } from '@/lib/cn';
import { api } from '@/lib/axios';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ShortlistedCandidate {
  id: number;
  name: string;
  designation: string;
  experience: number;
  education: string;
  skills: string[];
  currentCtc: number;
  expectedCtc: number;
  location: string;
  assessmentScore: number;
}

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

function useShortlistedCandidates() {
  return useQuery({
    queryKey: ['client', 'applicants', 'shortlisted'],
    queryFn: () =>
      api
        .get<ShortlistedCandidate[]>('/clients/me/applicants', { params: { status: 'shortlisted' } })
        .then((r) => r.data),
  });
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MAX_COMPARE = 4;

const ATTRIBUTES = [
  'name',
  'designation',
  'experience',
  'education',
  'skills',
  'currentCtc',
  'expectedCtc',
  'location',
  'assessmentScore',
] as const;

type Attribute = (typeof ATTRIBUTES)[number];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatCtc(val: number) {
  if (val >= 100_000) return `${(val / 100_000).toFixed(1).replace(/\.0$/, '')} LPA`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
  return val.toLocaleString();
}

/** Determine which candidate has the "best" value for a numeric attribute. */
function bestIndex(candidates: ShortlistedCandidate[], attr: Attribute): Set<number> {
  const set = new Set<number>();
  if (attr === 'experience' || attr === 'assessmentScore') {
    const max = Math.max(...candidates.map((c) => c[attr]));
    candidates.forEach((c, i) => {
      if (c[attr] === max) set.add(i);
    });
  }
  // Lower expected CTC is better for employer
  if (attr === 'expectedCtc') {
    const min = Math.min(...candidates.map((c) => c.expectedCtc));
    candidates.forEach((c, i) => {
      if (c.expectedCtc === min) set.add(i);
    });
  }
  return set;
}

function isHighlightable(attr: Attribute) {
  return attr === 'experience' || attr === 'assessmentScore' || attr === 'expectedCtc';
}

/* ------------------------------------------------------------------ */
/*  Cell renderer                                                      */
/* ------------------------------------------------------------------ */

function renderCell(attr: Attribute, candidate: ShortlistedCandidate) {
  switch (attr) {
    case 'name':
      return <span className="font-semibold text-navy dark:text-gray-100">{candidate.name}</span>;
    case 'designation':
      return candidate.designation;
    case 'experience':
      return `${candidate.experience} yr${candidate.experience !== 1 ? 's' : ''}`;
    case 'education':
      return candidate.education;
    case 'skills':
      return (
        <div className="flex flex-wrap gap-1">
          {candidate.skills.map((s) => (
            <Badge key={s} tone="blue">{s}</Badge>
          ))}
        </div>
      );
    case 'currentCtc':
      return formatCtc(candidate.currentCtc);
    case 'expectedCtc':
      return formatCtc(candidate.expectedCtc);
    case 'location':
      return candidate.location;
    case 'assessmentScore':
      return (
        <span className="font-semibold">
          {candidate.assessmentScore}
          <span className="text-xs font-normal text-gray-400">/100</span>
        </span>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Candidate selection list                                           */
/* ------------------------------------------------------------------ */

function CandidateSelectList({
  candidates,
  selectedIds,
  onToggle,
  onCompare,
}: {
  candidates: ShortlistedCandidate[];
  selectedIds: Set<number>;
  onToggle: (id: number) => void;
  onCompare: () => void;
}) {
  const { t } = useTranslation('dashboard');

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-navy dark:text-gray-100">
          {t('candidateCompare.selectCandidates')}
        </h2>
        <Button
          size="sm"
          onClick={onCompare}
          disabled={selectedIds.size < 2}
        >
          <GitCompareArrows className="mr-1.5 h-4 w-4" aria-hidden />
          {t('candidateCompare.compareBtn', { count: selectedIds.size })}
        </Button>
      </div>

      <div className="space-y-2">
        {candidates.map((c) => {
          const checked = selectedIds.has(c.id);
          const disabled = !checked && selectedIds.size >= MAX_COMPARE;
          return (
            <label
              key={c.id}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition',
                checked
                  ? 'border-primary bg-primary/5 dark:border-primary/50 dark:bg-primary/10'
                  : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600',
                disabled && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => onToggle(c.id)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:border-gray-600"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-navy dark:text-gray-200">{c.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {c.designation} &middot; {c.experience} yrs &middot; {c.location}
                </p>
              </div>
              <Badge tone="green">{c.assessmentScore}/100</Badge>
            </label>
          );
        })}
      </div>

      {selectedIds.size > 0 && (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {t('candidateCompare.selected', { count: selectedIds.size, max: MAX_COMPARE })}
        </p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison table                                                   */
/* ------------------------------------------------------------------ */

function ComparisonTable({ candidates }: { candidates: ShortlistedCandidate[] }) {
  const { t } = useTranslation('dashboard');

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-gray-200 bg-brand-soft text-navy dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-200">
          <tr>
            <th className="px-4 py-3 font-semibold">{t('candidateCompare.attribute')}</th>
            {candidates.map((c) => (
              <th key={c.id} className="px-4 py-3 font-semibold">{c.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ATTRIBUTES.map((attr) => {
            const best = isHighlightable(attr) ? bestIndex(candidates, attr) : new Set<number>();
            return (
              <tr
                key={attr}
                className="border-b border-gray-100 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700/50"
              >
                <td className="px-4 py-3 font-medium text-navy dark:text-gray-200">
                  {t(`candidateCompare.attrs.${attr}`)}
                </td>
                {candidates.map((c, i) => (
                  <td
                    key={c.id}
                    className={cn(
                      'px-4 py-3 text-gray-700 dark:text-gray-300',
                      best.has(i) && 'bg-green-50 dark:bg-green-900/20',
                    )}
                  >
                    {renderCell(attr, c)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading skeleton                                                   */
/* ------------------------------------------------------------------ */

function ListSkeleton() {
  return (
    <Card>
      <Skeleton className="mb-4 h-6 w-48" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 dark:border-gray-700">
            <Skeleton className="h-4 w-4 rounded" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Main page                                                          */
/* ------------------------------------------------------------------ */

export default function CandidateComparisonPage() {
  const { t } = useTranslation('dashboard');
  const { data: candidates, isLoading } = useShortlistedCandidates();
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [comparing, setComparing] = useState(false);

  const handleToggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_COMPARE) {
        next.add(id);
      }
      return next;
    });
  };

  const handleCompare = () => {
    if (selectedIds.size >= 2) setComparing(true);
  };

  const handleBack = () => {
    setComparing(false);
  };

  const comparedCandidates = useMemo(() => {
    if (!candidates) return [];
    return candidates.filter((c) => selectedIds.has(c.id));
  }, [candidates, selectedIds]);

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/client/dashboard' },
          { label: t('candidateCompare.heading') },
        ]}
      />

      <div className="mb-6 flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" aria-hidden />
        <h1 className="font-heading text-2xl font-bold text-navy dark:text-gray-100">
          {t('candidateCompare.heading')}
        </h1>
      </div>

      {isLoading ? (
        <ListSkeleton />
      ) : !candidates?.length ? (
        <Card className="py-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" aria-hidden />
          <p className="text-gray-500 dark:text-gray-400">{t('candidateCompare.emptyState')}</p>
        </Card>
      ) : comparing && comparedCandidates.length >= 2 ? (
        <>
          <div className="mb-4">
            <Button variant="outline" size="sm" onClick={handleBack}>
              {t('candidateCompare.backToList')}
            </Button>
          </div>
          <ComparisonTable candidates={comparedCandidates} />
        </>
      ) : (
        <CandidateSelectList
          candidates={candidates}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onCompare={handleCompare}
        />
      )}
    </div>
  );
}
