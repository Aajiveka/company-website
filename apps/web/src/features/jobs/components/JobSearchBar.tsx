import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { useJobFilters } from '../jobs.api';

export interface JobSearchBarProps {
  initialDesignation?: string;
  initialLocation?: string;
}

/**
 * The role/location search pill. Shared by the home hero and the /jobs results page;
 * submitting navigates to /jobs with the selection as query params, so a search is
 * shareable and back/forward works.
 *
 * The legacy hero labelled the first dropdown "Function / keyword", but a job has no
 * function in the database — see JobFilters in ../jobs.types. It searches by designation.
 */
export function JobSearchBar({ initialDesignation = '', initialLocation = '' }: JobSearchBarProps) {
  const navigate = useNavigate();
  const { data } = useJobFilters();
  const [designation, setDesignation] = useState(initialDesignation);
  const [location, setLocation] = useState(initialLocation);

  // Derive initial state from initialLocation
  const deriveState = () => {
    if (!initialLocation || !data?.cityByState) return '';
    for (const [state, cities] of Object.entries(data.cityByState)) {
      if (cities.includes(initialLocation)) return state;
    }
    return '';
  };
  const [state, setState] = useState('');

  // Set initial state when data loads
  if (data && !state && initialLocation) {
    const s = deriveState();
    if (s) setState(s);
  }

  const filteredCities = state && data?.cityByState ? data.cityByState[state] ?? [] : [];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (designation) params.set('designation', designation);
    if (location) params.set('location', location);
    navigate({ pathname: '/jobs', search: params.toString() });
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl bg-white/95 p-3 text-left shadow-lg xl:flex-row xl:items-center"
    >
      <div className="flex flex-1 items-center gap-2 border-gray-200 xl:border-r xl:pr-3">
        <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <select
          aria-label="Role"
          className="h-11 w-full bg-transparent text-sm text-gray-700 outline-none"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
        >
          <option value="">Role / keyword</option>
          {data?.designations.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 items-center gap-2 border-gray-200 xl:border-r xl:pr-3">
        <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <select
          aria-label="State"
          className="h-11 w-full bg-transparent text-sm text-gray-700 outline-none"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setLocation('');
          }}
        >
          <option value="">State</option>
          {data?.states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-1 items-center gap-2">
        <MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />
        <select
          aria-label="District / City"
          className="h-11 w-full bg-transparent text-sm text-gray-700 outline-none"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={!state}
        >
          <option value="">{state ? 'District / City' : 'Select state first'}</option>
          {filteredCities.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" className="w-full xl:w-auto">
        Search my job
      </Button>
    </form>
  );
}
