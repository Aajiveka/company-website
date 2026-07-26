import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Bookmark, Search, Trash2, Plus } from 'lucide-react';
import { Button, Card, Modal, useToast } from '@/components/ui';
import type { SavedSearch } from '@/features/jobs/jobs.types';

const SAVED_SEARCHES_KEY = 'aajiveka_saved_searches';

function loadSavedSearches(): SavedSearch[] {
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Persist searches to localStorage. Returns false if storage is unavailable. */
function persistSavedSearches(searches: SavedSearch[]): boolean {
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(searches));
    return true;
  } catch {
    return false;
  }
}

export interface SavedSearchesProps {
  /** The current search query text */
  currentQuery?: string;
  /** The current active filters as a serializable record */
  currentFilters?: Record<string, unknown>;
}

/**
 * SavedSearches: Allows candidates to save, list, apply, and delete saved job searches.
 * Data is stored in localStorage.
 */
export function SavedSearches({ currentQuery = '', currentFilters = {} }: SavedSearchesProps) {
  const { t } = useTranslation('jobs');
  const navigate = useNavigate();
  const { notify } = useToast();
  const [searches, setSearches] = useState<SavedSearch[]>(() => loadSavedSearches());
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');

  const hasCurrentSearch = !!currentQuery.trim() || Object.values(currentFilters).some(
    (v) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0),
  );

  const handleSave = useCallback(() => {
    if (!saveName.trim()) return;
    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      query: currentQuery,
      filters: currentFilters,
      createdAt: new Date().toISOString(),
    };
    const updated = [newSearch, ...searches];
    if (!persistSavedSearches(updated)) {
      notify('Could not save search. Storage may be full.', 'error');
      return;
    }
    setSearches(updated);
    setSaveName('');
    setShowSaveModal(false);
  }, [saveName, currentQuery, currentFilters, searches, notify]);

  const handleDelete = useCallback(
    (id: string) => {
      const updated = searches.filter((s) => s.id !== id);
      if (!persistSavedSearches(updated)) {
        notify('Could not update saved searches.', 'error');
        return;
      }
      setSearches(updated);
    },
    [searches, notify],
  );

  const handleApply = useCallback(
    (search: SavedSearch) => {
      const params = new URLSearchParams();
      if (search.query) params.set('designation', search.query);
      const filters = search.filters;
      if (filters.location) params.set('location', String(filters.location));
      if (filters.industry) params.set('industry', String(filters.industry));
      if (filters.workModes && Array.isArray(filters.workModes) && filters.workModes.length > 0) {
        params.set('workModes', (filters.workModes as string[]).join(','));
      }
      if (filters.employmentTypes && Array.isArray(filters.employmentTypes) && filters.employmentTypes.length > 0) {
        params.set('employmentTypes', (filters.employmentTypes as string[]).join(','));
      }
      if (filters.locationsList && Array.isArray(filters.locationsList) && filters.locationsList.length > 0) {
        params.set('locations', (filters.locationsList as string[]).join(','));
      }
      if (filters.skills && Array.isArray(filters.skills) && filters.skills.length > 0) {
        params.set('skills', (filters.skills as string[]).join(','));
      }
      if (filters.minCtc && Number(filters.minCtc) > 0) params.set('minCtc', String(filters.minCtc));
      if (filters.maxCtc) params.set('maxCtc', String(filters.maxCtc));
      if (filters.minExp != null) params.set('minExp', String(filters.minExp));
      if (filters.maxExp != null) params.set('maxExp', String(filters.maxExp));
      if (filters.postedWithin) params.set('postedWithin', String(filters.postedWithin));
      if (filters.sortBy && filters.sortBy !== 'newest') params.set('sortBy', String(filters.sortBy));

      navigate({ pathname: '/jobs', search: params.toString() });
    },
    [navigate],
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  const filterSummary = (filters: Record<string, unknown>) => {
    const parts: string[] = [];
    if (filters.workModes && Array.isArray(filters.workModes) && filters.workModes.length > 0) {
      parts.push(`Work: ${(filters.workModes as string[]).join(', ')}`);
    }
    if (filters.locationsList && Array.isArray(filters.locationsList) && filters.locationsList.length > 0) {
      parts.push(`Cities: ${(filters.locationsList as string[]).join(', ')}`);
    }
    if (filters.skills && Array.isArray(filters.skills) && filters.skills.length > 0) {
      parts.push(`Skills: ${(filters.skills as string[]).join(', ')}`);
    }
    if (filters.minCtc && Number(filters.minCtc) > 0) {
      parts.push(`Min CTC: ${(Number(filters.minCtc) / 100_000).toFixed(1)} LPA`);
    }
    if (filters.postedWithin) parts.push(`Posted: ${filters.postedWithin}`);
    return parts.join(' | ') || t('savedSearches.noFilters');
  };

  return (
    <div>
      {/* Save current search button */}
      {hasCurrentSearch && (
        <button
          onClick={() => setShowSaveModal(true)}
          aria-label="Save current search"
          className="mb-4 flex min-h-[44px] items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          {t('savedSearches.saveCurrentSearch')}
        </button>
      )}

      {/* Save modal */}
      <Modal open={showSaveModal} onClose={() => setShowSaveModal(false)} title={t('savedSearches.saveSearchTitle')}>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('savedSearches.searchName')}
            </label>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={t('savedSearches.searchNamePlaceholder')}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
            />
          </div>
          {currentQuery && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Query: &quot;{currentQuery}&quot;
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowSaveModal(false)}
            >
              {t('savedSearches.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={!saveName.trim()}>
              {t('savedSearches.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Saved searches list */}
      {searches.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-navy dark:text-white">
            <Bookmark className="h-4 w-4" />
            {t('savedSearches.title', { count: searches.length })}
          </h3>
          <ul className="space-y-3" aria-label="Saved searches">
          {searches.map((search) => (
            <li key={search.id}>
            <Card className="group relative">
              <div className="flex items-start justify-between gap-2 sm:gap-3">
                <button
                  onClick={() => handleApply(search)}
                  aria-label={`Apply saved search: ${search.name}`}
                  className="min-w-0 flex-1 text-left"
                >
                  <h4 className="text-sm font-medium text-navy group-hover:text-primary dark:text-white">
                    {search.name}
                  </h4>
                  {search.query && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Search className="h-3 w-3" />
                      &quot;{search.query}&quot;
                    </p>
                  )}
                  <p className="mt-1 truncate text-xs text-gray-400 dark:text-gray-500">
                    {filterSummary(search.filters)}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    {t('savedSearches.savedDate', { date: formatDate(search.createdAt) })}
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(search.id)}
                  className="rounded p-2 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center text-gray-400 opacity-100 sm:opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                  aria-label={`Delete ${search.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
            </li>
          ))}
          </ul>
        </div>
      )}

      {searches.length === 0 && !hasCurrentSearch && (
        <div className="rounded-lg border border-dashed border-gray-200 p-4 sm:p-6 text-center dark:border-gray-700">
          <Bookmark className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {t('savedSearches.emptyState')}
          </p>
        </div>
      )}
    </div>
  );
}
