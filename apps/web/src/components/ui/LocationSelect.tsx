import { useMemo } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HierarchicalSelect } from './HierarchicalSelect';

export interface LocationStateOption {
  id: number;
  label: string;
}

export interface LocationCityOption extends LocationStateOption {
  stateId: number;
}

export interface LocationSelectProps {
  states?: LocationStateOption[];
  cities?: LocationCityOption[];
  /** Selected city id. `null`/`undefined` renders the placeholder. */
  value?: number | null;
  /** Fires with the chosen city's id. */
  onChange: (cityId: number | null) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
}

/**
 * The home page's state → city picker, in form shape.
 *
 * Every location field in the app used to be two dependent <select>s (pick a State, then pick
 * a District / City filtered by it). This is the same expand-a-state-to-see-its-districts
 * dropdown the job search bar uses, so location looks and behaves identically everywhere —
 * and it takes and returns the numeric city id the forms already store.
 */
export function LocationSelect({
  states,
  cities,
  value,
  onChange,
  label,
  placeholder = 'Select Location',
  error,
  required,
}: LocationSelectProps) {
  // State label → its city labels, in the order the masters endpoint returns them. States with
  // no cities are dropped rather than rendered as rows that expand to nothing.
  const groups = useMemo(() => {
    const byStateId = new Map<number, string[]>();
    for (const city of cities ?? []) {
      const list = byStateId.get(city.stateId);
      if (list) list.push(city.label);
      else byStateId.set(city.stateId, [city.label]);
    }
    const out: Record<string, string[]> = {};
    for (const state of states ?? []) {
      const list = byStateId.get(state.id);
      if (list?.length) out[state.label] = list;
    }
    return out;
  }, [states, cities]);

  const selectedLabel = (cities ?? []).find((c) => c.id === value)?.label ?? '';

  // The dropdown speaks in labels, the form stores ids. Resolving on the (city, state) pair
  // rather than the city name alone keeps districts that share a name across states distinct.
  const handleChange = (cityLabel: string, stateLabel: string) => {
    const stateId = (states ?? []).find((s) => s.label === stateLabel)?.id;
    const city = (cities ?? []).find((c) => c.label === cityLabel && c.stateId === stateId);
    onChange(city?.id ?? null);
  };

  return (
    <div className="w-full">
      {label && (
        <span className="mb-1.5 block text-sm font-medium text-navy dark:text-gray-200">
          {label}
          {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
        </span>
      )}
      <div
        className={cn(
          'flex w-full items-center rounded-lg border bg-white px-3.5 transition dark:bg-gray-800',
          'focus-within:ring-2 focus-within:ring-primary/30',
          error ? 'border-danger' : 'border-gray-300 focus-within:border-primary dark:border-gray-600',
        )}
      >
        <HierarchicalSelect
          groups={groups}
          value={selectedLabel}
          onChange={handleChange}
          placeholder={placeholder}
          formatValue={(city, state) => `${city}, ${state}`}
          icon={<MapPin className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
          aria-label={label ?? placeholder}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
