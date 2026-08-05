import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, LocationSelect, Modal, Select } from '@/components/ui';
import { useUpdateProfessional } from '../../candidate.api';
import type { CvMasters, CvProfessional } from '../../candidate.types';
import { Field, Section } from './section';
import { useDraft, useSaveHandlers } from './sectionState';
import { DialogActions } from './TextSections';

/**
 * What the candidate is doing now — the axes recruiters filter on (function, primary skill,
 * experience, current pay, notice, where they are). Career profile covers what they want
 * next; this covers where they stand today, and both feed job matching.
 */
export function ProfessionalSection({ data, masters }: { data: CvProfessional; masters?: CvMasters }) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const save = useUpdateProfessional();
  const handlers = useSaveHandlers(() => setOpen(false));
  const [draft, patch] = useDraft(data, open);

  const name = (id: number | null, list?: { id: number; label: string }[]) =>
    list?.find((o) => o.id === id)?.label ?? '';

  return (
    <Section id="professional" title={t('profile.professional.heading')} onEdit={() => setOpen(true)}>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label={t('profile.professional.function')} value={name(data.subFunctionId, masters?.subFunctions)} />
        <Field label={t('profile.professional.primarySkill')} value={name(data.skillId, masters?.skills)} />
        <Field
          label={t('profile.professional.totalExperience')}
          value={data.totalExp ? t('profile.years', { count: data.totalExp }) : ''}
        />
        <Field
          label={t('profile.professional.currentCtc')}
          value={data.currentCtc != null ? `₹${data.currentCtc.toLocaleString('en-IN')}` : ''}
        />
        <Field label={t('profile.professional.currentLocation')} value={name(data.currentCityId, masters?.cities)} />
        <Field
          label={t('profile.professional.noticePeriod')}
          value={data.noticePeriod != null ? t('profile.noticeDays', { count: data.noticePeriod }) : ''}
        />
        <Field
          label={t('profile.professional.relocate')}
          value={t(data.flgReadyToRelocate ? 'profile.yes' : 'profile.no')}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('profile.professional.heading')} className="max-w-2xl">
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('profile.professional.function')}
            placeholder={tCommon('labels.select')}
            options={(masters?.subFunctions ?? []).map((o) => ({ label: o.label, value: o.id }))}
            value={draft.subFunctionId ?? ''}
            onChange={(e) => patch({ subFunctionId: e.target.value ? Number(e.target.value) : null })}
          />
          <Select
            label={t('profile.professional.primarySkill')}
            placeholder={tCommon('labels.select')}
            options={(masters?.skills ?? []).map((o) => ({ label: o.label, value: o.id }))}
            value={draft.skillId ?? ''}
            onChange={(e) => patch({ skillId: e.target.value ? Number(e.target.value) : null })}
          />
          <Input
            label={t('profile.professional.totalExperience')}
            type="number"
            min={0}
            value={draft.totalExp || ''}
            onChange={(e) => patch({ totalExp: e.target.value ? Number(e.target.value) : 0 })}
          />
          <Input
            label={t('profile.professional.currentCtc')}
            type="number"
            min={0}
            value={draft.currentCtc ?? ''}
            onChange={(e) => patch({ currentCtc: e.target.value ? Number(e.target.value) : null })}
          />
          <LocationSelect
            label={t('profile.professional.currentLocation')}
            placeholder={tCommon('labels.selectLocation')}
            states={masters?.states}
            cities={masters?.cities}
            value={draft.currentCityId ?? undefined}
            onChange={(currentCityId) => patch({ currentCityId: currentCityId ?? null })}
          />
          <Input
            label={t('profile.professional.noticePeriod')}
            type="number"
            min={0}
            value={draft.noticePeriod ?? ''}
            onChange={(e) => patch({ noticePeriod: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-navy dark:text-gray-200">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
            checked={draft.flgReadyToRelocate}
            onChange={(e) => patch({ flgReadyToRelocate: e.target.checked })}
          />
          {t('profile.professional.relocate')}
        </label>

        <DialogActions
          onCancel={() => setOpen(false)}
          onSave={() =>
            save.mutate(
              {
                subFunctionId: draft.subFunctionId,
                skillId: draft.skillId,
                industryTypeId: draft.industryTypeId,
                totalExp: draft.totalExp,
                currentCtc: draft.currentCtc,
                currentCityId: draft.currentCityId,
                noticePeriod: draft.noticePeriod,
                flgReadyToRelocate: draft.flgReadyToRelocate,
                // Preferred locations and key skills have their own editors. The endpoint
                // replaces whichever of them it is sent, so this dialog omits both.
              },
              handlers,
            )
          }
          isLoading={save.isPending}
        />
      </Modal>
    </Section>
  );
}
