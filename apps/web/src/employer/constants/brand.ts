/** Employer Portal brand tokens — scoped to this module only. */
export const EMPLOYER_PRIMARY = '#1A56DB';
export const EMPLOYER_PRIMARY_HOVER = '#1648b8';
export const EMPLOYER_PRIMARY_SOFT = '#EBF2FF';
export const EMPLOYER_PRIMARY_RING = 'rgba(26, 86, 219, 0.35)';

/** Tailwind-friendly class helpers for the employer brand. */
export const brand = {
  bg: 'bg-[#1A56DB]',
  bgHover: 'hover:bg-[#1648b8]',
  bgSoft: 'bg-[#EBF2FF]',
  text: 'text-[#1A56DB]',
  border: 'border-[#1A56DB]',
  ring: 'focus-visible:ring-[#1A56DB]/40',
  activeNav: 'bg-[#1A56DB] text-white',
} as const;
