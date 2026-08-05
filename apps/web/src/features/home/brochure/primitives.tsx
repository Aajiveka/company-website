import type { CSSProperties, ReactNode } from 'react';

import { TRACKING } from './tracking';
import { C, u, W, type Weight } from './tokens';

/** A full brochure page: the PDF's 1190.551 x 841.890 pt canvas. */
export function Sheet({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="bro-scroll">
      <section className="bro-sheet" aria-label={label}>
        {children}
      </section>
    </div>
  );
}

interface TxtProps {
  /** Glyph-box left edge, in PDF points. */
  x: number;
  /** Glyph-box top edge, in PDF points. */
  y: number;
  size: number;
  weight?: Weight;
  color?: string;
  children: string;
  style?: CSSProperties;
}

/**
 * A single run of text, placed exactly where the PDF places it.
 *
 * The brochure was set in a cut of Montserrat whose advances differ slightly
 * from the webfont, so each run carries a tracking correction that restores the
 * PDF's own advance width — see tracking.ts.
 */
export function Txt({ x, y, size, weight = W.regular, color = C.body, children, style }: TxtProps) {
  const track = TRACKING[`${weight}|${children}`];
  return (
    <span
      className="bro-txt"
      style={{
        left: u(x),
        top: u(y),
        fontSize: u(size),
        fontWeight: weight,
        color,
        letterSpacing: track === undefined ? undefined : `${track}em`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

interface ParaProps extends Omit<TxtProps, 'children' | 'y'> {
  /** Glyph-box top edge of the first line. */
  y: number;
  /** Baseline-to-baseline distance, in PDF points. */
  lead: number;
  /** One entry per rendered line; an empty string leaves a blank line. */
  lines: readonly string[];
}

/**
 * A paragraph block. The PDF stores every line separately, so the line breaks
 * and leading are reproduced literally rather than left to the browser.
 */
export function Para({ x, y, size, lead, lines, weight, color, style }: ParaProps) {
  return (
    <>
      {lines.map((line, i) =>
        line === '' ? null : (
          <Txt key={i} x={x} y={y + lead * i} size={size} weight={weight} color={color} style={style}>
            {line}
          </Txt>
        ),
      )}
    </>
  );
}

interface BoxProps {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  radius?: number;
  style?: CSSProperties;
}

/** A filled rectangle (page bands, cards, rules). */
export function Box({ x, y, w, h, fill, radius, style }: BoxProps) {
  return (
    <div
      className="bro-box"
      style={{
        left: u(x),
        top: u(y),
        width: u(w),
        height: u(h),
        background: fill,
        borderRadius: radius ? u(radius) : undefined,
        ...style,
      }}
    />
  );
}

interface ImgProps {
  src: string;
  alt?: string;
  /** Placement rectangle in PDF points, exactly as the PDF draws the image. */
  x: number;
  y: number;
  w: number;
  h: number;
  eager?: boolean;
}

/** An asset extracted from the PDF, drawn at its exact PDF rectangle. */
export function Img({ src, alt = '', x, y, w, h, eager }: ImgProps) {
  return (
    <img
      className="bro-img"
      src={src}
      alt={alt}
      style={{ left: u(x), top: u(y), width: u(w), height: u(h) }}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  );
}
