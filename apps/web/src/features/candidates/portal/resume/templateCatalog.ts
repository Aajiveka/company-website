/**
 * The resume templates, as data. Each is a {@link Theme}; ResumeDocument in templates.tsx
 * draws any of them from the same resume, so adding one is an entry here and nothing else.
 *
 * Kept apart from the components so the page can import the list without breaking fast refresh.
 */

export type TemplateId =
  | 'overleaf'
  | 'classic'
  | 'ats'
  | 'modern'
  | 'executive'
  | 'minimal'
  | 'creative'
  | 'compact'
  | 'timeline'
  | 'elegant'
  | 'bold';

export type HeadingStyle =
  'rule' | 'plain' | 'bar' | 'centered' | 'pill' | 'underline' | 'smallcaps';
export type Layout = 'single' | 'sidebar-left' | 'sidebar-right' | 'labels';
export type HeaderStyle = 'left' | 'center' | 'band' | 'badge';

export interface Theme {
  layout: Layout;
  header: HeaderStyle;
  heading: HeadingStyle;
  font: string;
  /** Headings, links and accents. */
  accent: string;
  /** A pale tint of the accent for chips and pills. */
  accentSoft: string;
  ink: string;
  muted: string;
  /** Header band / sidebar background and text, for the layouts that have one. */
  panel?: string;
  panelInk?: string;
  panelMuted?: string;
  skills: 'chips' | 'comma' | 'list';
  timeline?: boolean;
  /** Smaller type and tighter spacing, for long histories. */
  dense?: boolean;
  photo?: boolean;
  /**
   * Typeset like the LaTeX resumes people build on Overleaf (Jake's Resume): Computer Modern,
   * small-caps headings over a rule, two-line entries with italics on the second, bullets.
   */
  latex?: boolean;
}

export interface ResumeTemplate {
  id: TemplateId;
  label: string;
  blurb: string;
  theme: Theme;
}

const SANS = 'Inter, "Helvetica Neue", Helvetica, Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';
/** CMU Serif is self-hosted (styles/index.css); the rest are fallbacks while it loads. */
const LATEX =
  '"CMU Serif", "Latin Modern Roman", "Computer Modern Serif", "Times New Roman", Times, serif';

export const TEMPLATES: ResumeTemplate[] = [
  {
    id: 'overleaf',
    label: 'Overleaf',
    blurb: 'LaTeX look, ATS-friendly',
    theme: {
      layout: 'single',
      header: 'center',
      heading: 'smallcaps',
      font: LATEX,
      accent: '#000000',
      accentSoft: '#ffffff',
      ink: '#000000',
      muted: '#000000',
      skills: 'comma',
      latex: true,
    },
  },
  {
    id: 'classic',
    label: 'Classic',
    blurb: 'Headings with a rule',
    theme: {
      layout: 'single',
      header: 'left',
      heading: 'rule',
      font: SANS,
      accent: '#1e3a8a',
      accentSoft: '#eff3ff',
      ink: '#111827',
      muted: '#4b5563',
      skills: 'chips',
    },
  },
  {
    id: 'ats',
    label: 'ATS Pro',
    blurb: 'Plain, parser-friendly',
    theme: {
      layout: 'single',
      header: 'left',
      heading: 'plain',
      font: 'Arial, Helvetica, sans-serif',
      accent: '#000000',
      accentSoft: '#ffffff',
      ink: '#000000',
      muted: '#333333',
      skills: 'comma',
    },
  },
  {
    id: 'modern',
    label: 'Modern Sidebar',
    blurb: 'Dark sidebar, photo',
    theme: {
      layout: 'sidebar-left',
      header: 'left',
      heading: 'underline',
      font: SANS,
      accent: '#2563eb',
      accentSoft: '#e8efff',
      ink: '#0f172a',
      muted: '#475569',
      panel: '#1e293b',
      panelInk: '#f8fafc',
      panelMuted: '#cbd5e1',
      skills: 'list',
      photo: true,
    },
  },
  {
    id: 'executive',
    label: 'Executive',
    blurb: 'Navy band, gold accents',
    theme: {
      layout: 'single',
      header: 'band',
      heading: 'rule',
      font: SANS,
      accent: '#a07a3c',
      accentSoft: '#f7f1e6',
      ink: '#0f2a4a',
      muted: '#4a5b70',
      panel: '#0f2a4a',
      panelInk: '#ffffff',
      panelMuted: '#d5dde8',
      skills: 'chips',
      photo: true,
    },
  },
  {
    id: 'minimal',
    label: 'Minimal',
    blurb: 'Quiet labels, lots of air',
    theme: {
      layout: 'labels',
      header: 'left',
      heading: 'plain',
      font: SANS,
      accent: '#52525b',
      accentSoft: '#f4f4f5',
      ink: '#18181b',
      muted: '#71717a',
      skills: 'comma',
    },
  },
  {
    id: 'creative',
    label: 'Creative',
    blurb: 'Teal badge and side panel',
    theme: {
      layout: 'sidebar-right',
      header: 'badge',
      heading: 'pill',
      font: SANS,
      accent: '#0f766e',
      accentSoft: '#e6f6f4',
      ink: '#134e4a',
      muted: '#4b6b68',
      panel: '#f0faf8',
      panelInk: '#134e4a',
      panelMuted: '#4b6b68',
      skills: 'chips',
      photo: true,
    },
  },
  {
    id: 'compact',
    label: 'Compact',
    blurb: 'Dense, fits more on a page',
    theme: {
      layout: 'single',
      header: 'left',
      heading: 'rule',
      font: SANS,
      accent: '#4338ca',
      accentSoft: '#eef0ff',
      ink: '#1e1b4b',
      muted: '#4b5563',
      skills: 'comma',
      dense: true,
    },
  },
  {
    id: 'timeline',
    label: 'Timeline',
    blurb: 'Career drawn as a timeline',
    theme: {
      layout: 'single',
      header: 'center',
      heading: 'bar',
      font: SANS,
      accent: '#7c3aed',
      accentSoft: '#f3eeff',
      ink: '#1f1235',
      muted: '#5b5370',
      skills: 'chips',
      timeline: true,
    },
  },
  {
    id: 'elegant',
    label: 'Elegant',
    blurb: 'Serif, centred, refined',
    theme: {
      layout: 'single',
      header: 'center',
      heading: 'centered',
      font: SERIF,
      accent: '#7f1d1d',
      accentSoft: '#fbf1f1',
      ink: '#1c1917',
      muted: '#57534e',
      skills: 'comma',
    },
  },
  {
    id: 'bold',
    label: 'Bold',
    blurb: 'Black header, amber bars',
    theme: {
      layout: 'single',
      header: 'band',
      heading: 'bar',
      font: SANS,
      accent: '#d97706',
      accentSoft: '#fff7e6',
      ink: '#111827',
      muted: '#4b5563',
      panel: '#111827',
      panelInk: '#ffffff',
      panelMuted: '#d1d5db',
      skills: 'chips',
    },
  },
];

export const templateById = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0]!;

/** Whether a template's continuation pages should run edge to edge (a sidebar would show a gap). */
export const isFullBleed = (id: TemplateId) => templateById(id).theme.layout.startsWith('sidebar');

/** A4 at 96 dpi. Fixing the sheet width keeps the PDF identical on every screen size. */
export const SHEET_WIDTH = 794;
export const SHEET_HEIGHT = 1123;
