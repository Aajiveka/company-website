import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, ConfirmDialog, Input, Modal, Select, Textarea } from '@/components/ui';
import {
  useDeleteItSkill,
  useDeleteProject,
  useUpsertItSkill,
  useUpsertProject,
} from '../../candidate.api';
import {
  EMPLOYMENT_TYPES,
  PROJECT_SITES,
  PROJECT_STATUSES,
  type CvItSkillEntry,
  type CvProjectEntry,
} from '../../candidate.types';
import { EmptyHint, RowEdit, Section } from './section';
import { monthOptions, monthYear, useDraft, useSaveHandlers, yearOptions } from './sectionState';
import { DialogActions } from './TextSections';

/* -------------------------------- IT skills ------------------------------- */

const blankItSkill: CvItSkillEntry = {
  subscriberItSkillId: 0,
  skillName: '',
  version: '',
  lastUsedYear: null,
  expYears: null,
  expMonths: null,
};

export function ItSkillsSection({ rows }: { rows: CvItSkillEntry[] }) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [editing, setEditing] = useState<CvItSkillEntry | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const save = useUpsertItSkill();
  const remove = useDeleteItSkill();
  const handlers = useSaveHandlers(() => setEditing(null));
  const [draft, patch] = useDraft(editing ?? blankItSkill, !!editing);

  const experience = (row: CvItSkillEntry) =>
    [
      row.expYears != null ? t('profile.years', { count: row.expYears }) : '',
      row.expMonths != null ? t('profile.months', { count: row.expMonths }) : '',
    ]
      .filter(Boolean)
      .join(' ');

  return (
    <Section
      id="it-skills"
      title={t('profile.itSkills.heading')}
      addLabel={t('profile.itSkills.add')}
      onAdd={() => setEditing(blankItSkill)}
    >
      {rows.length === 0 ? (
        <EmptyHint onClick={() => setEditing(blankItSkill)}>{t('profile.itSkills.empty')}</EmptyHint>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <th className="py-2 pr-4 font-normal">{t('profile.itSkills.skill')}</th>
                <th className="py-2 pr-4 font-normal">{t('profile.itSkills.version')}</th>
                <th className="py-2 pr-4 font-normal">{t('profile.itSkills.lastUsed')}</th>
                <th className="py-2 pr-4 font-normal">{t('profile.itSkills.experience')}</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.subscriberItSkillId} className="border-b border-gray-100 last:border-0 dark:border-gray-700/60">
                  <td className="py-3 pr-4 font-medium text-navy dark:text-gray-100">{row.skillName}</td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{row.version || '—'}</td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{row.lastUsedYear ?? '—'}</td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">{experience(row) || '—'}</td>
                  <td className="py-3 text-right">
                    <RowEdit onClick={() => setEditing(row)} label={tCommon('actions.edit')} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t('profile.itSkills.heading')} className="max-w-lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('profile.itSkills.skill')}
            value={draft.skillName}
            onChange={(e) => patch({ skillName: e.target.value })}
          />
          <Input
            label={t('profile.itSkills.version')}
            value={draft.version}
            onChange={(e) => patch({ version: e.target.value })}
          />
          <Select
            label={t('profile.itSkills.lastUsed')}
            placeholder={tCommon('labels.select')}
            options={yearOptions(30)}
            value={draft.lastUsedYear ?? ''}
            onChange={(e) => patch({ lastUsedYear: e.target.value ? Number(e.target.value) : null })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={t('profile.itSkills.expYears')}
              type="number"
              min={0}
              max={70}
              value={draft.expYears ?? ''}
              onChange={(e) => patch({ expYears: e.target.value ? Number(e.target.value) : null })}
            />
            <Input
              label={t('profile.itSkills.expMonths')}
              type="number"
              min={0}
              max={11}
              value={draft.expMonths ?? ''}
              onChange={(e) => patch({ expMonths: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {draft.subscriberItSkillId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger"
              onClick={() => setConfirmId(draft.subscriberItSkillId)}
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('actions.delete')}
            </Button>
          ) : (
            <span />
          )}
          <DialogActions
            onCancel={() => setEditing(null)}
            onSave={() =>
              save.mutate(
                {
                  subscriberItSkillId: draft.subscriberItSkillId || undefined,
                  skillName: draft.skillName,
                  version: draft.version || undefined,
                  lastUsedYear: draft.lastUsedYear ?? undefined,
                  expYears: draft.expYears ?? undefined,
                  expMonths: draft.expMonths ?? undefined,
                },
                handlers,
              )
            }
            isLoading={save.isPending}
            disabled={!draft.skillName.trim()}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmId !== null}
        title={t('profile.itSkills.deleteTitle')}
        message={t('profile.deleteMessage')}
        variant="danger"
        isLoading={remove.isPending}
        onCancel={() => setConfirmId(null)}
        onConfirm={() =>
          confirmId !== null &&
          remove.mutate(confirmId, {
            onSuccess: () => {
              setConfirmId(null);
              setEditing(null);
            },
          })
        }
      />
    </Section>
  );
}

/* -------------------------------- Projects -------------------------------- */

const blankProject: CvProjectEntry = {
  subscriberProjectId: 0,
  title: '',
  clientName: '',
  projectStatus: 'Finished',
  workedFromMonth: null,
  workedFromYear: null,
  workedTillMonth: null,
  workedTillYear: null,
  projectSite: '',
  natureOfEmployment: '',
  teamSize: null,
  roleDescr: '',
  skillsUsed: [],
  details: '',
};

export function ProjectsSection({ rows }: { rows: CvProjectEntry[] }) {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [editing, setEditing] = useState<CvProjectEntry | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [skillsText, setSkillsText] = useState('');
  const save = useUpsertProject();
  const remove = useDeleteProject();
  const handlers = useSaveHandlers(() => setEditing(null));
  const [draft, patch] = useDraft(editing ?? blankProject, !!editing);

  const open = (row: CvProjectEntry) => {
    setSkillsText(row.skillsUsed.join(', '));
    setEditing(row);
  };

  const inProgress = draft.projectStatus === 'In Progress';
  const months = monthOptions(i18n.language);
  const years = yearOptions(40);

  const period = (row: CvProjectEntry) => {
    const from = monthYear(row.workedFromMonth, row.workedFromYear, i18n.language);
    if (!from) return '';
    const till =
      row.projectStatus === 'In Progress'
        ? t('profile.present')
        : monthYear(row.workedTillMonth, row.workedTillYear, i18n.language);
    return till ? `${from} ${t('profile.to')} ${till}` : from;
  };

  return (
    <Section
      id="projects"
      title={t('profile.projects.heading')}
      addLabel={t('profile.projects.add')}
      onAdd={() => open(blankProject)}
    >
      {rows.length === 0 ? (
        <EmptyHint onClick={() => open(blankProject)}>{t('profile.projects.empty')}</EmptyHint>
      ) : (
        <ul className="space-y-5">
          {rows.map((row) => (
            <li key={row.subscriberProjectId}>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-navy dark:text-gray-100">{row.title}</p>
                <RowEdit onClick={() => open(row)} label={tCommon('actions.edit')} />
              </div>
              {(row.clientName || row.projectSite) && (
                <p className="text-navy dark:text-gray-200">
                  {row.clientName}
                  {row.projectSite && ` (${t(`profile.projectSites.${row.projectSite}`)})`}
                </p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {[
                  period(row),
                  row.natureOfEmployment && t(`profile.employmentTypes.${row.natureOfEmployment}`),
                  row.teamSize != null ? t('profile.projects.teamOf', { count: row.teamSize }) : '',
                ]
                  .filter(Boolean)
                  .join(' | ')}
              </p>
              {row.roleDescr && <p className="text-sm text-navy dark:text-gray-200">{row.roleDescr}</p>}
              {row.details && (
                <p className="mt-1 whitespace-pre-line text-sm text-navy dark:text-gray-200">{row.details}</p>
              )}
              {row.skillsUsed.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {row.skillsUsed.map((s) => (
                    <span
                      key={s}
                      className="rounded-full border border-gray-200 px-2.5 py-0.5 text-xs text-gray-600 dark:border-gray-600 dark:text-gray-300"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={t('profile.projects.heading')} className="max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('profile.projects.title')}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <Input
            label={t('profile.projects.client')}
            value={draft.clientName}
            onChange={(e) => patch({ clientName: e.target.value })}
          />
          <Select
            label={t('profile.projects.status')}
            options={PROJECT_STATUSES.map((s) => ({ label: t(`profile.projectStatuses.${s}`), value: s }))}
            value={draft.projectStatus}
            onChange={(e) => patch({ projectStatus: e.target.value })}
          />
          <Select
            label={t('profile.projects.site')}
            placeholder={tCommon('labels.select')}
            options={PROJECT_SITES.map((s) => ({ label: t(`profile.projectSites.${s}`), value: s }))}
            value={draft.projectSite}
            onChange={(e) => patch({ projectSite: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('profile.projects.fromMonth')}
              placeholder={tCommon('labels.select')}
              options={months}
              value={draft.workedFromMonth ?? ''}
              onChange={(e) => patch({ workedFromMonth: e.target.value ? Number(e.target.value) : null })}
            />
            <Select
              label={t('profile.projects.fromYear')}
              placeholder={tCommon('labels.select')}
              options={years}
              value={draft.workedFromYear ?? ''}
              onChange={(e) => patch({ workedFromYear: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          {/* An in-progress project has no end date, so the fields are hidden rather than
              left to contradict the status. */}
          {!inProgress && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('profile.projects.tillMonth')}
                placeholder={tCommon('labels.select')}
                options={months}
                value={draft.workedTillMonth ?? ''}
                onChange={(e) => patch({ workedTillMonth: e.target.value ? Number(e.target.value) : null })}
              />
              <Select
                label={t('profile.projects.tillYear')}
                placeholder={tCommon('labels.select')}
                options={years}
                value={draft.workedTillYear ?? ''}
                onChange={(e) => patch({ workedTillYear: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          )}
          <Select
            label={t('profile.projects.nature')}
            placeholder={tCommon('labels.select')}
            options={EMPLOYMENT_TYPES.map((e) => ({ label: t(`profile.employmentTypes.${e}`), value: e }))}
            value={draft.natureOfEmployment}
            onChange={(e) => patch({ natureOfEmployment: e.target.value })}
          />
          <Input
            label={t('profile.projects.teamSize')}
            type="number"
            min={1}
            value={draft.teamSize ?? ''}
            onChange={(e) => patch({ teamSize: e.target.value ? Number(e.target.value) : null })}
          />
          <Input
            label={t('profile.projects.role')}
            value={draft.roleDescr}
            onChange={(e) => patch({ roleDescr: e.target.value })}
          />
          <Input
            label={t('profile.projects.skillsUsed')}
            value={skillsText}
            onChange={(e) => setSkillsText(e.target.value)}
            placeholder={t('profile.projects.skillsPlaceholder')}
          />
        </div>
        <div className="mt-4">
          <Textarea
            label={t('profile.projects.details')}
            rows={4}
            maxLength={4000}
            value={draft.details}
            onChange={(e) => patch({ details: e.target.value })}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {draft.subscriberProjectId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger"
              onClick={() => setConfirmId(draft.subscriberProjectId)}
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('actions.delete')}
            </Button>
          ) : (
            <span />
          )}
          <DialogActions
            onCancel={() => setEditing(null)}
            onSave={() =>
              save.mutate(
                {
                  subscriberProjectId: draft.subscriberProjectId || undefined,
                  title: draft.title,
                  clientName: draft.clientName || undefined,
                  projectStatus: draft.projectStatus,
                  workedFromMonth: draft.workedFromMonth ?? undefined,
                  workedFromYear: draft.workedFromYear ?? undefined,
                  workedTillMonth: inProgress ? undefined : (draft.workedTillMonth ?? undefined),
                  workedTillYear: inProgress ? undefined : (draft.workedTillYear ?? undefined),
                  projectSite: draft.projectSite,
                  natureOfEmployment: draft.natureOfEmployment,
                  teamSize: draft.teamSize ?? undefined,
                  roleDescr: draft.roleDescr || undefined,
                  skillsUsed: skillsText.split(',').map((s) => s.trim()).filter(Boolean),
                  details: draft.details || undefined,
                },
                handlers,
              )
            }
            isLoading={save.isPending}
            disabled={!draft.title.trim()}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmId !== null}
        title={t('profile.projects.deleteTitle')}
        message={t('profile.deleteMessage')}
        variant="danger"
        isLoading={remove.isPending}
        onCancel={() => setConfirmId(null)}
        onConfirm={() =>
          confirmId !== null &&
          remove.mutate(confirmId, {
            onSuccess: () => {
              setConfirmId(null);
              setEditing(null);
            },
          })
        }
      />
    </Section>
  );
}
