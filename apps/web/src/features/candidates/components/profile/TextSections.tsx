import { useState } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import { useUpdateHeadline, useUpdateKeySkills, useUpdateSummary } from '../../candidate.api';
import { EmptyHint, Section } from './section';
import { useDraft, useSaveHandlers } from './sectionState';

/** Cancel / Save pair every section dialog ends with. */
export function DialogActions({
  onCancel,
  onSave,
  isLoading,
  disabled,
}: {
  onCancel: () => void;
  onSave: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation('common');
  return (
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        {t('actions.cancel')}
      </Button>
      <Button type="button" size="sm" onClick={onSave} isLoading={isLoading} disabled={disabled}>
        {t('actions.save')}
      </Button>
    </div>
  );
}

/* -------------------------------- Headline -------------------------------- */

export function HeadlineSection({ headline }: { headline: string }) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const save = useUpdateHeadline();
  const handlers = useSaveHandlers(() => setOpen(false));
  const [draft, , setDraft] = useDraft(headline, open);

  return (
    <Section id="headline" title={t('profile.headline.heading')} onEdit={() => setOpen(true)}>
      {headline ? (
        <p className="text-navy dark:text-gray-200">{headline}</p>
      ) : (
        <EmptyHint onClick={() => setOpen(true)}>{t('profile.headline.empty')}</EmptyHint>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('profile.headline.heading')} className="max-w-lg">
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{t('profile.headline.help')}</p>
        <Textarea
          rows={3}
          maxLength={500}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('profile.headline.placeholder')}
        />
        <DialogActions
          onCancel={() => setOpen(false)}
          onSave={() => save.mutate({ resumeHeadline: draft }, handlers)}
          isLoading={save.isPending}
        />
      </Modal>
    </Section>
  );
}

/* --------------------------------- Summary -------------------------------- */

export function SummarySection({ summary }: { summary: string }) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const save = useUpdateSummary();
  const handlers = useSaveHandlers(() => setOpen(false));
  const [draft, , setDraft] = useDraft(summary, open);

  return (
    <Section id="summary" title={t('profile.summary.heading')} onEdit={() => setOpen(true)}>
      {summary ? (
        <p className="whitespace-pre-line text-navy dark:text-gray-200">{summary}</p>
      ) : (
        <EmptyHint onClick={() => setOpen(true)}>{t('profile.summary.empty')}</EmptyHint>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('profile.summary.heading')} className="max-w-lg">
        <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{t('profile.summary.help')}</p>
        <Textarea
          rows={7}
          maxLength={4000}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('profile.summary.placeholder')}
        />
        <DialogActions
          onCancel={() => setOpen(false)}
          onSave={() => save.mutate({ profileSummary: draft }, handlers)}
          isLoading={save.isPending}
        />
      </Modal>
    </Section>
  );
}

/* -------------------------------- Key skills ------------------------------ */

/**
 * Chips, added one at a time.
 *
 * The API matches each name against tblMstrTags and silently drops anything unmatched —
 * creating master tags is administration, not a candidate action — so the dialog offers the
 * known skills rather than letting the candidate type into a void.
 */
export function KeySkillsSection({
  skills,
  suggestions,
}: {
  skills: string[];
  suggestions: string[];
}) {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const save = useUpdateKeySkills();
  const handlers = useSaveHandlers(() => setOpen(false));
  const [draft, , setDraft] = useDraft(skills, open);

  const add = (name: string) => {
    const clean = name.trim();
    if (!clean || draft.some((s) => s.toLowerCase() === clean.toLowerCase())) return;
    setDraft([...draft, clean]);
    setTyped('');
  };

  const matches = suggestions
    .filter((s) => !draft.some((d) => d.toLowerCase() === s.toLowerCase()))
    .filter((s) => (typed ? s.toLowerCase().includes(typed.toLowerCase()) : true))
    .slice(0, 12);

  return (
    <Section id="key-skills" title={t('profile.keySkills.heading')} onEdit={() => setOpen(true)}>
      {skills.length ? (
        <div className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <span
              key={s}
              className="rounded-full border border-gray-200 px-3 py-1 text-sm text-navy dark:border-gray-600 dark:text-gray-200"
            >
              {s}
            </span>
          ))}
        </div>
      ) : (
        <EmptyHint onClick={() => setOpen(true)}>{t('profile.keySkills.empty')}</EmptyHint>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t('profile.keySkills.heading')} className="max-w-lg">
        <div className="mb-3 flex flex-wrap gap-2">
          {draft.map((s) => (
            <span
              key={s}
              className="flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-sm text-primary"
            >
              {s}
              <button
                type="button"
                onClick={() => setDraft(draft.filter((d) => d !== s))}
                aria-label={t('profile.keySkills.remove', { skill: s })}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
          {draft.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('profile.keySkills.none')}</p>
          )}
        </div>

        <Input
          label={t('profile.keySkills.addLabel')}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(typed);
            }
          }}
          placeholder={t('profile.keySkills.addPlaceholder')}
        />

        {matches.length > 0 && (
          <div className="mt-3">
            <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">{t('profile.keySkills.suggested')}</p>
            <div className="flex flex-wrap gap-2">
              {matches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => add(s)}
                  className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-sm text-gray-600 transition hover:border-primary hover:text-primary dark:border-gray-600 dark:text-gray-300"
                >
                  + {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <DialogActions
          onCancel={() => setOpen(false)}
          onSave={() => save.mutate({ tagNames: draft }, handlers)}
          isLoading={save.isPending}
        />
      </Modal>
    </Section>
  );
}
