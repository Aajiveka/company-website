import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Autocomplete, Button, HierarchicalSelect } from '@/components/ui';
import { useJobFilters } from '../jobs.api';

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
      className="flex flex-col gap-3 rounded-2xl bg-white/95 p-3 text-left shadow-lg lg:flex-row lg:items-center dark:bg-gray-800/95"
    >
      <div className="flex flex-1 items-center gap-2 border-gray-200 lg:border-r lg:pr-3">
        <Autocomplete
          options={data?.designations ?? []}
          value={designation}
          onChange={setDesignation}
          placeholder={t('search.rolePlaceholder')}
          icon={<Search className="h-5 w-5 shrink-0 text-primary" aria-hidden />}
          aria-label="Role"
        />
      </div>

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
