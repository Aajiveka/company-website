import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, ConfirmDialog, Input, Modal, Select, Textarea } from '@/components/ui';
import {
  useDeleteAccomplishment,
  useDeleteCertificate,
  useUpsertAccomplishment,
  useUpsertCertificate,
} from '../../candidate.api';
import {
  ACCOMPLISHMENT_KINDS,
  type AccomplishmentKind,
  type CvAccomplishmentEntry,
  type CvCertificateEntry,
} from '../../candidate.types';
import { RowEdit, Section } from './section';
import { monthOptions, monthYear, useDraft, useSaveHandlers, yearOptions } from './sectionState';
import { DialogActions } from './TextSections';

/**
 * Accomplishments — five link-shaped kinds plus certifications.
 *
 * They share one card because that is how they are read: a recruiter scans "what else has
 * this person put their name to". The five kinds share a table and a dialog since each is
 * (title, link, description, date); certifications keep their own richer form because a
 * credential also carries an id and a validity window.
 */

/** Which fields each kind actually asks for. */
const KIND_FIELDS: Record<AccomplishmentKind, { url: boolean; descr: boolean; date: boolean; patent: boolean }> = {
  ONLINE_PROFILE: { url: true, descr: true, date: false, patent: false },
  WORK_SAMPLE: { url: true, descr: true, date: false, patent: false },
  PUBLICATION: { url: true, descr: true, date: true, patent: false },
  PRESENTATION: { url: true, descr: true, date: true, patent: false },
  PATENT: { url: true, descr: true, date: true, patent: true },
};

const blankEntry = (kind: AccomplishmentKind): CvAccomplishmentEntry => ({
  subscriberAccomplishmentId: 0,
  kind,
  title: '',
  url: '',
  descr: '',
  eventMonth: null,
  eventYear: null,
  patentStatus: '',
  patentOffice: '',
});

const blankCertificate: CvCertificateEntry = {
  subscriberCertificateId: 0,
  certificateName: '',
  certificateUrl: '',
  certificationId: '',
  validFromMonth: null,
  validFromYear: null,
  validTillMonth: null,
  validTillYear: null,
  neverExpires: false,
};

export function AccomplishmentsSection({
  accomplishments,
  certificates,
}: {
  accomplishments: CvAccomplishmentEntry[];
  certificates: CvCertificateEntry[];
}) {
  const { t, i18n } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
  const [editing, setEditing] = useState<CvAccomplishmentEntry | null>(null);
  const [editingCert, setEditingCert] = useState<CvCertificateEntry | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [confirmCertId, setConfirmCertId] = useState<number | null>(null);

  const save = useUpsertAccomplishment();
  const remove = useDeleteAccomplishment();
  const saveCert = useUpsertCertificate();
  const removeCert = useDeleteCertificate();
  const handlers = useSaveHandlers(() => setEditing(null));
  const certHandlers = useSaveHandlers(() => setEditingCert(null));

  const [draft, patch] = useDraft(editing ?? blankEntry('ONLINE_PROFILE'), !!editing);
  const [cert, patchCert] = useDraft(editingCert ?? blankCertificate, !!editingCert);

  const months = monthOptions(i18n.language);
  const years = yearOptions(40);
  const fields = KIND_FIELDS[draft.kind];

  const validity = (c: CvCertificateEntry) => {
    const from = monthYear(c.validFromMonth, c.validFromYear, i18n.language);
    if (!from) return '';
    if (c.neverExpires) return t('profile.accomplishments.validFromNoExpiry', { from });
    const till = monthYear(c.validTillMonth, c.validTillYear, i18n.language);
    return till ? t('profile.accomplishments.validRange', { from, till }) : from;
  };

  return (
    <Section id="accomplishments" title={t('profile.accomplishments.heading')}>
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {ACCOMPLISHMENT_KINDS.map((kind) => {
          const rows = accomplishments.filter((a) => a.kind === kind);
          return (
            <div key={kind} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-navy dark:text-gray-100">{t(`profile.accomplishments.kinds.${kind}`)}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t(`profile.accomplishments.hints.${kind}`)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(blankEntry(kind))}
                  className="shrink-0 text-sm font-medium text-primary hover:underline"
                >
                  {t('profile.add')}
                </button>
              </div>

              {rows.length > 0 && (
                <ul className="mt-3 space-y-3">
                  {rows.map((row) => (
                    <li key={row.subscriberAccomplishmentId}>
                      <div className="flex items-center gap-2">
                        <p className="text-navy dark:text-gray-200">{row.title}</p>
                        <RowEdit onClick={() => setEditing(row)} label={tCommon('actions.edit')} />
                      </div>
                      {row.url && (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="break-all text-sm font-medium text-primary hover:underline"
                        >
                          {row.url}
                        </a>
                      )}
                      {row.descr && (
                        <p className="text-sm text-gray-600 dark:text-gray-300">{row.descr}</p>
                      )}
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {[
                          monthYear(row.eventMonth, row.eventYear, i18n.language),
                          row.patentStatus,
                          row.patentOffice,
                        ]
                          .filter(Boolean)
                          .join(' | ')}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}

        {/* Certifications live in their own table, but belong in this block visually. */}
        <div className="py-4 last:pb-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-navy dark:text-gray-100">
                {t('profile.accomplishments.certification')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('profile.accomplishments.certificationHint')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditingCert(blankCertificate)}
              className="shrink-0 text-sm font-medium text-primary hover:underline"
            >
              {t('profile.add')}
            </button>
          </div>

          {certificates.length > 0 && (
            <ul className="mt-3 space-y-3">
              {certificates.map((c) => (
                <li key={c.subscriberCertificateId}>
                  <div className="flex items-center gap-2">
                    <p className="text-navy dark:text-gray-200">{c.certificateName}</p>
                    <RowEdit onClick={() => setEditingCert(c)} label={tCommon('actions.edit')} />
                  </div>
                  {c.certificateUrl && (
                    <a
                      href={c.certificateUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="break-all text-sm font-medium text-primary hover:underline"
                    >
                      {c.certificateUrl}
                    </a>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400">{validity(c)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* One dialog for the five link-shaped kinds. */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={t(`profile.accomplishments.kinds.${draft.kind}`)}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label={t(`profile.accomplishments.titleLabels.${draft.kind}`)}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          {fields.url && (
            <Input
              label={t('profile.accomplishments.url')}
              value={draft.url}
              onChange={(e) => patch({ url: e.target.value })}
              placeholder="https://"
            />
          )}
          {fields.date && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('profile.accomplishments.month')}
                placeholder={tCommon('labels.select')}
                options={months}
                value={draft.eventMonth ?? ''}
                onChange={(e) => patch({ eventMonth: e.target.value ? Number(e.target.value) : null })}
              />
              <Select
                label={t('profile.accomplishments.year')}
                placeholder={tCommon('labels.select')}
                options={years}
                value={draft.eventYear ?? ''}
                onChange={(e) => patch({ eventYear: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          )}
          {fields.patent && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label={t('profile.accomplishments.patentStatus')}
                placeholder={tCommon('labels.select')}
                options={['Filed', 'Granted'].map((s) => ({
                  label: t(`profile.accomplishments.patentStatuses.${s}`),
                  value: s,
                }))}
                value={draft.patentStatus}
                onChange={(e) => patch({ patentStatus: e.target.value })}
              />
              <Input
                label={t('profile.accomplishments.patentOffice')}
                value={draft.patentOffice}
                onChange={(e) => patch({ patentOffice: e.target.value })}
              />
            </div>
          )}
          {fields.descr && (
            <Textarea
              label={t('profile.accomplishments.description')}
              rows={3}
              maxLength={4000}
              value={draft.descr}
              onChange={(e) => patch({ descr: e.target.value })}
            />
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {draft.subscriberAccomplishmentId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger"
              onClick={() => setConfirmId(draft.subscriberAccomplishmentId)}
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
                  subscriberAccomplishmentId: draft.subscriberAccomplishmentId || undefined,
                  kind: draft.kind,
                  title: draft.title,
                  url: draft.url || undefined,
                  descr: draft.descr || undefined,
                  eventMonth: draft.eventMonth ?? undefined,
                  eventYear: draft.eventYear ?? undefined,
                  patentStatus: draft.patentStatus || undefined,
                  patentOffice: draft.patentOffice || undefined,
                },
                handlers,
              )
            }
            isLoading={save.isPending}
            disabled={!draft.title.trim()}
          />
        </div>
      </Modal>

      {/* Certifications carry an id and a validity window, so they get their own form. */}
      <Modal
        open={!!editingCert}
        onClose={() => setEditingCert(null)}
        title={t('profile.accomplishments.certification')}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label={t('profile.accomplishments.certificateName')}
            value={cert.certificateName}
            onChange={(e) => patchCert({ certificateName: e.target.value })}
          />
          <Input
            label={t('profile.accomplishments.url')}
            value={cert.certificateUrl}
            onChange={(e) => patchCert({ certificateUrl: e.target.value })}
            placeholder="https://"
          />
          <Input
            label={t('profile.accomplishments.certificationId')}
            value={cert.certificationId}
            onChange={(e) => patchCert({ certificationId: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label={t('profile.accomplishments.validFromMonth')}
              placeholder={tCommon('labels.select')}
              options={months}
              value={cert.validFromMonth ?? ''}
              onChange={(e) => patchCert({ validFromMonth: e.target.value ? Number(e.target.value) : null })}
            />
            <Select
              label={t('profile.accomplishments.validFromYear')}
              placeholder={tCommon('labels.select')}
              options={years}
              value={cert.validFromYear ?? ''}
              onChange={(e) => patchCert({ validFromYear: e.target.value ? Number(e.target.value) : null })}
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-navy dark:text-gray-200">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30"
              checked={cert.neverExpires}
              onChange={(e) => patchCert({ neverExpires: e.target.checked })}
            />
            {t('profile.accomplishments.neverExpires')}
          </label>
          {!cert.neverExpires && (
            <div className="grid grid-cols-2 gap-3">
              <Select
                label={t('profile.accomplishments.validTillMonth')}
                placeholder={tCommon('labels.select')}
                options={months}
                value={cert.validTillMonth ?? ''}
                onChange={(e) => patchCert({ validTillMonth: e.target.value ? Number(e.target.value) : null })}
              />
              <Select
                label={t('profile.accomplishments.validTillYear')}
                placeholder={tCommon('labels.select')}
                options={years}
                value={cert.validTillYear ?? ''}
                onChange={(e) => patchCert({ validTillYear: e.target.value ? Number(e.target.value) : null })}
              />
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          {cert.subscriberCertificateId ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-danger text-danger hover:bg-danger"
              onClick={() => setConfirmCertId(cert.subscriberCertificateId)}
            >
              <Trash2 className="h-4 w-4" />
              {tCommon('actions.delete')}
            </Button>
          ) : (
            <span />
          )}
          <DialogActions
            onCancel={() => setEditingCert(null)}
            onSave={() =>
              saveCert.mutate(
                {
                  subscriberCertificateId: cert.subscriberCertificateId || undefined,
                  certificateName: cert.certificateName,
                  certificateUrl: cert.certificateUrl || undefined,
                  certificationId: cert.certificationId || undefined,
                  validFromMonth: cert.validFromMonth ?? undefined,
                  validFromYear: cert.validFromYear ?? undefined,
                  validTillMonth: cert.neverExpires ? undefined : (cert.validTillMonth ?? undefined),
                  validTillYear: cert.neverExpires ? undefined : (cert.validTillYear ?? undefined),
                  neverExpires: cert.neverExpires,
                },
                certHandlers,
              )
            }
            isLoading={saveCert.isPending}
            disabled={!cert.certificateName.trim()}
          />
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmId !== null}
        title={t('profile.accomplishments.deleteTitle')}
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
      <ConfirmDialog
        isOpen={confirmCertId !== null}
        title={t('profile.accomplishments.deleteCertTitle')}
        message={t('profile.deleteMessage')}
        variant="danger"
        isLoading={removeCert.isPending}
        onCancel={() => setConfirmCertId(null)}
        onConfirm={() =>
          confirmCertId !== null &&
          removeCert.mutate(confirmCertId, {
            onSuccess: () => {
              setConfirmCertId(null);
              setEditingCert(null);
            },
          })
        }
      />
    </Section>
  );
}
