import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, ConfirmDialog, Input, Modal, Select, Textarea } from '@/components/ui';
import {
  useDeleteEducation,
  useDeleteEmployment,
  useUpsertEducation,
  useUpsertEmployment,
} from '../../candidate.api';
import {
  COURSE_MODES,
  type CvEducationEntry,
  type CvEmploymentEntry,
  type CvMasters,
} from '../../candidate.types';
import { EmptyHint, RowEdit, Section } from './section';
import { useDraft, useSaveHandlers, yearOptions } from './sectionState';
import { DialogActions } from './TextSections';

const opts = (list?: { id: number; label: string }[]) => (list ?? []).map((o) => ({ label: o.label, value: o.id }));

/** "2 yrs 5 mos" — how long a stint lasted, from the dates the candidate gave. */
function useDuration() {
  const { t } = useTranslation('dashboard');
  return (from: string, to: string, isCurrent: boolean) => {
    if (!from) return '';
    const start = new Date(from);
    const end = isCurrent || !to ? new Date() : new Date(to);
    const months = Math.max(0, (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth());
    const y = Math.floor(months / 12);
    const m = months % 12;
    const parts = [
      ...(y ? [t('profile.years', { count: y })] : []),
      ...(m || !y ? [t('profile.months', { count: m })] : []),
    ];
    return parts.join(' ');
  };
}

/* ------------------------------- Employment ------------------------------- */

const blankEmployment: CvEmploymentEntry = {
  subscriberEmployerId: 0,
  employer: '',
  designationId: null,
  employeeTypeId: null,
  joiningDate: '',
  releavingDate: '',
  flgCurrent: false,
  salary: null,
  jobDescr: '',
  noticePeriodDays: null,
};

export function EmploymentSection({ rows, masters }: { rows: CvEmploymentEntry[]; masters?: CvMasters }) {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [editing, setEditing] = useState<CvEmploymentEntry | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const save = useUpsertEmployment();
  const remove = useDeleteEmployment();
  const handlers = useSaveHandlers(() => setEditing(null));
  const durationOf = useDuration();
  const [draft, patch] = useDraft(editing ?? blankEmployment, !!editing);

  const label = (id: number | null, list?: { id: number; label: string }[]) =>
    list?.find((o) => o.id === id)?.label ?? '';
  const monthYear = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' })
      : '';

  return (
    <Section
      id="employment"
      title={t('profile.employment.heading')}
      addLabel={t('profile.employment.add')}
      onAdd={() => setEditing(blankEmployment)}
    >
      {rows.length === 0 ? (
        <EmptyHint onClick={() => setEditing(blankEmployment)}>{t('profile.employment.empty')}</EmptyHint>
      ) : (
        <ul className="space-y-5">
          {rows.map((row) => (
            <li key={row.subscriberEmployerId}>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-navy dark:text-gray-100">
                  {label(row.designationId, masters?.designations) || t('profile.employment.untitledRole')}
                </p>
                <RowEdit onClick={() => setEditing(row)} label={tCommon('actions.edit')} />
              </div>
              <p className="text-navy dark:text-gray-200">{row.employer}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {[
                  label(row.employeeTypeId, masters?.employmentTypes),
                  row.joiningDate &&
                    `${monthYear(row.joiningDate)} ${t('profile.to')} ${
                      row.flgCurrent ? t('profile.present') : monthYear(row.releavingDate)
                    } (${durationOf(row.joiningDate, row.releavingDate, row.flgCurrent)})`,
                ]
                  .filter(Boolean)
                  .join(' | ')}
              </p>
              {row.noticePeriodDays != null && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('profile.employment.notice', { count: row.noticePeriodDays })}
                </p>
              )}
              {row.jobDescr && (
                <p className="mt-1 whitespace-pre-line text-sm text-navy dark:text-gray-200">{row.jobDescr}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t('profile.employment.heading')}
        className="max-w-2xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('profile.employment.designation')}
            placeholder={tCommon('labels.select')}
            options={opts(masters?.designations)}
            value={draft.designationId ?? ''}
            onChange={(e) => patch({ designationId: e.target.value ? Number(e.target.value) : null })}
          />
          <Input
            label={t('profile.employment.company')}
            value={draft.employer}
            onChange={(e) => patch({ employer: e.target.value })}
          />
          <Select
            label={t('profile.employment.type')}
            placeholder={tCommon('labels.select')}
            options={opts(masters?.employmentTypes)}
            value={draft.employeeTypeId ?? ''}
            onChange={(e) => patch({ employeeTypeId: e.target.value ? Number(e.target.value) : null })}
          />
          <Input
            label={t('profile.employment.salary')}
            type="number"
            value={draft.salary ?? ''}
            onChange={(e) => patch({ salary: e.target.value ? Number(e.target.value) : null })}
          />
          <Input
            label={t('profile.employment.from')}
            type="date"
            value={draft.joiningDate}
            onChange={(e) => patch({ joiningDate: e.target.value })}
          />
          <Input
            label={t('profile.employment.till')}
            type="date"
            disabled={draft.flgCurrent}
            value={draft.releavingDate}
            onChange={(e) => patch({ releavingDate: e.target.value })}
          />
          <label className="flex items-center gap-2 text-sm text-navy dark:text-gray-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
              checked={draft.flgCurrent}
              onChange={(e) => patch({ flgCurrent: e.target.checked })}
            />
            {t('profile.employment.current')}
          </label>
          {draft.flgCurrent && (
            <Input
              label={t('profile.employment.noticeDays')}
              type="number"
              value={draft.noticePeriodDays ?? ''}
              onChange={(e) => patch({ noticePeriodDays: e.target.value ? Number(e.target.value) : null })}
            />
          )}
        </div>
        <div className="mt-4">
          <Textarea
            label={t('profile.employment.description')}
            rows={4}
            maxLength={5000}
            value={draft.jobDescr}
            onChange={(e) => patch({ jobDescr: e.target.value })}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {draft.subscriberEmployerId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger"
              onClick={() => setConfirmId(draft.subscriberEmployerId)}
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
                  subscriberEmployerId: draft.subscriberEmployerId || undefined,
                  employer: draft.employer,
                  designationId: draft.designationId ?? undefined,
                  employeeTypeId: draft.employeeTypeId ?? undefined,
                  joiningDate: draft.joiningDate || undefined,
                  releavingDate: draft.flgCurrent ? undefined : draft.releavingDate || undefined,
                  flgCurrent: draft.flgCurrent,
                  salary: draft.salary ?? undefined,
                  // The description used to be dropped on save: the form never sent it, so
                  // whatever a candidate typed was gone on reload.
                  jobDescr: draft.jobDescr,
                  noticePeriodDays: draft.flgCurrent ? (draft.noticePeriodDays ?? undefined) : undefined,
                },
                handlers,
              )
            }
            isLoading={save.isPending}
            disabled={!draft.employer.trim()}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmId !== null}
        title={t('profile.employment.deleteTitle')}
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

/* -------------------------------- Education ------------------------------- */

const blankEducation: CvEducationEntry = {
  subscriberEducationId: 0,
  courseTypeId: null,
  degreeId: null,
  instituteName: '',
  passingYear: null,
  courseMode: '',
  marks: '',
};

export function EducationSection({ rows, masters }: { rows: CvEducationEntry[]; masters?: CvMasters }) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [editing, setEditing] = useState<CvEducationEntry | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const save = useUpsertEducation();
  const remove = useDeleteEducation();
  const handlers = useSaveHandlers(() => setEditing(null));
  const [draft, patch] = useDraft(editing ?? blankEducation, !!editing);

  const courseName = (id: number | null) => masters?.courses.find((c) => c.id === id)?.label ?? '';
  const degreeName = (id: number | null) => masters?.degrees.find((d) => d.id === id)?.label ?? '';

  return (
    <Section
      id="education"
      title={t('profile.education.heading')}
      addLabel={t('profile.education.add')}
      onAdd={() => setEditing(blankEducation)}
    >
      {rows.length === 0 ? (
        <EmptyHint onClick={() => setEditing(blankEducation)}>{t('profile.education.empty')}</EmptyHint>
      ) : (
        <ul className="space-y-5">
          {rows.map((row) => (
            <li key={row.subscriberEducationId}>
              <div className="flex items-center gap-2">
                <p className="font-semibold text-navy dark:text-gray-100">
                  {courseName(row.courseTypeId) || degreeName(row.degreeId)}
                </p>
                <RowEdit onClick={() => setEditing(row)} label={tCommon('actions.edit')} />
              </div>
              {row.instituteName && <p className="text-navy dark:text-gray-200">{row.instituteName}</p>}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {[row.passingYear, row.courseMode, row.marks].filter(Boolean).join(' | ')}
              </p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t('profile.education.heading')}
        className="max-w-2xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Degree (education level) first, then the course list filtered by it — the same
              cascade candidate-profile.aspx built with fnBindDegreeDropdown/fnDegree. */}
          <Select
            label={t('profile.education.degree')}
            placeholder={tCommon('labels.select')}
            options={opts(masters?.degrees)}
            value={draft.degreeId ?? ''}
            onChange={(e) =>
              patch({ degreeId: e.target.value ? Number(e.target.value) : null, courseTypeId: null })
            }
          />
          <Select
            label={t('profile.education.course')}
            placeholder={tCommon('labels.select')}
            options={opts((masters?.courses ?? []).filter((c) => c.degreeId === draft.degreeId))}
            disabled={!draft.degreeId}
            value={draft.courseTypeId ?? ''}
            onChange={(e) => patch({ courseTypeId: e.target.value ? Number(e.target.value) : null })}
          />
          <Input
            label={t('profile.education.institute')}
            value={draft.instituteName}
            onChange={(e) => patch({ instituteName: e.target.value })}
          />
          <Select
            label={t('profile.education.passingYear')}
            placeholder={tCommon('labels.select')}
            options={yearOptions()}
            value={draft.passingYear ?? ''}
            onChange={(e) => patch({ passingYear: e.target.value ? Number(e.target.value) : null })}
          />
          <Select
            label={t('profile.education.courseMode')}
            placeholder={tCommon('labels.select')}
            options={COURSE_MODES.map((m) => ({ label: t(`profile.courseModes.${m}`), value: m }))}
            value={draft.courseMode}
            onChange={(e) => patch({ courseMode: e.target.value })}
          />
          <Input
            label={t('profile.education.marks')}
            value={draft.marks}
            onChange={(e) => patch({ marks: e.target.value })}
            placeholder={t('profile.education.marksPlaceholder')}
          />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {draft.subscriberEducationId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger"
              onClick={() => setConfirmId(draft.subscriberEducationId)}
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
              draft.degreeId &&
              save.mutate(
                {
                  subscriberEducationId: draft.subscriberEducationId || undefined,
                  degreeId: draft.degreeId,
                  courseTypeId: draft.courseTypeId ?? undefined,
                  instituteName: draft.instituteName,
                  passingYear: draft.passingYear ?? undefined,
                  courseMode: draft.courseMode,
                  marks: draft.marks,
                },
                handlers,
              )
            }
            isLoading={save.isPending}
            disabled={!draft.degreeId}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmId !== null}
        title={t('profile.education.deleteTitle')}
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
