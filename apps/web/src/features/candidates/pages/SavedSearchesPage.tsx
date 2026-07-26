import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { Bell, BellOff, Pencil, Play, Search, Trash2 } from 'lucide-react';
import { Badge, Breadcrumbs, Button, Card, CardSkeleton, Input, Modal, useToast } from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { api } from '@/lib/axios';

interface SavedSearch {
  id: number;
  name: string;
  keyword: string;
  location: string;
  workMode: string;
  emailNotifications: boolean;
  matchCount: number;
  createdAt: string;
}

const saveSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(2, t('savedSearches.nameRequired')),
  });

type SaveValues = z.infer<ReturnType<typeof saveSchema>>;

const renameSchema = (t: TFunction) =>
  z.object({
    name: z.string().min(2, t('savedSearches.nameRequired')),
  });

type RenameValues = z.infer<ReturnType<typeof renameSchema>>;

const WORK_MODE_TONES: Record<string, BadgeTone> = {
  Remote: 'purple',
  Hybrid: 'amber',
  'On-site': 'blue',
};

function RenameModal({
  open,
  onClose,
  search,
}: {
  open: boolean;
  onClose: () => void;
  search: SavedSearch;
}) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RenameValues>({
    resolver: zodResolver(renameSchema(t)),
    defaultValues: { name: search.name },
  });

  const rename = useMutation({
    mutationFn: (values: RenameValues) =>
      api.patch(`/candidates/me/saved-searches/${search.id}`, { name: values.name }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-searches'] });
      notify(t('savedSearches.renamed'), 'success');
      onClose();
    },
    onError: () => notify(t('savedSearches.renameFailed'), 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title={t('savedSearches.renameTitle')}>
      <form onSubmit={handleSubmit((v) => rename.mutate(v))} className="space-y-4">
        <Input
          label={t('savedSearches.searchName')}
          error={errors.name?.message}
          {...register('name')}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" type="button" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button type="submit" isLoading={rename.isPending}>
            {t('common:actions.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function DeleteConfirmModal({
  open,
  onClose,
  searchId,
  searchName,
}: {
  open: boolean;
  onClose: () => void;
  searchId: number;
  searchName: string;
}) {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();

  const remove = useMutation({
    mutationFn: () => api.delete(`/candidates/me/saved-searches/${searchId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-searches'] });
      notify(t('savedSearches.deleted'), 'success');
      onClose();
    },
    onError: () => notify(t('savedSearches.deleteFailed'), 'error'),
  });

  return (
    <Modal open={open} onClose={onClose} title={t('savedSearches.deleteTitle')}>
      <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
        {t('savedSearches.deleteConfirm', { name: searchName })}
      </p>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('common:actions.cancel')}
        </Button>
        <Button variant="danger" onClick={() => remove.mutate()} isLoading={remove.isPending}>
          {t('savedSearches.deleteButton')}
        </Button>
      </div>
    </Modal>
  );
}

export default function SavedSearchesPage() {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { notify } = useToast();
  const qc = useQueryClient();

  const [renameTarget, setRenameTarget] = useState<SavedSearch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedSearch | null>(null);

  const { data: searches, isLoading } = useQuery({
    queryKey: ['candidate', 'saved-searches'],
    queryFn: () => api.get<SavedSearch[]>('/candidates/me/saved-searches').then((r) => r.data),
  });

  const saveSearch = useMutation({
    mutationFn: (values: SaveValues) =>
      api.post('/candidates/me/saved-searches', values).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-searches'] });
      notify(t('savedSearches.saved'), 'success');
      reset();
    },
    onError: () => notify(t('savedSearches.saveFailed'), 'error'),
  });

  const toggleNotifications = useMutation({
    mutationFn: ({ id, enabled }: { id: number; enabled: boolean }) =>
      api.patch(`/candidates/me/saved-searches/${id}`, { emailNotifications: enabled }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['candidate', 'saved-searches'] });
    },
    onError: () => notify(t('savedSearches.updateFailed'), 'error'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SaveValues>({ resolver: zodResolver(saveSchema(t)) });

  const runSearch = (search: SavedSearch) => {
    const params = new URLSearchParams();
    if (search.keyword) params.set('keyword', search.keyword);
    if (search.location) params.set('location', search.location);
    if (search.workMode) params.set('workMode', search.workMode);
    navigate(`/jobs?${params.toString()}`);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/candidate/profile' },
          { label: t('savedSearches.heading') },
        ]}
      />
      <h1 className="mb-4 font-heading text-2xl font-bold text-navy">
        {t('savedSearches.heading')}
      </h1>

      <Card className="mb-6">
        <h2 className="mb-3 text-base font-semibold text-navy">
          {t('savedSearches.saveCurrentTitle')}
        </h2>
        <form
          onSubmit={handleSubmit((v) => saveSearch.mutate(v))}
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          noValidate
        >
          <div className="flex-1">
            <Input
              label={t('savedSearches.searchName')}
              placeholder={t('savedSearches.namePlaceholder')}
              error={errors.name?.message}
              {...register('name')}
            />
          </div>
          <Button type="submit" isLoading={saveSearch.isPending}>
            <Search className="mr-1.5 h-4 w-4" />
            {t('savedSearches.saveButton')}
          </Button>
        </form>
      </Card>

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : !searches?.length ? (
        <Card className="text-center">
          <div className="flex flex-col items-center gap-3 py-6">
            <Search className="h-10 w-10 text-gray-300" aria-hidden />
            <p className="text-navy">{t('savedSearches.noSearches')}</p>
            <p className="text-sm text-gray-500">{t('savedSearches.noSearchesHint')}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {searches.map((search) => (
            <Card key={search.id} className="transition hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="font-heading text-lg font-semibold text-navy">
                    {search.name}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {search.keyword && (
                      <Badge tone="gray">{search.keyword}</Badge>
                    )}
                    {search.location && (
                      <Badge tone="blue">{search.location}</Badge>
                    )}
                    {search.workMode && (
                      <Badge tone={WORK_MODE_TONES[search.workMode] ?? 'gray'}>
                        {search.workMode}
                      </Badge>
                    )}
                  </div>
                </div>
                <Badge tone="green">
                  {t('savedSearches.matches', { count: search.matchCount })}
                </Badge>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between border-t border-gray-100 pt-3 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t('savedSearches.createdOn', { date: formatDate(search.createdAt) })}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      toggleNotifications.mutate({
                        id: search.id,
                        enabled: !search.emailNotifications,
                      })
                    }
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-navy dark:hover:bg-gray-700"
                    aria-label={
                      search.emailNotifications
                        ? t('savedSearches.disableNotifications')
                        : t('savedSearches.enableNotifications')
                    }
                    title={
                      search.emailNotifications
                        ? t('savedSearches.disableNotifications')
                        : t('savedSearches.enableNotifications')
                    }
                  >
                    {search.emailNotifications ? (
                      <Bell className="h-4 w-4 text-primary" />
                    ) : (
                      <BellOff className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => setRenameTarget(search)}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20"
                    aria-label={t('savedSearches.edit')}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(search)}
                    className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-danger dark:hover:bg-red-900/20"
                    aria-label={t('savedSearches.delete')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <Button size="sm" onClick={() => runSearch(search)}>
                    <Play className="mr-1 h-3.5 w-3.5" />
                    {t('savedSearches.runSearch')}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {renameTarget && (
        <RenameModal
          open
          onClose={() => setRenameTarget(null)}
          search={renameTarget}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          open
          onClose={() => setDeleteTarget(null)}
          searchId={deleteTarget.id}
          searchName={deleteTarget.name}
        />
      )}
    </div>
  );
}
