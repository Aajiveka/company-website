import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, HierarchicalSelect } from '@/components/ui';
import { useDebounce } from '@/hooks/useDebounce';
import { useJobFilters, useJobSuggestions } from '../jobs.api';

const RECENT_SEARCHES_KEY = 'aajiveka_recent_searches';
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addRecentSearch(term: string) {
  if (!term.trim()) return;
  const recent = getRecentSearches().filter((s) => s !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export interface JobSearchBarProps {
  initialDesignation?: string;
  initialLocation?: string;
}

export function JobSearchBar({ initialDesignation = '', initialLocation = '' }: JobSearchBarProps) {
  const navigate = useNavigate();
  const { data } = useJobFilters();
  const { t } = useTranslation('jobs');
  const [designation, setDesignation] = useState(initialDesignation);
  const [location, setLocation] = useState(initialLocation);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(designation, 300);
  const { data: suggestionsData } = useJobSuggestions(debouncedQuery, showSuggestions);
  const suggestions = useMemo(() => suggestionsData?.suggestions ?? [], [suggestionsData]);

  // Show recent searches when the input is focused but empty
  const showRecent = showSuggestions && !designation.trim() && recentSearches.length > 0;
  const showApiSuggestions = showSuggestions && designation.trim().length >= 2 && suggestions.length > 0;
  const hasDropdown = showRecent || showApiSuggestions;

  // Combined items for keyboard navigation
  const dropdownItems = useMemo(() => {
    if (showRecent) return recentSearches.map((s) => ({ text: s, type: 'recent' as const }));
    if (showApiSuggestions) return suggestions;
    return [];
  }, [showRecent, showApiSuggestions, recentSearches, suggestions]);

  // Close on click outside
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSuggestions]);

  const selectSuggestion = useCallback(
    (text: string) => {
      setDesignation(text);
      setShowSuggestions(false);
      setActiveIndex(-1);
    },
    [],
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (designation.trim()) {
      addRecentSearch(designation.trim());
      setRecentSearches(getRecentSearches());
    }
    setShowSuggestions(false);
    const params = new URLSearchParams();
    if (designation) params.set('designation', designation);
    if (location) params.set('location', location);
    navigate({ pathname: '/jobs', search: params.toString() });
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDesignation(e.target.value);
    setShowSuggestions(true);
    setActiveIndex(-1);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!hasDropdown) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i < dropdownItems.length - 1 ? i + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i > 0 ? i - 1 : dropdownItems.length - 1));
        break;
      case 'Enter':
        if (activeIndex >= 0 && dropdownItems[activeIndex]) {
          e.preventDefault();
          selectSuggestion(dropdownItems[activeIndex].text);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setActiveIndex(-1);
        break;
    }
  };

  const typeIcon = (type: string) => {
    if (type === 'recent') return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    if (type === 'company') return <span className="text-xs text-gray-400">Co</span>;
    if (type === 'skill') return <span className="text-xs text-gray-400">Sk</span>;
    return null;
  };

  const handleClearRecent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    clearRecentSearches();
    setRecentSearches([]);
  };

  // Highlight matching substring in suggestions
  const highlight = (text: string) => {
    if (!designation.trim()) return text;
    const idx = text.toLowerCase().indexOf(designation.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary/15 text-inherit">{text.slice(idx, idx + designation.length)}</mark>
        {text.slice(idx + designation.length)}
      </>
    );
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl bg-white/95 p-3 text-left shadow-lg lg:flex-row lg:items-center dark:bg-gray-800/95"
    >
      {/* Designation / keyword input with suggestions */}
      <div ref={containerRef} className="relative flex flex-1 items-center gap-2 border-gray-200 lg:border-r lg:pr-3">
        <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-label="Role"
          aria-expanded={hasDropdown}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `search-item-${activeIndex}` : undefined}
          className="h-11 w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-gray-200 dark:placeholder:text-gray-500"
          placeholder={t('search.rolePlaceholder')}
          value={designation}
          onChange={onInputChange}
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={onKeyDown}
        />
        {designation && (
          <button
            type="button"
            onClick={() => { setDesignation(''); inputRef.current?.focus(); }}
            className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Clear"
          >
            <X className="h-3.5 w-3.5 text-gray-400" />
          </button>
        )}

        {/* Suggestions dropdown */}
        {hasDropdown && (
          <ul
            role="listbox"
            className="absolute left-0 top-full z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-600 dark:bg-gray-800"
          >
            {showRecent && (
              <li className="flex items-center justify-between px-3 py-1.5 text-xs text-gray-400">
                <span>Recent searches</span>
                <button
                  type="button"
                  onMouseDown={handleClearRecent}
                  className="text-primary hover:underline"
                >
                  Clear
                </button>
              </li>
            )}
            {dropdownItems.map((item, i) => (
              <li
                key={`${item.type}-${item.text}`}
                id={`search-item-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm transition ${
                  i === activeIndex
                    ? 'bg-primary/10 text-primary dark:bg-primary/20'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectSuggestion(item.text);
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                {typeIcon(item.type)}
                <span className="flex-1">{highlight(item.text)}</span>
                {item.type !== 'recent' && (
                  <span className="text-xs capitalize text-gray-400">{item.type}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Location */}
      <div className="flex flex-1 items-center gap-2">
        <HierarchicalSelect
          groups={data?.cityByState ?? {}}
          value={location}
          onChange={(city) => setLocation(city)}
          placeholder={t('search.locationPlaceholder')}
          formatValue={(city, state) => `${city}, ${state}`}
          icon={<MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
          aria-label="Location"
        />
      </div>

      <Button type="submit" className="w-full lg:w-auto">
        {t('search.searchButton')}
      </Button>
    </form>
  );
}
