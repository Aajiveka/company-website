import { useState } from 'react';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Pencil,
  Save,
  Workflow,
} from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Breadcrumbs,
  Button,
  Card,
  CardSkeleton,
  Input,
  Modal,
  Select,
  useToast,
} from '@/components/ui';
import type { BadgeTone } from '@/components/ui';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';

interface WorkflowStage {
  name: string;
  type: 'Review' | 'Phone' | 'Video' | 'In-Person' | 'Assessment' | 'Offer';
  autoAdvance: boolean;
  daysToComplete: number;
}

interface ScreeningWorkflow {
  id: string;
  name: string;
  stages: WorkflowStage[];
  jobCount: number;
  status: 'Active' | 'Draft';
}

const STAGE_TYPE_OPTIONS = [
  { label: 'Review', value: 'Review' },
  { label: 'Phone', value: 'Phone' },
  { label: 'Video', value: 'Video' },
  { label: 'In-Person', value: 'In-Person' },
  { label: 'Assessment', value: 'Assessment' },
  { label: 'Offer', value: 'Offer' },
] as const;

const DEFAULT_STAGES: WorkflowStage[] = [
  { name: 'Application Review', type: 'Review', autoAdvance: false, daysToComplete: 3 },
  { name: 'Phone Screen', type: 'Phone', autoAdvance: false, daysToComplete: 5 },
  { name: 'Technical Interview', type: 'Video', autoAdvance: false, daysToComplete: 7 },
  { name: 'Final Interview', type: 'In-Person', autoAdvance: false, daysToComplete: 5 },
  { name: 'Offer', type: 'Offer', autoAdvance: false, daysToComplete: 3 },
];

function WorkflowBuilder({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial?: ScreeningWorkflow;
  onSave: (name: string, stages: WorkflowStage[]) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const { t } = useTranslation('dashboard');
  const [name, setName] = useState(initial?.name ?? '');
  const [stages, setStages] = useState<WorkflowStage[]>(
    initial?.stages ?? [...DEFAULT_STAGES],
  );

  const updateStage = (index: number, patch: Partial<WorkflowStage>) => {
    setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  };

  const addStage = (afterIndex: number) => {
    const newStage: WorkflowStage = {
      name: '',
      type: 'Review',
      autoAdvance: false,
      daysToComplete: 3,
    };
    setStages((prev) => {
      const next = [...prev];
      next.splice(afterIndex + 1, 0, newStage);
      return next;
    });
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) return;
    setStages((prev) => prev.filter((_, i) => i !== index));
  };

  const moveStage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= stages.length) return;
    setStages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const canSubmit = name.trim().length > 0 && stages.every((s) => s.name.trim().length > 0);

  return (
    <Card>
      <h2 className="mb-4 text-lg font-semibold text-navy">
        {initial ? t('workflows.editWorkflow') : t('workflows.createWorkflow')}
      </h2>

      <Input
        label={t('workflows.workflowName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('workflows.workflowNamePlaceholder')}
      />

      <div className="mt-6">
        <label className="mb-2 block text-sm font-medium text-navy dark:text-gray-200">
          {t('workflows.stages')}
        </label>

        <div className="space-y-0">
          {stages.map((stage, index) => (
            <div key={index}>
              <div className="flex items-start gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-600 dark:bg-gray-800">
                <div className="flex flex-col items-center gap-1 pt-2">
                  <GripVertical className="h-4 w-4 text-gray-300" />
                  <button
                    type="button"
                    onClick={() => moveStage(index, -1)}
                    disabled={index === 0}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    aria-label={t('workflows.moveUp')}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveStage(index, 1)}
                    disabled={index === stages.length - 1}
                    className="rounded p-0.5 text-gray-400 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                    aria-label={t('workflows.moveDown')}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label={t('workflows.stageName')}
                      value={stage.name}
                      onChange={(e) => updateStage(index, { name: e.target.value })}
                      placeholder={t('workflows.stageNamePlaceholder')}
                    />
                    <Select
                      label={t('workflows.stageType')}
                      options={STAGE_TYPE_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
                      value={stage.type}
                      onChange={(e) =>
                        updateStage(index, { type: e.target.value as WorkflowStage['type'] })
                      }
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={stage.autoAdvance}
                        onChange={(e) => updateStage(index, { autoAdvance: e.target.checked })}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                      />
                      {t('workflows.autoAdvance')}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={stage.daysToComplete}
                        onChange={(e) =>
                          updateStage(index, { daysToComplete: Math.max(1, Number(e.target.value)) })
                        }
                        className="w-20"
                      />
                      <span className="text-sm text-gray-500">{t('workflows.days')}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeStage(index)}
                  disabled={stages.length <= 1}
                  className="mt-2 rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 dark:hover:bg-red-900/20"
                  aria-label={t('workflows.removeStage')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {index < stages.length - 1 && (
                <div className="flex items-center justify-center py-1">
                  <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => addStage(stages.length - 1)}
          className="mt-3 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-500 hover:border-primary hover:text-primary dark:border-gray-600 dark:hover:border-primary"
        >
          <Plus className="h-4 w-4" />
          {t('workflows.addStage')}
        </button>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t('workflows.cancel')}
        </Button>
        <Button onClick={() => onSave(name, stages)} isLoading={isSaving} disabled={!canSubmit}>
          <Save className="mr-1.5 h-4 w-4" />
          {t('workflows.save')}
        </Button>
      </div>
    </Card>
  );
}

function WorkflowCard({
  workflow,
  onEdit,
  onDelete,
}: {
  workflow: ScreeningWorkflow;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation('dashboard');
  const statusTone: BadgeTone = workflow.status === 'Active' ? 'green' : 'amber';

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Workflow className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-navy">{workflow.name}</h3>
            <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
              <span>
                {workflow.stages.length} {t('workflows.stagesCount')}
              </span>
              <span>
                {workflow.jobCount} {t('workflows.jobsUsing')}
              </span>
            </div>
          </div>
        </div>
        <Badge tone={statusTone}>{t(`workflows.status.${workflow.status}`)}</Badge>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {workflow.stages.map((stage, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300"
          >
            {i > 0 && <span className="text-gray-300 dark:text-gray-500">&rarr;</span>}
            {stage.name}
          </span>
        ))}
      </div>

      <div className="mt-4 flex justify-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil className="mr-1 h-3.5 w-3.5" />
          {t('workflows.edit')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete}>
          <Trash2 className="mr-1 h-3.5 w-3.5 text-red-500" />
          <span className="text-red-500">{t('workflows.delete')}</span>
        </Button>
      </div>
    </Card>
  );
}

export default function ScreeningWorkflowPage() {
  const { t } = useTranslation('dashboard');
  const { notify } = useToast();
  const qc = useQueryClient();

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ScreeningWorkflow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ScreeningWorkflow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['client', 'workflows'],
    queryFn: () =>
      api.get<ScreeningWorkflow[]>('/clients/me/workflows').then((r) => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (body: { name: string; stages: WorkflowStage[] }) =>
      api.post('/clients/me/workflows', body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'workflows'] });
      setBuilderOpen(false);
      notify(t('workflows.created'), 'success');
    },
    onError: () => notify(t('workflows.saveFailed'), 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...body }: { id: string; name: string; stages: WorkflowStage[] }) =>
      api.patch(`/clients/me/workflows/${id}`, body).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'workflows'] });
      setEditingWorkflow(null);
      notify(t('workflows.updated'), 'success');
    },
    onError: () => notify(t('workflows.saveFailed'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/clients/me/workflows/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['client', 'workflows'] });
      setDeleteTarget(null);
      notify(t('workflows.deleted'), 'success');
    },
    onError: () => notify(t('workflows.deleteFailed'), 'error'),
  });

  const handleSave = (name: string, stages: WorkflowStage[]) => {
    if (editingWorkflow) {
      updateMutation.mutate({ id: editingWorkflow.id, name, stages });
    } else {
      createMutation.mutate({ name, stages });
    }
  };

  const handleEdit = (workflow: ScreeningWorkflow) => {
    setEditingWorkflow(workflow);
    setBuilderOpen(false);
  };

  const handleCancelBuilder = () => {
    setBuilderOpen(false);
    setEditingWorkflow(null);
  };

  const showBuilder = builderOpen || editingWorkflow !== null;

  return (
    <div className="mx-auto max-w-4xl">
      <Breadcrumbs
        items={[
          { label: t('common:dashboard'), to: '/company/profile' },
          { label: t('workflows.heading') },
        ]}
      />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-navy">{t('workflows.heading')}</h1>
        {!showBuilder && (
          <Button onClick={() => setBuilderOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t('workflows.createWorkflow')}
          </Button>
        )}
      </div>

      {showBuilder && (
        <div className="mb-6">
          <WorkflowBuilder
            initial={editingWorkflow ?? undefined}
            onSave={handleSave}
            onCancel={handleCancelBuilder}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (data ?? []).length === 0 && !showBuilder ? (
        <Card>
          <div className="py-12 text-center">
            <Workflow className="mx-auto mb-3 h-12 w-12 text-gray-300" />
            <p className="text-sm text-gray-500">{t('workflows.empty')}</p>
            <Button className="mt-4" onClick={() => setBuilderOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t('workflows.createWorkflow')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {(data ?? []).map((wf) => (
            <WorkflowCard
              key={wf.id}
              workflow={wf}
              onEdit={() => handleEdit(wf)}
              onDelete={() => setDeleteTarget(wf)}
            />
          ))}
        </div>
      )}

      <Modal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title={t('workflows.confirmDeleteTitle')}
      >
        <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          {t('workflows.confirmDeleteMessage', { name: deleteTarget?.name })}
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>
            {t('workflows.cancel')}
          </Button>
          <Button
            className={cn('bg-red-600 hover:bg-red-700 focus:ring-red-500/30')}
            onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            isLoading={deleteMutation.isPending}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            {t('workflows.delete')}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
