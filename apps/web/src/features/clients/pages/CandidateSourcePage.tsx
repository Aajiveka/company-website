import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Send, X } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useTranslation } from 'react-i18next';
import { Badge, Breadcrumbs, Button, Input, Pagination, Select, Table, useToast, type Column } from '@/components/ui';
import { api } from '@/lib/axios';

interface SourcingFilters {
  keyword: string;
  location: string;
  minExp: string;
  maxExp: string;
  skills: string[];
  page: number;
}

interface SourcingCandidate {
  id: number;
  name: string;
  designation: string;
  location: string;
  experience: number;
  skills: string[];
  matchScore: number;
}

interface SourcingResponse {
  candidates: SourcingCandidate[];
  total: number;
  page: number;
  pageCount: number;
}

const LOCATION_OPTIONS = [
  { value: '', label: 'All Locations' },
  { value: 'Mumbai', label: 'Mumbai' },
  { value: 'Delhi', label: 'Delhi' },
  { value: 'Bangalore', label: 'Bangalore' },
  { value: 'Hyderabad', label: 'Hyderabad' },
  { value: 'Chennai', label: 'Chennai' },
  { value: 'Kolkata', label: 'Kolkata' },
  { value: 'Pune', label: 'Pune' },
  { value: 'Ahmedabad', label: 'Ahmedabad' },
  { value: 'Jaipur', label: 'Jaipur' },
  { value: 'Lucknow', label: 'Lucknow' },
];

function scoreTone(score: number): 'green' | 'blue' | 'amber' | 'gray' {
  if (score >= 80) return 'green';
  if (score >= 60) return 'blue';
  if (score >= 40) return 'amber';
  return 'gray';
}

export default function CandidateSourcePage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const [skillInput, setSkillInput] = useState('');
  const [filters, setFilters] = useState<SourcingFilters>({
    keyword: '',
    location: '',
    minExp: '',
    maxExp: '',
    skills: [],
    page: 1,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['sourcing', filters],
    queryFn: () =>
      api
        .get<SourcingResponse>('/clients/me/sourcing', {
          params: {
            keyword: filters.keyword || undefined,
            location: filters.location || undefined,
            minExp: filters.minExp || undefined,
            maxExp: filters.maxExp || undefined,
            skills: filters.skills.length > 0 ? filters.skills.join(',') : undefined,
            page: filters.page,
          },
        })
        .then((r) => r.data),
  });

  const invite = useMutation({
    mutationFn: (candidateId: number) =>
      api.post('/clients/me/sourcing/invite', { candidateId }).then((r) => r.data),
    onSuccess: () => {
      notify(t('sourcing.inviteSuccess'), 'success');
    },
    onError: (e) => {
      const message = isAxiosError(e) ? e.response?.data?.message ?? t('sourcing.inviteFailed') : t('sourcing.inviteFailed');
      notify(message, 'error');
    },
  });

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !filters.skills.includes(trimmed)) {
      setFilters((prev) => ({ ...prev, skills: [...prev.skills, trimmed], page: 1 }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
      page: 1,
    }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const updateFilter = <K extends keyof SourcingFilters>(key: K, value: SourcingFilters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const columns: Column<SourcingCandidate>[] = [
    {
      key: 'name',
      header: t('sourcing.colName'),
      render: (r) => (
        <Link to={`/candidates/${r.id}`} className="font-medium text-primary hover:underline">
          {r.name}
        </Link>
      ),
    },
    { key: 'designation', header: t('sourcing.colDesignation') },
    { key: 'location', header: t('sourcing.colLocation') },
    {
      key: 'experience',
      header: t('sourcing.colExperience'),
      render: (r) => (
        <span>
          {r.experience} {r.experience === 1 ? t('sourcing.year') : t('sourcing.years')}
        </span>
      ),
    },
    {
      key: 'skills',
      header: t('sourcing.colSkills'),
      render: (r) => (
        <div className="flex flex-wrap gap-1">
          {r.skills.slice(0, 3).map((skill) => (
            <Badge key={skill} tone="purple">
              {skill}
            </Badge>
          ))}
          {r.skills.length > 3 && (
            <Badge tone="gray">+{r.skills.length - 3}</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'matchScore',
      header: t('sourcing.colMatchScore'),
      render: (r) => <Badge tone={scoreTone(r.matchScore)}>{r.matchScore}%</Badge>,
    },
    {
      key: 'actions',
      header: t('sourcing.colActions'),
      render: (r) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/candidates/${r.id}`}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
          >
            {t('sourcing.viewProfile')}
          </Link>
          <button
            onClick={() => invite.mutate(r.id)}
            disabled={invite.isPending}
            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400"
          >
            <Send className="h-3.5 w-3.5" />
            {t('sourcing.inviteToApply')}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/company/profile' },
          { label: t('sourcing.heading') },
        ]}
      />
      <h1 className="mb-6 font-heading text-2xl font-bold text-navy">{t('sourcing.heading')}</h1>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('sourcing.keyword')}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={filters.keyword}
                onChange={(e) => updateFilter('keyword', e.target.value)}
                placeholder={t('sourcing.keywordPlaceholder')}
                className="pl-9"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('sourcing.location')}
            </label>
            <Select
              value={filters.location}
              onChange={(e) => updateFilter('location', e.target.value)}
              options={LOCATION_OPTIONS}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('sourcing.minExp')}
            </label>
            <Input
              type="number"
              min="0"
              value={filters.minExp}
              onChange={(e) => updateFilter('minExp', e.target.value)}
              placeholder="0"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
              {t('sourcing.maxExp')}
            </label>
            <Input
              type="number"
              min="0"
              value={filters.maxExp}
              onChange={(e) => updateFilter('maxExp', e.target.value)}
              placeholder="30"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
            {t('sourcing.skills')}
          </label>
          <div className="flex gap-2">
            <Input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              placeholder={t('sourcing.skillPlaceholder')}
              className="max-w-xs"
            />
            <Button size="sm" onClick={addSkill} disabled={!skillInput.trim()}>
              {t('sourcing.addSkill')}
            </Button>
          </div>
          {filters.skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filters.skills.map((skill) => (
                <span
                  key={skill}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                >
                  {skill}
                  <button
                    onClick={() => removeSkill(skill)}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                    aria-label={`Remove ${skill}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <Table
        columns={columns}
        data={data?.candidates ?? []}
        rowKey={(r) => r.id}
        isLoading={isLoading}
        emptyMessage={t('sourcing.noResults')}
      />

      {data && data.pageCount > 1 && (
        <div className="mt-4 flex justify-center">
          <Pagination
            page={data.page}
            pageCount={data.pageCount}
            onChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
          />
        </div>
      )}
    </div>
  );
}
