import { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  ConfirmDialog,
  Input,
  LocationMultiSelect,
  Modal,
  Select,
  useToast,
} from '@/components/ui';
import {
  useDeleteLanguage,
  useUpdateCareerProfile,
  useUpdateDiversity,
  useUpdatePersonal,
  useUpdatePersonalDetails,
  useUpsertLanguage,
} from '../../candidate.api';
import {
  CAREER_BREAK_STATUSES,
  CATEGORIES,
  DISABILITY_STATUSES,
  EMPLOYMENT_TYPES,
  JOB_TYPES,
  MARITAL_STATUSES,
  MILITARY_STATUSES,
  SHIFTS,
  type CvCareerProfile,
  type CvDiversity,
  type CvLanguageEntry,
  type CvMasters,
  type CvPersonal,
  type CvPersonalDetails,
  type LanguageProficiency,
} from '../../candidate.types';
import { EmptyHint, Field, RowEdit, Section } from './section';
import { useDraft, useSaveHandlers } from './sectionState';
import { DialogActions } from './TextSections';

/** Checkbox group for the "can be more than one" preferences. */
function CheckGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-navy dark:text-gray-200">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-2 text-sm text-navy dark:text-gray-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
              checked={value.includes(o.value)}
              onChange={(e) =>
                onChange(e.target.checked ? [...value, o.value] : value.filter((v) => v !== o.value))
              }
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/* ----------------------------- Career profile ----------------------------- */

export function CareerProfileSection({
  data,
  masters,
}: {
  data: CvCareerProfile;
  masters?: CvMasters;
}) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [rolesText, setRolesText] = useState('');
  const save = useUpdateCareerProfile();
  const handlers = useSaveHandlers(() => setOpen(false));
  const [draft, patch] = useDraft(data, open);

  const industry = masters?.industries.find((i) => i.id === data.industryTypeId)?.label ?? '';
  const cityNames = data.preferredCityIds
    .map((id) => masters?.cities.find((c) => c.id === id)?.label)
    .filter(Boolean)
    .join(', ');

  const list = (values: string[], prefix: string) => values.map((v) => t(`${prefix}.${v}`)).join(', ');

  return (
    <Section
      id="career-profile"
      title={t('profile.careerProfile.heading')}
      onEdit={() => {
        setRolesText(data.preferredJobRoles.join(', '));
        setOpen(true);
      }}
    >
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label={t('profile.careerProfile.industry')} value={industry} />
        <Field label={t('profile.careerProfile.department')} value={data.department} />
        <Field label={t('profile.careerProfile.roleCategory')} value={data.roleCategory} />
        <Field label={t('profile.careerProfile.jobRole')} value={data.jobRole} />
        <Field
          label={t('profile.careerProfile.desiredJobType')}
          value={list(data.desiredJobType, 'profile.jobTypes')}
        />
        <Field
          label={t('profile.careerProfile.desiredEmploymentType')}
          value={list(data.desiredEmploymentType, 'profile.employmentTypes')}
        />
        <Field label={t('profile.careerProfile.preferredRoles')} value={data.preferredJobRoles.join(', ')} />
        <Field label={t('profile.careerProfile.preferredLocations')} value={cityNames} />
        <Field
          label={t('profile.careerProfile.preferredSalary')}
          value={data.preferredSalary != null ? `₹${data.preferredSalary.toLocaleString('en-IN')}` : ''}
        />
        <Field
          label={t('profile.careerProfile.shift')}
          value={data.preferredShift ? t(`profile.shifts.${data.preferredShift}`) : ''}
        />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('profile.careerProfile.heading')} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('profile.careerProfile.industry')}
              placeholder={tCommon('labels.select')}
              options={(masters?.industries ?? []).map((i) => ({ label: i.label, value: i.id }))}
              value={draft.industryTypeId ?? ''}
              onChange={(e) => patch({ industryTypeId: e.target.value ? Number(e.target.value) : null })}
            />
            <Input
              label={t('profile.careerProfile.department')}
              value={draft.department}
              onChange={(e) => patch({ department: e.target.value })}
            />
            <Input
              label={t('profile.careerProfile.roleCategory')}
              value={draft.roleCategory}
              onChange={(e) => patch({ roleCategory: e.target.value })}
            />
            <Input
              label={t('profile.careerProfile.jobRole')}
              value={draft.jobRole}
              onChange={(e) => patch({ jobRole: e.target.value })}
            />
            <Input
              label={t('profile.careerProfile.preferredSalary')}
              type="number"
              min={0}
              value={draft.preferredSalary ?? ''}
              onChange={(e) => patch({ preferredSalary: e.target.value ? Number(e.target.value) : null })}
            />
            <Select
              label={t('profile.careerProfile.shift')}
              placeholder={tCommon('labels.select')}
              options={SHIFTS.map((s) => ({ label: t(`profile.shifts.${s}`), value: s }))}
              value={draft.preferredShift}
              onChange={(e) => patch({ preferredShift: e.target.value })}
            />
          </div>

          <CheckGroup
            label={t('profile.careerProfile.desiredJobType')}
            options={JOB_TYPES.map((v) => ({ value: v, label: t(`profile.jobTypes.${v}`) }))}
            value={draft.desiredJobType}
            onChange={(desiredJobType) => patch({ desiredJobType })}
          />
          <CheckGroup
            label={t('profile.careerProfile.desiredEmploymentType')}
            options={EMPLOYMENT_TYPES.map((v) => ({ value: v, label: t(`profile.employmentTypes.${v}`) }))}
            value={draft.desiredEmploymentType}
            onChange={(desiredEmploymentType) => patch({ desiredEmploymentType })}
          />

          <Input
            label={t('profile.careerProfile.preferredRoles')}
            value={rolesText}
            onChange={(e) => setRolesText(e.target.value)}
            placeholder={t('profile.careerProfile.preferredRolesPlaceholder')}
          />
          <LocationMultiSelect
            label={t('profile.careerProfile.preferredLocations')}
            placeholder={tCommon('labels.selectLocation')}
            states={masters?.states}
            cities={masters?.cities}
            value={draft.preferredCityIds}
            onChange={(preferredCityIds) => patch({ preferredCityIds })}
          />
        </div>

        <DialogActions
          onCancel={() => setOpen(false)}
          onSave={() =>
            save.mutate(
              {
                industryTypeId: draft.industryTypeId ?? undefined,
                department: draft.department,
                roleCategory: draft.roleCategory,
                jobRole: draft.jobRole,
                desiredJobType: draft.desiredJobType,
                desiredEmploymentType: draft.desiredEmploymentType,
                preferredShift: draft.preferredShift,
                preferredSalary: draft.preferredSalary ?? undefined,
                preferredJobRoles: rolesText.split(',').map((s) => s.trim()).filter(Boolean),
                preferredCityIds: draft.preferredCityIds,
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

/* ---------------------------- Personal details ---------------------------- */

const PROFICIENCIES: LanguageProficiency[] = [1, 2, 3];

const blankLanguage: CvLanguageEntry = {
  subscriberLanguageId: 0,
  languageName: '',
  proficiencyId: 1,
  canRead: false,
  canWrite: false,
  canSpeak: false,
};

export function PersonalDetailsSection({
  details,
  personal,
  languages,
  gender,
  masters,
}: {
  details: CvPersonalDetails;
  personal: CvPersonal | null;
  languages: CvLanguageEntry[];
  gender: string;
  masters?: CvMasters;
}) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const { notify } = useToast();
  const [open, setOpen] = useState(false);
  const [editingLang, setEditingLang] = useState<CvLanguageEntry | null>(null);
  const [confirmLangId, setConfirmLangId] = useState<number | null>(null);
  const [traitsText, setTraitsText] = useState('');
  const [permitsText, setPermitsText] = useState('');

  const saveDetails = useUpdatePersonalDetails();
  const savePersonal = useUpdatePersonal();
  const saveLang = useUpsertLanguage();
  const removeLang = useDeleteLanguage();
  const langHandlers = useSaveHandlers(() => setEditingLang(null));

  const [draft, patch] = useDraft({ ...details, dob: personal?.dob ?? '', address: personal?.address ?? '' }, open);
  const [lang, patchLang] = useDraft(editingLang ?? blankLanguage, !!editingLang);

  const dob = personal?.dob
    ? new Date(personal.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';
  const city = masters?.cities.find((c) => c.id === personal?.cityId)?.label ?? '';
  const address = [personal?.address, city].filter(Boolean).join(', ');
  const workPermit = [details.usWorkPermit, ...details.workPermitCountries].filter(Boolean).join(', ');
  const personalLine = [gender, details.maritalStatus, ...details.personalTraits].filter(Boolean).join(', ');

  /**
   * Saving writes to two endpoints: date of birth and address belong to the legacy CV row,
   * the rest to the new extras row. Personal goes first and carries the fields it owns
   * unchanged — that endpoint replaces the whole row, so omitting them would blank them.
   */
  const saveAll = () => {
    if (!personal) return;
    savePersonal.mutate(
      { ...personal, dob: draft.dob, address: draft.address },
      {
        onError: () => notify(t('profile.saveError'), 'error'),
        onSuccess: () =>
          saveDetails.mutate(
            {
              maritalStatus: draft.maritalStatus,
              personalTraits: traitsText.split(',').map((s) => s.trim()).filter(Boolean),
              category: draft.category,
              workPermitCountries: permitsText.split(',').map((s) => s.trim()).filter(Boolean),
              usWorkPermit: draft.usWorkPermit,
            },
            {
              onSuccess: () => {
                notify(t('profile.saved'), 'success');
                setOpen(false);
              },
              onError: () => notify(t('profile.saveError'), 'error'),
            },
          ),
      },
    );
  };

  const tick = (on: boolean) =>
    on ? (
      <Check className="h-4 w-4 text-green-600 dark:text-green-400" aria-label={tCommon('actions.confirm')} />
    ) : (
      <span className="text-gray-300 dark:text-gray-600">—</span>
    );

  return (
    <Section
      id="personal-details"
      title={t('profile.personalDetails.heading')}
      onEdit={() => {
        setTraitsText(details.personalTraits.join(', '));
        setPermitsText(details.workPermitCountries.join(', '));
        setOpen(true);
      }}
    >
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field label={t('profile.personalDetails.personal')} value={personalLine} />
        <Field label={t('profile.personalDetails.workPermit')} value={workPermit} />
        <Field label={t('profile.personalDetails.dob')} value={dob} />
        <Field label={t('profile.personalDetails.address')} value={address} />
        <Field label={t('profile.personalDetails.category')} value={details.category} />
      </div>

      {/* Languages */}
      <div className="mt-6 border-t border-gray-200 pt-4 dark:border-gray-700">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-navy dark:text-gray-100">{t('profile.languages.heading')}</h3>
          <button
            type="button"
            onClick={() => setEditingLang(blankLanguage)}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t('profile.languages.add')}
          </button>
        </div>

        {languages.length === 0 ? (
          <EmptyHint onClick={() => setEditingLang(blankLanguage)}>{t('profile.languages.empty')}</EmptyHint>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="py-2 pr-4 font-normal">{t('profile.languages.language')}</th>
                  <th className="py-2 pr-4 font-normal">{t('profile.languages.proficiency')}</th>
                  <th className="py-2 pr-4 font-normal">{t('profile.languages.read')}</th>
                  <th className="py-2 pr-4 font-normal">{t('profile.languages.write')}</th>
                  <th className="py-2 pr-4 font-normal">{t('profile.languages.speak')}</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {languages.map((l) => (
                  <tr
                    key={l.subscriberLanguageId}
                    className="border-b border-gray-100 last:border-0 dark:border-gray-700/60"
                  >
                    <td className="py-3 pr-4 font-medium text-navy dark:text-gray-100">{l.languageName}</td>
                    <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                      {t(`profile.languages.levels.${l.proficiencyId}`)}
                    </td>
                    <td className="py-3 pr-4">{tick(l.canRead)}</td>
                    <td className="py-3 pr-4">{tick(l.canWrite)}</td>
                    <td className="py-3 pr-4">{tick(l.canSpeak)}</td>
                    <td className="py-3 text-right">
                      <RowEdit onClick={() => setEditingLang(l)} label={tCommon('actions.edit')} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t('profile.personalDetails.heading')}
        className="max-w-2xl"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('profile.personalDetails.maritalStatus')}
            placeholder={tCommon('labels.select')}
            options={MARITAL_STATUSES.map((m) => ({ label: t(`profile.maritalStatuses.${m}`), value: m }))}
            value={draft.maritalStatus}
            onChange={(e) => patch({ maritalStatus: e.target.value })}
          />
          <Select
            label={t('profile.personalDetails.category')}
            placeholder={tCommon('labels.select')}
            options={CATEGORIES.map((c) => ({ label: t(`profile.categories.${c}`), value: c }))}
            value={draft.category}
            onChange={(e) => patch({ category: e.target.value })}
          />
          <Input
            label={t('profile.personalDetails.dob')}
            type="date"
            value={draft.dob}
            onChange={(e) => patch({ dob: e.target.value })}
          />
          <Input
            label={t('profile.personalDetails.address')}
            value={draft.address}
            onChange={(e) => patch({ address: e.target.value })}
          />
          <Input
            label={t('profile.personalDetails.usWorkPermit')}
            value={draft.usWorkPermit}
            onChange={(e) => patch({ usWorkPermit: e.target.value })}
            placeholder={t('profile.personalDetails.usWorkPermitPlaceholder')}
          />
          <Input
            label={t('profile.personalDetails.workPermitCountries')}
            value={permitsText}
            onChange={(e) => setPermitsText(e.target.value)}
            placeholder={t('profile.personalDetails.workPermitPlaceholder')}
          />
          <Input
            label={t('profile.personalDetails.traits')}
            value={traitsText}
            onChange={(e) => setTraitsText(e.target.value)}
            placeholder={t('profile.personalDetails.traitsPlaceholder')}
          />
        </div>

        <DialogActions
          onCancel={() => setOpen(false)}
          onSave={saveAll}
          isLoading={savePersonal.isPending || saveDetails.isPending}
          disabled={!personal}
        />
      </Modal>

      <Modal
        open={!!editingLang}
        onClose={() => setEditingLang(null)}
        title={t('profile.languages.heading')}
        className="max-w-lg"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t('profile.languages.language')}
            value={lang.languageName}
            onChange={(e) => patchLang({ languageName: e.target.value })}
          />
          <Select
            label={t('profile.languages.proficiency')}
            options={PROFICIENCIES.map((p) => ({ label: t(`profile.languages.levels.${p}`), value: p }))}
            value={lang.proficiencyId}
            onChange={(e) => patchLang({ proficiencyId: Number(e.target.value) as LanguageProficiency })}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          {(['canRead', 'canWrite', 'canSpeak'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 text-sm text-navy dark:text-gray-200">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
                checked={lang[key]}
                onChange={(e) => patchLang({ [key]: e.target.checked } as Partial<CvLanguageEntry>)}
              />
              {t(`profile.languages.${key}`)}
            </label>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {lang.subscriberLanguageId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger"
              onClick={() => setConfirmLangId(lang.subscriberLanguageId)}
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('actions.delete')}
            </Button>
          ) : (
            <span />
          )}
          <DialogActions
            onCancel={() => setEditingLang(null)}
            onSave={() =>
              saveLang.mutate(
                {
                  subscriberLanguageId: lang.subscriberLanguageId || undefined,
                  languageName: lang.languageName,
                  proficiencyId: lang.proficiencyId,
                  canRead: lang.canRead,
                  canWrite: lang.canWrite,
                  canSpeak: lang.canSpeak,
                },
                langHandlers,
              )
            }
            isLoading={saveLang.isPending}
            disabled={!lang.languageName.trim()}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmLangId !== null}
        title={t('profile.languages.deleteTitle')}
        message={t('profile.deleteMessage')}
        variant="danger"
        isLoading={removeLang.isPending}
        onCancel={() => setConfirmLangId(null)}
        onConfirm={() =>
          confirmLangId !== null &&
          removeLang.mutate(confirmLangId, {
            onSuccess: () => {
              setConfirmLangId(null);
              setEditingLang(null);
            },
          })
        }
      />
    </Section>
  );
}

/* ------------------------------- Diversity -------------------------------- */

export function DiversitySection({ data }: { data: CvDiversity }) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const save = useUpdateDiversity();
  const handlers = useSaveHandlers(() => setOpen(false));
  const [draft, patch] = useDraft(data, open);

  const hasDisability = draft.disabilityStatus === 'Have disability';
  const serving = draft.militaryStatus === 'Currently serving' || draft.militaryStatus === 'Veteran';
  const onBreak = draft.careerBreakStatus === 'Have taken';

  const period = (from: string, to: string) => {
    if (!from) return '';
    const fmt = (iso: string) =>
      new Date(iso).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    return `${fmt(from)} - ${to ? fmt(to) : t('profile.present')}`;
  };

  const careerBreak = data.careerBreakStatus
    ? [
        t(`profile.careerBreakStatuses.${data.careerBreakStatus}`),
        data.careerBreakReason,
        period(data.careerBreakFrom, data.careerBreakTo),
      ]
        .filter(Boolean)
        .join(', ')
    : '';

  return (
    <Section id="diversity" title={t('profile.diversity.heading')} onEdit={() => setOpen(true)}>
      <p className="-mt-2 mb-4 text-sm text-gray-500 dark:text-gray-400">{t('profile.diversity.help')}</p>
      <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <Field
          label={t('profile.diversity.disability')}
          value={
            data.disabilityStatus
              ? [
                  t(`profile.disabilityStatuses.${data.disabilityStatus}`),
                  data.disabilityType,
                  data.disabilityPercent != null ? `${data.disabilityPercent}%` : '',
                ]
                  .filter(Boolean)
                  .join(', ')
              : ''
          }
        />
        <Field
          label={t('profile.diversity.military')}
          value={
            data.militaryStatus
              ? [
                  t(`profile.militaryStatuses.${data.militaryStatus}`),
                  data.militaryServiceType,
                  data.militaryRank,
                ]
                  .filter(Boolean)
                  .join(', ')
              : ''
          }
        />
        <Field label={t('profile.diversity.careerBreak')} value={careerBreak} />
        <Field label={t('profile.diversity.assistance')} value={data.assistanceRequired} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('profile.diversity.heading')} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('profile.diversity.disability')}
              placeholder={tCommon('labels.select')}
              options={DISABILITY_STATUSES.map((s) => ({ label: t(`profile.disabilityStatuses.${s}`), value: s }))}
              value={draft.disabilityStatus}
              onChange={(e) => patch({ disabilityStatus: e.target.value })}
            />
            {hasDisability && (
              <>
                <Input
                  label={t('profile.diversity.disabilityType')}
                  value={draft.disabilityType}
                  onChange={(e) => patch({ disabilityType: e.target.value })}
                />
                <Input
                  label={t('profile.diversity.disabilityPercent')}
                  type="number"
                  min={0}
                  max={100}
                  value={draft.disabilityPercent ?? ''}
                  onChange={(e) => patch({ disabilityPercent: e.target.value ? Number(e.target.value) : null })}
                />
                <Input
                  label={t('profile.diversity.assistance')}
                  value={draft.assistanceRequired}
                  onChange={(e) => patch({ assistanceRequired: e.target.value })}
                />
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('profile.diversity.military')}
              placeholder={tCommon('labels.select')}
              options={MILITARY_STATUSES.map((s) => ({ label: t(`profile.militaryStatuses.${s}`), value: s }))}
              value={draft.militaryStatus}
              onChange={(e) => patch({ militaryStatus: e.target.value })}
            />
            {serving && (
              <>
                <Input
                  label={t('profile.diversity.serviceType')}
                  value={draft.militaryServiceType}
                  onChange={(e) => patch({ militaryServiceType: e.target.value })}
                />
                <Input
                  label={t('profile.diversity.rank')}
                  value={draft.militaryRank}
                  onChange={(e) => patch({ militaryRank: e.target.value })}
                />
                <Input
                  label={t('profile.diversity.enrolmentDate')}
                  type="date"
                  value={draft.militaryEnrolmentDate}
                  onChange={(e) => patch({ militaryEnrolmentDate: e.target.value })}
                />
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={t('profile.diversity.careerBreak')}
              placeholder={tCommon('labels.select')}
              options={CAREER_BREAK_STATUSES.map((s) => ({ label: t(`profile.careerBreakStatuses.${s}`), value: s }))}
              value={draft.careerBreakStatus}
              onChange={(e) => patch({ careerBreakStatus: e.target.value })}
            />
            {onBreak && (
              <>
                <Input
                  label={t('profile.diversity.breakReason')}
                  value={draft.careerBreakReason}
                  onChange={(e) => patch({ careerBreakReason: e.target.value })}
                />
                <Input
                  label={t('profile.diversity.breakFrom')}
                  type="date"
                  value={draft.careerBreakFrom}
                  onChange={(e) => patch({ careerBreakFrom: e.target.value })}
                />
                {/* Left empty while the break is ongoing — the profile then prints "Present". */}
                <Input
                  label={t('profile.diversity.breakTo')}
                  type="date"
                  value={draft.careerBreakTo}
                  onChange={(e) => patch({ careerBreakTo: e.target.value })}
                />
              </>
            )}
          </div>
        </div>

        <DialogActions
          onCancel={() => setOpen(false)}
          onSave={() =>
            save.mutate(
              {
                disabilityStatus: draft.disabilityStatus,
                disabilityType: hasDisability ? draft.disabilityType : '',
                disabilityPercent: hasDisability ? (draft.disabilityPercent ?? undefined) : undefined,
                assistanceRequired: hasDisability ? draft.assistanceRequired : '',
                militaryStatus: draft.militaryStatus,
                militaryServiceType: serving ? draft.militaryServiceType : '',
                militaryRank: serving ? draft.militaryRank : '',
                militaryEnrolmentDate: serving ? draft.militaryEnrolmentDate || undefined : undefined,
                careerBreakStatus: draft.careerBreakStatus,
                careerBreakReason: onBreak ? draft.careerBreakReason : '',
                careerBreakFrom: onBreak ? draft.careerBreakFrom || undefined : undefined,
                careerBreakTo: onBreak ? draft.careerBreakTo || undefined : undefined,
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
