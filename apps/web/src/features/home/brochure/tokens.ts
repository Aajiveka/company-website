/**
 * Design tokens for the brochure rebuild: the point-to-container unit,
 * the Montserrat weights and the palette sampled from the PDF.
 */
/** One PDF point, resolved against the sheet width. See brochure.css. */
export const u = (pt: number) => `calc(var(--u) * ${pt})`;

/** Montserrat weights used by the brochure. */
export const W = {
  light: 300,
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;
export type Weight = (typeof W)[keyof typeof W];

/** The brochure palette, sampled from the PDF. */
export const C = {
  navy: '#17457a',
  body: '#404041',
  white: '#ffffff',
  yellow: '#fddb00',
  band: '#f0f1f1',
  /** Table hairline: the PDF's 0.22 pt stroke of #231f20, as it rasterises. */
  rule: 'rgba(35, 31, 32, 0.33)',
  coverInk: '#130000',
  coverInkAlt: '#1a1a18',
  coverContact: '#3b3b3a',
  coverCompany: '#183d73',
} as const;

/** Public path of the artwork extracted from the PDF. */
export const ASSET = '/image/brochure';
