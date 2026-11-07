import type { CSSProperties, ReactNode } from 'react';
import type { ExperienceItem, Fact, ResumeData } from './resumeData';
import {
  SHEET_HEIGHT,
  SHEET_WIDTH,
  templateById,
  type TemplateId,
  type Theme,
} from './templateCatalog';

/**
 * The resume templates.
 *
 * Every template renders the same {@link ResumeData}; a template is only a {@link Theme} —
 * layout, type, colour and how headings, skills and dated entries are drawn. So adding another
 * is a new entry in TEMPLATES, never a new copy of the sections.
 *
 * Styles are inline hex values rather than Tailwind classes on purpose: the sheet is rasterised
 * into the PDF, and it must look identical in dark mode, in any app theme, and in a year when
 * the design tokens have moved on.
 *
 * Blocks that must not be split across a PDF page carry `data-keep` — see exportPdf.ts.
 */

/* ------------------------------------------------------------------ *
 * Document
 * ------------------------------------------------------------------ */

/** The sections that read as a sidebar's content when the layout has one. */
type SideSection = 'contact' | 'skills' | 'itSkills' | 'languages' | 'preferences' | 'personal';
type MainSection =
  | 'summary'
  | 'snapshot'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'accomplishments';
export type SectionKey = SideSection | MainSection;

const SINGLE_ORDER: SectionKey[] = [
  'summary',
  'snapshot',
  'experience',
  'projects',
  'education',
  'skills',
  'itSkills',
  'certifications',
  'accomplishments',
  'languages',
  'preferences',
  'personal',
];
const SIDE_ORDER: SectionKey[] = [
  'contact',
  'snapshot',
  'skills',
  'itSkills',
  'languages',
  'preferences',
  'personal',
];
const MAIN_ORDER: SectionKey[] = [
  'summary',
  'experience',
  'projects',
  'education',
  'certifications',
  'accomplishments',
];

/**
 * The Overleaf order: education before experience, as the LaTeX resumes have it, and technical
 * skills, IT skills and languages folded into one "Technical Skills" block.
 */
const LATEX_ORDER: SectionKey[] = [
  'summary',
  'snapshot',
  'education',
  'experience',
  'projects',
  'skills',
  'certifications',
  'accomplishments',
  'preferences',
  'personal',
];

export function ResumeDocument({ data, templateId }: { data: ResumeData; templateId: TemplateId }) {
  const t = templateById(templateId).theme;
  const fs = t.latex ? 13.5 : t.dense ? 11.5 : 12.5;
  const root: CSSProperties = {
    width: SHEET_WIDTH,
    minHeight: SHEET_HEIGHT,
    background: '#ffffff',
    color: t.ink,
    fontFamily: t.font,
    fontSize: fs,
    lineHeight: t.latex ? 1.3 : t.dense ? 1.35 : 1.5,
    boxSizing: 'border-box',
  };

  if (t.layout === 'sidebar-left' || t.layout === 'sidebar-right') {
    const side = (
      <aside
        style={{
          width: 250,
          flexShrink: 0,
          background: t.panel,
          color: t.panelInk,
          padding: '36px 24px',
          boxSizing: 'border-box',
        }}
      >
        {t.layout === 'sidebar-left' && t.photo && <Photo data={data} t={t} size={110} center />}
        {SIDE_ORDER.map((key) => (
          <Section key={key} id={key} data={data} t={t} side />
        ))}
      </aside>
    );
    return (
      <div
        data-resume-sheet
        style={{
          ...root,
          display: 'flex',
          flexDirection: t.layout === 'sidebar-left' ? 'row' : 'row-reverse',
        }}
      >
        {side}
        <main style={{ flex: 1, minWidth: 0, padding: '36px 34px' }}>
          <Header data={data} t={t} withContact={false} />
          {MAIN_ORDER.map((key) => (
            <Section key={key} id={key} data={data} t={t} />
          ))}
        </main>
      </div>
    );
  }

  if (t.latex) {
    return (
      <div data-resume-sheet style={{ ...root, padding: '40px 50px' }}>
        <Header data={data} t={t} withContact />
        {LATEX_ORDER.map((key) => (
          <Section key={key} id={key} data={data} t={t} />
        ))}
      </div>
    );
  }

  const band = t.header === 'band';
  return (
    <div data-resume-sheet style={root}>
      {band ? (
        <Header data={data} t={t} withContact />
      ) : (
        <div style={{ padding: t.dense ? '30px 40px 0' : '42px 48px 0' }}>
          <Header data={data} t={t} withContact />
        </div>
      )}
      <div style={{ padding: t.dense ? '6px 40px 32px' : '8px 48px 40px' }}>
        {SINGLE_ORDER.map((key) => (
          <Section key={key} id={key} data={data} t={t} labels={t.layout === 'labels'} />
        ))}
      </div>
    </div>
  );
}

/**
 * One section on its own, in the chosen template's style — what the editor's middle card shows
 * for the section picked in the left rail.
 */
export function ResumeSectionPreview({
  data,
  templateId,
  sections,
}: {
  data: ResumeData;
  templateId: TemplateId;
  sections: (SectionKey | 'header')[];
}) {
  const t = templateById(templateId).theme;
  // The sidebar palettes are dark; out of their panel the section has to read on white.
  const flat: Theme = { ...t, header: t.header === 'band' ? 'left' : t.header, panel: undefined };
  return (
    <div style={{ color: t.ink, fontFamily: t.font, fontSize: 12.5, lineHeight: 1.5 }}>
      {sections.map((s) =>
        s === 'header' ? (
          <Header key={s} data={data} t={flat} withContact />
        ) : (
          <Section key={s} id={s} data={data} t={flat} showEmpty />
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Header
 * ------------------------------------------------------------------ */

function Header({ data, t, withContact }: { data: ResumeData; t: Theme; withContact: boolean }) {
  const contact = [
    data.contact.email,
    data.contact.phone,
    data.contact.location,
    data.contact.address,
  ].filter(Boolean);
  if (t.latex) return <LatexHeader data={data} withContact={withContact} />;

  const center = t.header === 'center';
  const band = t.header === 'band';
  const ink = band ? t.panelInk! : t.ink;
  const sub = band ? t.panelMuted! : t.muted;

  const text = (
    <div style={{ minWidth: 0, flex: 1, textAlign: center ? 'center' : 'left' }}>
      <h1
        style={{
          ...UNSTYLED_HEADING,
          margin: 0,
          fontSize: t.dense ? 24 : 28,
          lineHeight: 1.15,
          fontWeight: 700,
          color: ink,
          letterSpacing: t.heading === 'centered' ? 2 : -0.3,
          textTransform: t.heading === 'centered' ? 'uppercase' : 'none',
        }}
      >
        {data.name}
      </h1>
      {data.headline && (
        <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 600, color: t.accent }}>
          {data.headline}
        </p>
      )}
      {withContact && contact.length > 0 && (
        <p style={{ margin: '8px 0 0', fontSize: 12, color: sub }}>{contact.join('  ·  ')}</p>
      )}
      {withContact && data.links.length > 0 && (
        <p style={{ margin: '2px 0 0', fontSize: 12, color: sub }}>
          {data.links.map((l) => l.label).join('  ·  ')}
        </p>
      )}
    </div>
  );

  if (band) {
    return (
      <header
        data-keep
        style={{
          background: t.panel,
          padding: '34px 48px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 22,
          borderBottom: `5px solid ${t.accent}`,
        }}
      >
        {t.photo && <Photo data={data} t={t} size={88} />}
        {text}
      </header>
    );
  }

  return (
    <header
      data-keep
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        flexDirection: center ? 'column' : 'row',
        paddingBottom: 14,
        marginBottom: 4,
        borderBottom: t.heading === 'centered' ? `1px solid ${t.accent}` : undefined,
      }}
    >
      {t.header === 'badge' && <Photo data={data} t={t} size={78} badge />}
      {text}
    </header>
  );
}

/**
 * The app's global stylesheet gives every h1/h2 the site's display font and a large
 * line-height. On a resume both are wrong, and the line-height is worse than it looks: the
 * PDF rasteriser draws the text lower in that tall box than the browser does, so a heading's
 * rule ran straight through its letters. Every heading on the sheet resets both.
 */
const UNSTYLED_HEADING: CSSProperties = { fontFamily: 'inherit', lineHeight: 1.25 };

/**
 * Centred small-caps name over one line of contacts split by bars, as \begin{center} lays it out.
 * No underlines on the email and links: the rasteriser draws text-decoration through the middle
 * of the text, and in an image PDF they are not clickable anyway.
 */
function LatexHeader({ data, withContact }: { data: ResumeData; withContact: boolean }) {
  const contact: string[] = [
    data.contact.phone,
    data.contact.email,
    data.contact.location,
    ...data.links.map((l) => l.label),
    data.contact.address,
  ].filter(Boolean);
  return (
    <header data-keep style={{ textAlign: 'center', marginBottom: 4 }}>
      <h1
        style={{
          ...UNSTYLED_HEADING,
          margin: 0,
          fontSize: 34,
          lineHeight: 1.1,
          fontWeight: 400,
          fontVariant: 'small-caps',
        }}
      >
        {data.name}
      </h1>
      {data.headline && <p style={{ margin: '3px 0 0', fontStyle: 'italic' }}>{data.headline}</p>}
      {withContact && contact.length > 0 && (
        <p style={{ margin: '4px 0 0', fontSize: 12.5 }}>
          {contact.map((c, i) => (
            <span key={i}>
              {i > 0 && <span style={{ margin: '0 7px' }}>|</span>}
              {c}
            </span>
          ))}
        </p>
      )}
    </header>
  );
}

/** The candidate's photo, or — with `badge` — their initials in a circle when there is none. */
function Photo({
  data,
  t,
  size,
  center,
  badge,
}: {
  data: ResumeData;
  t: Theme;
  size: number;
  center?: boolean;
  badge?: boolean;
}) {
  const box: CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    margin: center ? '0 auto 22px' : undefined,
    overflow: 'hidden',
  };
  if (data.photoUrl && t.photo) {
    return (
      <div style={{ ...box, border: `3px solid ${t.accent}` }}>
        <img
          src={data.photoUrl}
          alt=""
          crossOrigin="anonymous"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }
  if (!badge) return null;
  return (
    <div
      style={{
        ...box,
        background: t.accent,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        letterSpacing: 1,
      }}
    >
      {data.initials}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

const TITLES: Record<SectionKey, string> = {
  contact: 'Contact',
  snapshot: 'Profile',
  summary: 'Summary',
  experience: 'Work Experience',
  projects: 'Projects',
  education: 'Education',
  skills: 'Skills',
  itSkills: 'Technical Skills',
  certifications: 'Certifications',
  accomplishments: 'Accomplishments',
  languages: 'Languages',
  preferences: 'Career Preferences',
  personal: 'Personal Details',
};

function titleOf(id: SectionKey, t: Theme): string {
  return t.latex && id === 'skills' ? 'Technical Skills' : TITLES[id];
}

function Section({
  id,
  data,
  t,
  side = false,
  labels = false,
  showEmpty = false,
}: {
  id: SectionKey;
  data: ResumeData;
  t: Theme;
  side?: boolean;
  labels?: boolean;
  showEmpty?: boolean;
}) {
  const items = sectionItems(id, data, t, side);
  if (!items.length) {
    if (!showEmpty) return null;
    return (
      <section style={{ marginTop: 18 }}>
        <Heading t={t} side={side}>
          {titleOf(id, t)}
        </Heading>
        <p style={{ margin: 0, fontSize: 12, fontStyle: 'italic', color: '#9ca3af' }}>
          Nothing added yet.
        </p>
      </section>
    );
  }

  const gap = t.latex ? 12 : t.dense ? 12 : side ? 20 : 18;

  if (labels) {
    // Minimal: the title sits in a narrow left column beside the content.
    return (
      <section
        style={{
          display: 'flex',
          gap: 24,
          marginTop: gap,
          paddingTop: gap,
          borderTop: '1px solid #e4e4e7',
        }}
      >
        <div
          style={{
            width: 130,
            flexShrink: 0,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: t.muted,
            paddingTop: 2,
          }}
        >
          {TITLES[id]}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {items.map((item, i) => (
            <div key={i} data-keep>
              {item}
            </div>
          ))}
        </div>
      </section>
    );
  }

  // The heading travels with its first entry, so a page never ends on a lone title.
  const [first, ...rest] = items;
  return (
    <section style={{ marginTop: gap }}>
      <div data-keep>
        <Heading t={t} side={side}>
          {titleOf(id, t)}
        </Heading>
        <div data-keep>{first}</div>
      </div>
      {rest.map((item, i) => (
        <div key={i} data-keep>
          {item}
        </div>
      ))}
    </section>
  );
}

function Heading({ t, side, children }: { t: Theme; side: boolean; children: string }) {
  const color = side ? t.panelInk! : t.heading === 'plain' ? t.ink : t.accent;
  const base: CSSProperties = {
    ...UNSTYLED_HEADING,
    margin: '0 0 8px',
    fontSize: side ? 12 : 13,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color,
  };
  switch (t.heading) {
    case 'smallcaps':
      return (
        <h2
          style={{
            ...base,
            margin: '0 0 6px',
            paddingBottom: 1,
            fontSize: 16,
            fontWeight: 400,
            textTransform: 'none',
            fontVariant: 'small-caps',
            letterSpacing: 0.3,
            borderBottom: `0.8px solid ${t.ink}`,
          }}
        >
          {children}
        </h2>
      );
    case 'rule':
      return (
        <h2
          style={{
            ...base,
            paddingBottom: 4,
            borderBottom: `1.5px solid ${side ? t.panelMuted : t.accent}`,
          }}
        >
          {children}
        </h2>
      );
    case 'bar':
      return (
        <h2
          style={{
            ...base,
            paddingLeft: 9,
            borderLeft: `4px solid ${t.accent}`,
            color: side ? t.panelInk : t.ink,
          }}
        >
          {children}
        </h2>
      );
    case 'centered':
      return (
        <h2
          style={{
            ...base,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            letterSpacing: 3,
            fontWeight: 400,
          }}
        >
          <span style={{ flex: 1, height: 1, background: t.accent, opacity: 0.4 }} />
          {children}
          <span style={{ flex: 1, height: 1, background: t.accent, opacity: 0.4 }} />
        </h2>
      );
    case 'pill':
      return (
        <h2 style={{ ...base }}>
          <span
            style={{
              display: 'inline-block',
              background: t.accent,
              color: '#ffffff',
              borderRadius: 999,
              padding: '3px 12px',
              fontSize: 11,
            }}
          >
            {children}
          </span>
        </h2>
      );
    case 'underline':
      return (
        <h2 style={base}>
          {children}
          <span
            style={{
              display: 'block',
              width: 34,
              height: 3,
              marginTop: 4,
              borderRadius: 2,
              background: t.accent,
            }}
          />
        </h2>
      );
    default:
      return (
        <h2 style={{ ...base, paddingBottom: 2, borderBottom: '1px solid #000000' }}>{children}</h2>
      );
  }
}

/** The rendered entries of one section — each is a block the PDF keeps whole. */
function sectionItems(id: SectionKey, d: ResumeData, t: Theme, side: boolean): ReactNode[] {
  const muted = side ? t.panelMuted! : t.muted;
  const small: CSSProperties = { margin: 0, fontSize: t.dense ? 11 : 11.5, color: muted };
  const para: CSSProperties = { margin: '4px 0 0', whiteSpace: 'pre-line' };

  switch (id) {
    case 'contact':
      return [
        ...[d.contact.email, d.contact.phone, d.contact.location, d.contact.address]
          .filter(Boolean)
          .map((v) => <p style={{ margin: '0 0 4px', wordBreak: 'break-word' }}>{v}</p>),
        ...d.links.map((l) => (
          <p style={{ margin: '0 0 4px', wordBreak: 'break-all', color: muted }}>{l.label}</p>
        )),
      ];

    case 'summary':
      return d.summary ? [<p style={{ margin: 0, whiteSpace: 'pre-line' }}>{d.summary}</p>] : [];

    case 'snapshot':
    case 'preferences':
    case 'personal': {
      const rows =
        id === 'snapshot' ? d.snapshot : id === 'preferences' ? d.preferences : d.personal;
      return rows.length ? [<Facts rows={rows} t={t} side={side} />] : [];
    }

    case 'experience':
      return d.experience.map((e, i) => (
        <Dated t={t} last={i === d.experience.length - 1} {...experienceRow(e, t)} />
      ));

    case 'projects':
      return d.projects.map((p, i) => (
        <Dated
          t={t}
          last={i === d.projects.length - 1}
          title={p.title}
          // LaTeX resumes put a short stack beside the title: "Aajiveka | React, Node.js". A
          // long one would wrap the title row over several lines, so it gets a line of its own.
          titleExtra={t.latex && inlineStack(p.skills) ? p.skills.join(', ') : undefined}
          subtitle={p.client}
          period={p.period}
          meta={p.meta}
        >
          {t.latex && p.skills.length > 0 && !inlineStack(p.skills) && (
            <p style={{ margin: '2px 0 0', fontSize: 12.5 }}>
              <strong>Tech stack:</strong> {p.skills.join(', ')}
            </p>
          )}
          {!t.latex && p.skills.length > 0 && (
            <p style={{ ...small, marginTop: 2 }}>Skills: {p.skills.join(', ')}</p>
          )}
          {p.role && <Body t={t} text={p.role} />}
          {p.details && <Body t={t} text={p.details} />}
        </Dated>
      ));

    case 'education':
      // The institution heads a LaTeX entry; what was awarded goes in italics beneath it.
      if (t.latex) {
        return d.education.map((e, i) => (
          <Dated
            t={t}
            last={i === d.education.length - 1}
            title={e.institute || e.title}
            subtitle={e.institute ? [e.title, e.detail].filter(Boolean).join(' · ') : e.detail}
            period={e.period}
            meta={e.marks}
          />
        ));
      }
      return d.education.map((e, i) => (
        <Dated
          t={t}
          last={i === d.education.length - 1}
          title={e.title}
          subtitle={e.institute}
          period={e.period}
          meta={[e.detail, e.marks].filter(Boolean).join(' · ')}
        />
      ));

    case 'skills':
      if (t.latex) {
        const lines: [string, string][] = (
          [
            ['Skills', d.skills.join(', ')],
            [
              'Tools & Technologies',
              d.itSkills.map((s) => (s.meta ? `${s.name} (${s.meta})` : s.name)).join(', '),
            ],
            [
              'Languages',
              d.languages.map((l) => (l.level ? `${l.name} (${l.level})` : l.name)).join(', '),
            ],
          ] as [string, string][]
        ).filter(([, v]) => v);
        if (!lines.length) return [];
        return [
          <div style={{ fontSize: 12.5 }}>
            {lines.map(([label, value]) => (
              <p key={label} style={{ margin: '0 0 2px' }}>
                <strong>{label}:</strong> {value}
              </p>
            ))}
          </div>,
        ];
      }
      if (!d.skills.length) return [];
      if (side || t.skills === 'list') {
        return [
          // Tailwind's reset strips list markers; the sheet has to ask for them back.
          <ul style={{ margin: 0, paddingLeft: 16, listStyleType: 'disc' }}>
            {d.skills.map((s) => (
              <li key={s} style={{ marginBottom: 2 }}>
                {s}
              </li>
            ))}
          </ul>,
        ];
      }
      if (t.skills === 'comma') return [<p style={{ margin: 0 }}>{d.skills.join(', ')}</p>];
      return [
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {d.skills.map((s) => (
            <span
              key={s}
              style={{
                background: t.accentSoft,
                color: t.accent,
                border: `1px solid ${t.accent}33`,
                borderRadius: 6,
                padding: '2px 9px',
                fontSize: 11.5,
                fontWeight: 600,
              }}
            >
              {s}
            </span>
          ))}
        </div>,
      ];

    case 'itSkills':
      return d.itSkills.map((s) => (
        <p style={{ margin: '0 0 3px' }}>
          <strong>{s.name}</strong>
          {s.meta && <span style={{ color: muted }}> · {s.meta}</span>}
        </p>
      ));

    case 'languages':
      return d.languages.map((l) => (
        <p style={{ margin: '0 0 3px' }}>
          <strong>{l.level ? `${l.name} — ${l.level}` : l.name}</strong>
          {l.abilities && <span style={{ color: muted }}> · {l.abilities}</span>}
        </p>
      ));

    case 'certifications':
      return d.certifications.map((c) => (
        <div style={{ marginBottom: 6 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>{c.name}</p>
          {(c.meta || c.url) && <p style={small}>{[c.meta, c.url].filter(Boolean).join(' · ')}</p>}
        </div>
      ));

    case 'accomplishments':
      return d.accomplishments.map((a) => (
        <div style={{ marginBottom: 6 }}>
          <p style={{ margin: 0, fontWeight: 700 }}>
            {a.title}
            {a.kind && <span style={{ fontWeight: 400, color: muted }}> · {a.kind}</span>}
          </p>
          {a.meta && <p style={small}>{a.meta}</p>}
          {a.descr && <p style={{ ...para, marginTop: 2 }}>{a.descr}</p>}
          {a.url && <p style={small}>{a.url}</p>}
        </div>
      ));
  }
}

function experienceRow(e: ExperienceItem, t: Theme) {
  return {
    title: e.role || e.company,
    subtitle: e.role ? e.company : '',
    period: e.period,
    meta: [e.duration, e.meta].filter(Boolean).join(' · '),
    children: e.description ? <Body t={t} text={e.description} /> : null,
  };
}

/** Whether a project's stack is short enough to sit beside its title without wrapping it. */
const inlineStack = (skills: string[]) => skills.join(', ').length <= 45;

/**
 * A free-text description. LaTeX themes print each line as a bullet, the way an \item list
 * reads, dropping any "-", "•" or "*" the candidate typed to make their own. A line ending in
 * a colon ("Responsibilities:") is a label for the bullets under it, not one of them.
 *
 * The bullet is a character rather than a list marker: Tailwind's reset removes markers, and
 * the PDF rasteriser places them unreliably even when they are put back.
 */
function Body({ t, text }: { t: Theme; text: string }) {
  if (!t.latex) return <p style={{ margin: '4px 0 0', whiteSpace: 'pre-line' }}>{text}</p>;
  const lines = text
    .split('\n')
    .map((l) => l.replace(/^\s*[-•*–]\s*/, '').trim())
    .filter(Boolean);
  return (
    <div style={{ margin: '3px 0 0', fontSize: 12.5 }}>
      {lines.map((l, i) =>
        l.endsWith(':') ? (
          <p key={i} style={{ margin: '2px 0 1px', fontWeight: 700 }}>
            {l}
          </p>
        ) : (
          <div key={i} style={{ display: 'flex', gap: 8, paddingLeft: 10, marginBottom: 1 }}>
            <span style={{ flexShrink: 0 }}>•</span>
            <span style={{ minWidth: 0 }}>{l}</span>
          </div>
        ),
      )}
    </div>
  );
}

/** A dated entry — job, project, qualification. Drawn on a timeline when the theme has one. */
function Dated({
  t,
  title,
  titleExtra,
  subtitle,
  period,
  meta,
  last,
  children,
}: {
  t: Theme;
  title: string;
  /** Printed after the title in italics, LaTeX themes only. */
  titleExtra?: string;
  subtitle: string;
  period: string;
  meta: string;
  last: boolean;
  children?: ReactNode;
}) {
  if (t.latex) {
    // \resumeSubheading: bold title and dates on one line, italic detail and score beneath.
    const row: CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      gap: 12,
      alignItems: 'baseline',
    };
    return (
      <div style={{ marginBottom: last ? 0 : 8 }}>
        <div style={row}>
          <p style={{ margin: 0 }}>
            <strong>{title}</strong>
            {titleExtra && (
              <>
                <span style={{ margin: '0 6px' }}>|</span>
                <em style={{ fontSize: 12.5 }}>{titleExtra}</em>
              </>
            )}
          </p>
          {period && <span style={{ flexShrink: 0 }}>{period}</span>}
        </div>
        {(subtitle || meta) && (
          <div style={{ ...row, fontSize: 12.5, fontStyle: 'italic' }}>
            <span>{subtitle}</span>
            {meta && <span style={{ flexShrink: 0, textAlign: 'right' }}>{meta}</span>}
          </div>
        )}
        {children}
      </div>
    );
  }

  const body = (
    <>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          gap: 12,
          alignItems: 'baseline',
        }}
      >
        <p style={{ margin: 0, fontWeight: 700, fontSize: t.dense ? 12.5 : 13.5 }}>
          {title}
          {subtitle && (
            <span style={{ fontWeight: 600, color: t.accent }}>{`  ·  ${subtitle}`}</span>
          )}
        </p>
        {period && (
          <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 600, color: t.muted }}>
            {period}
          </span>
        )}
      </div>
      {meta && <p style={{ margin: '1px 0 0', fontSize: 11.5, color: t.muted }}>{meta}</p>}
      {children}
    </>
  );

  if (!t.timeline) return <div style={{ marginBottom: last ? 0 : t.dense ? 8 : 12 }}>{body}</div>;
  return (
    <div style={{ position: 'relative', paddingLeft: 22, paddingBottom: last ? 0 : 14 }}>
      {/* The connector runs down to the next entry's dot; the last entry has none to reach. */}
      {!last && (
        <span
          style={{
            position: 'absolute',
            left: 4,
            top: 14,
            bottom: 0,
            width: 2,
            background: t.accent,
            opacity: 0.3,
          }}
        />
      )}
      <span
        style={{
          position: 'absolute',
          left: 0,
          top: 5,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: t.accent,
          boxShadow: `0 0 0 3px ${t.accentSoft}`,
        }}
      />
      {body}
    </div>
  );
}

function Facts({ rows, t, side }: { rows: Fact[]; t: Theme; side: boolean }) {
  const muted = side ? t.panelMuted! : t.muted;
  if (t.latex) {
    // Same "Label: value" lines as Technical Skills, so the page reads as one typeset document.
    return (
      <div style={{ fontSize: 12.5 }}>
        {rows.map((r) => (
          <p key={r.label} style={{ margin: '0 0 2px' }}>
            <strong>{r.label}:</strong> {r.value}
          </p>
        ))}
      </div>
    );
  }
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: side ? '1fr' : t.dense ? '1fr 1fr 1fr' : '1fr 1fr',
        columnGap: 24,
        rowGap: side ? 6 : 3,
      }}
    >
      {rows.map((r) => (
        <p key={r.label} style={{ margin: 0 }}>
          <span style={{ color: muted, fontSize: side ? 11 : 11.5 }}>{r.label}: </span>
          {side && <br />}
          <span style={{ fontWeight: 600 }}>{r.value}</span>
        </p>
      ))}
    </div>
  );
}
