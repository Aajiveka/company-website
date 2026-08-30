import { Link } from 'react-router-dom';
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { computeCompletion } from '../../profileCompletion';
import type { CvEditProfile } from '../../candidate.types';
import { Card, CardBody, CardHeader } from './primitives';
import { stepHref, type WizardStepKey } from '../wizardSteps';

/**
 * What the hero's percentage is made of, section by section.
 *
 * The banner shows only the number, which tells a candidate they are unfinished without
 * telling them what is unfinished. This lists every section with the points it is worth
 * and links the incomplete ones straight to the wizard step that fills them.
 *
 * Labels are written here rather than pulled from the `completion.*` bundle: the rest of
 * the portal hardcodes its English the same way, and the bundle's phrasing ("Education
 * (at least one entry)") is written for the old dashboard checklist.
 */
const SECTIONS: Record<string, { label: string; step: WizardStepKey | null; note?: string }> = {
  // Every section maps to the wizard step that writes its fields. The photo is the one
  // exception: it is uploaded from the hero's pencil, not from any step, so its row has no
  // link and says where to go instead.
  personalDetails: { label: 'Personal details', step: 'personal' },
  photo: { label: 'Profile photo', step: null, note: 'Use the pencil on your photo above' },
  headline: { label: 'Resume headline', step: 'personal' },
  keySkills: { label: 'Key skills', step: 'skills' },
  // Absent from a fresher's list entirely — see FRESHER_WEIGHTS in profileCompletion.
  employment: { label: 'Work experience', step: 'experience' },
  education: { label: 'Education', step: 'education' },
  projects: { label: 'Projects', step: 'projects' },
  summary: { label: 'Profile summary', step: 'summary' },
  accomplishments: { label: 'Certifications & accomplishments', step: 'skills' },
  careerProfile: { label: 'Job preferences', step: 'preferences' },
  languages: { label: 'Languages', step: 'skills' },
};

export function ProfileCompletionCard({ cv }: { cv: CvEditProfile }) {
  const { sections, percent } = computeCompletion(cv);
  const remaining = sections.filter((s) => !s.done);

  return (
    <Card id="completion">
      <CardHeader
        title="Profile Completion"
        action={<span className="text-sm font-bold text-aj-blue">{percent}%</span>}
      />
      <CardBody className="space-y-1">
        {remaining.length > 0 && (
          <p className="mb-2 text-xs text-slate-500 dark:text-gray-400">
            {remaining.reduce((n, s) => n + s.weight, 0)} points left across {remaining.length}{' '}
            {remaining.length === 1 ? 'section' : 'sections'}.
          </p>
        )}

        {sections.map((sec) => {
          const meta = SECTIONS[sec.key] ?? { label: sec.key, step: null };
          const row = (
            <>
              <span
                aria-hidden
                className={cn(
                  'flex size-4.5 shrink-0 items-center justify-center rounded-full border',
                  sec.done
                    ? 'border-transparent bg-[#00D492] text-white'
                    : 'border-aj-line dark:border-gray-600',
                )}
              >
                {sec.done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate', sec.done ? '' : 'font-semibold')}>
                  {meta.label}
                </span>
                {!sec.done && meta.note && (
                  <span className="block text-xs font-normal text-slate-400 dark:text-gray-500">
                    {meta.note}
                  </span>
                )}
              </span>
              <span className={cn('shrink-0 text-xs tabular-nums', sec.done ? 'text-slate-400' : 'text-aj-blue')}>
                {sec.done ? `${sec.weight}` : `+${sec.weight}`}
              </span>
            </>
          );

          const base =
            'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm';
          const tone = sec.done
            ? 'text-slate-500 dark:text-gray-400'
            : 'text-slate-800 dark:text-gray-100';

          // A section with no step has nowhere to go; a plain row is honest about that,
          // where a link would just do nothing when clicked.
          return meta.step && !sec.done ? (
            <Link
              key={sec.key}
              to={stepHref(meta.step)}
              className={cn(base, tone, 'transition-colors hover:bg-aj-canvas dark:hover:bg-gray-700/50')}
            >
              {row}
              <ChevronRight className="size-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          ) : (
            <div key={sec.key} className={cn(base, tone)}>
              {row}
            </div>
          );
        })}
      </CardBody>
    </Card>
  );
}
