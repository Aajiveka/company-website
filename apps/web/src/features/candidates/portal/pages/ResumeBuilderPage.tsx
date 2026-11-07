import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Download, Eye, Pencil, Plus } from 'lucide-react';
import { useToast } from '@/components/ui';
import { cn } from '@/lib/cn';
import { useCvEditProfile, useCvMasters } from '../../candidate.api';
import { ModuleHeader } from '../components/ModuleFrame';
import { Btn, Card, CardBody, CardHeader, SkeletonRows } from '../components/primitives';
import { CertificationEditor } from '../components/CertificationEditor';
import { computeResumeScore, type SectionState } from '../resumeScore';
import { stepHref, type WizardStepKey } from '../wizardSteps';
import { buildResumeData } from '../resume/resumeData';
import { exportResumePdf } from '../resume/exportPdf';
import { ResumeDocument, ResumeSectionPreview, type SectionKey } from '../resume/templates';
import {
  isFullBleed,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TEMPLATES,
  type TemplateId,
} from '../resume/templateCatalog';

type SectionId =
  'personal' | 'summary' | 'experience' | 'education' | 'projects' | 'skills' | 'certifications';

/**
 * The editor's left rail: the sections a wizard step owns, so "Edit" always has somewhere to go,
 * and which parts of the resume each one shows.
 */
const SECTIONS: {
  id: SectionId;
  label: string;
  step: WizardStepKey;
  shows: (SectionKey | 'header')[];
}[] = [
  {
    id: 'personal',
    label: 'Personal Info',
    step: 'personal',
    shows: ['header', 'snapshot', 'personal', 'preferences'],
  },
  { id: 'summary', label: 'Summary', step: 'summary', shows: ['summary'] },
  { id: 'experience', label: 'Work Experience', step: 'experience', shows: ['experience'] },
  { id: 'education', label: 'Education', step: 'education', shows: ['education'] },
  { id: 'projects', label: 'Projects', step: 'projects', shows: ['projects'] },
  { id: 'skills', label: 'Skills', step: 'skills', shows: ['skills', 'itSkills', 'languages'] },
  {
    id: 'certifications',
    label: 'Certifications',
    step: 'skills',
    shows: ['certifications', 'accomplishments'],
  },
];

const TEMPLATE_KEY = 'aj.resumeTemplate';

/** The last template this browser chose. Storage can be unavailable, so it is never required. */
function savedTemplate(): TemplateId {
  try {
    const id = localStorage.getItem(TEMPLATE_KEY);
    if (TEMPLATES.some((t) => t.id === id)) return id as TemplateId;
  } catch {
    /* private mode or blocked storage — fall back to the default */
  }
  return 'overleaf';
}

/**
 * Resume Builder — Figma nodes 7:6743 through 7:7714.
 *
 * Reads the same CV the profile does, so there is no second copy of a candidate's history to
 * drift: the builder chooses one of eleven templates and exports, and every "Edit" goes to the
 * wizard step that owns the data.
 */
export default function ResumeBuilderPage() {
  const { data: cv, isLoading } = useCvEditProfile();
  const { data: masters } = useCvMasters();
  const { notify } = useToast();

  const [section, setSection] = useState<SectionId>('personal');
  const [template, setTemplate] = useState<TemplateId>(savedTemplate);
  const [preview, setPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  const scoring = useMemo(() => (cv ? computeResumeScore(cv) : null), [cv]);
  const data = useMemo(() => (cv ? buildResumeData(cv, masters) : null), [cv, masters]);

  useEffect(() => {
    try {
      localStorage.setItem(TEMPLATE_KEY, template);
    } catch {
      /* not worth surfacing — the choice just will not be remembered */
    }
  }, [template]);

  const onDownload = async () => {
    const node = sheetRef.current?.querySelector<HTMLElement>('[data-resume-sheet]');
    if (!node || !data) {
      notify('Your resume is still loading. Try again in a moment.', 'error');
      return;
    }
    setExporting(true);
    try {
      await exportResumePdf(node, `${data.name.replace(/\s+/g, '_')}_Resume.pdf`, {
        fullBleed: isFullBleed(template),
      });
    } catch {
      notify('Could not build the PDF. Try printing the preview instead.', 'error');
    } finally {
      setExporting(false);
    }
  };

  if (isLoading || !cv || !scoring || !data) {
    return (
      <>
        <ModuleHeader title="Resume Builder" />
        <Card>
          <CardBody>
            <SkeletonRows rows={4} />
          </CardBody>
        </Card>
      </>
    );
  }

  const current = SECTIONS.find((s) => s.id === section) ?? SECTIONS[0]!;

  return (
    <>
      <ModuleHeader
        title="Resume Builder"
        action={
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={() => setPreview((v) => !v)}>
              <Eye className="size-4" aria-hidden />
              {preview ? 'Edit view' : 'Preview'}
            </Btn>
            <Btn onClick={onDownload} disabled={exporting}>
              <Download className="size-4" aria-hidden />
              {exporting ? 'Building…' : 'Download'}
            </Btn>
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader title="Templates" />
        <CardBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {TEMPLATES.map((t) => {
              const active = template === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  // The thumbnail is a whole resume; without this its text would be the button's name.
                  aria-label={`${t.label} template`}
                  aria-pressed={active}
                  onClick={() => {
                    setTemplate(t.id);
                    setPreview(true);
                  }}
                  className={cn(
                    'group rounded-xl border p-2 text-left transition-colors',
                    active
                      ? 'border-aj-blue bg-blue-50 ring-2 ring-aj-blue/30 dark:bg-blue-950'
                      : 'border-aj-line hover:border-aj-blue dark:border-gray-700',
                  )}
                >
                  <div
                    aria-hidden
                    className="relative overflow-hidden rounded-md border border-aj-line bg-white shadow-sm dark:border-gray-700"
                  >
                    <ScaledSheet crop>
                      <ResumeDocument data={data} templateId={t.id} />
                    </ScaledSheet>
                    {active && (
                      <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-aj-blue text-white">
                        <Check className="size-3.5" />
                      </span>
                    )}
                  </div>
                  <span className="mt-2 block text-[13px] font-bold text-slate-800 dark:text-gray-100">
                    {t.label}
                  </span>
                  <span className="block text-[11px] text-slate-500">{t.blurb}</span>
                </button>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[200px_1fr_200px] lg:items-start">
        <Card>
          <CardHeader title="Sections" />
          <CardBody className="space-y-1">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setSection(s.id);
                  setPreview(false);
                }}
                aria-current={!preview && section === s.id ? 'true' : undefined}
                className={cn(
                  'block w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium transition-colors',
                  !preview && section === s.id
                    ? 'bg-blue-50 text-aj-blue dark:bg-blue-950'
                    : 'text-slate-600 hover:bg-aj-canvas dark:text-gray-300 dark:hover:bg-gray-700',
                )}
              >
                {s.label}
              </button>
            ))}
            {/* "Add Section" in the design opens the wizard, which is where a section that
                has no content yet actually gets filled in. */}
            <Link
              to={stepHref('personal')}
              className="mt-1 flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-semibold text-aj-blue transition-colors hover:bg-blue-50 dark:hover:bg-blue-950"
            >
              <Plus className="size-4" aria-hidden />
              Add Section
            </Link>
          </CardBody>
        </Card>

        {/* Sheet */}
        <Card className="min-w-0">
          <CardHeader
            title={
              preview
                ? `Preview · ${TEMPLATES.find((t) => t.id === template)?.label}`
                : current.label
            }
            action={
              !preview && (
                <Link
                  to={stepHref(current.step)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-aj-blue hover:text-aj-blue-hover"
                >
                  <Pencil className="size-3.5" aria-hidden />
                  Edit
                </Link>
              )
            }
          />
          <CardBody>
            {preview ? (
              <div className="overflow-hidden rounded-md border border-aj-line shadow-sm dark:border-gray-700">
                <ScaledSheet>
                  <ResumeDocument data={data} templateId={template} />
                </ScaledSheet>
              </div>
            ) : (
              <>
                {section === 'experience' && (
                  <div className="mb-4">
                    <Link
                      to={stepHref('experience')}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-aj-blue px-4 py-2 text-[13px] font-semibold text-aj-blue transition-colors hover:bg-blue-50 dark:hover:bg-blue-950"
                    >
                      <Plus className="size-4" aria-hidden />
                      Add Experience
                    </Link>
                  </div>
                )}
                {section === 'certifications' ? (
                  // The only section the design gives its own form rather than a preview.
                  <CertificationEditor rows={cv.certificates} />
                ) : (
                  <div className="rounded-md bg-white p-6">
                    <ResumeSectionPreview
                      data={data}
                      templateId={template}
                      sections={current.shows}
                    />
                  </div>
                )}
              </>
            )}
          </CardBody>
        </Card>

        {/* Score */}
        <Card>
          <CardHeader title="Resume Score" />
          <CardBody>
            <div className="text-center">
              <div className="font-display text-4xl font-bold text-aj-blue">{scoring.score}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-aj-line">
                <div
                  className="h-full rounded-full bg-aj-blue transition-[width]"
                  style={{ width: `${scoring.score}%` }}
                />
              </div>
            </div>
            <ul className="mt-4 space-y-2">
              {scoring.sections.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-2 text-xs">
                  <span className="truncate text-slate-600 dark:text-gray-300">{s.label}</span>
                  <span className={cn('shrink-0 font-semibold', STATE_CLASS[s.state])}>
                    {s.hint}
                  </span>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/*
        What Download exports: the whole resume in the chosen template at full A4 width, kept out
        of view and rendered whatever the editor is showing. Exporting the on-screen node used to
        produce a one-section PDF — or, on the Certifications tab, no PDF at all.
      */}
      <div
        aria-hidden
        data-export-sheet
        ref={sheetRef}
        className="pointer-events-none fixed top-0 -left-[10000px]"
        style={{ width: SHEET_WIDTH }}
      >
        <ResumeDocument data={data} templateId={template} />
      </div>
    </>
  );
}

const STATE_CLASS: Record<SectionState, string> = {
  complete: 'text-emerald-600',
  partial: 'text-amber-600',
  missing: 'text-slate-400',
};

/**
 * Draws an A4 sheet scaled down to the width it is given. `crop` shows the first page only —
 * what a thumbnail needs; without it the frame grows with the resume.
 */
function ScaledSheet({ children, crop = false }: { children: ReactNode; crop?: boolean }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const [height, setHeight] = useState(SHEET_HEIGHT);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const update = () => {
      if (outer.clientWidth) setScale(outer.clientWidth / SHEET_WIDTH);
      setHeight(innerRef.current?.offsetHeight || SHEET_HEIGHT);
    };
    update();
    // jsdom has no ResizeObserver; the initial measurement is enough there.
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(outer);
    if (innerRef.current) observer.observe(innerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={outerRef}
      className="relative overflow-hidden bg-white"
      style={{ height: (crop ? SHEET_HEIGHT : height) * scale }}
    >
      <div
        ref={innerRef}
        className="absolute left-0 top-0"
        style={{ width: SHEET_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}
      >
        {children}
      </div>
    </div>
  );
}
