import type { Config } from 'tailwindcss';

/**
 * Design tokens extracted from the reference themes:
 * - NewTheme/css/style.css  (public site — Bootstrap 5 based)
 * - css/style.css           (dashboard — "Superio" jobs template, Jost + Inter)
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Public site primary teal-blue header (#005985 / #035a86)
        primary: {
          DEFAULT: '#005985',
          light: '#035a86',
          dark: '#00405f',
        },
        // Deep navy used in hero / footer
        navy: {
          DEFAULT: '#000b33',
          deep: '#030314',
        },
        // Accent yellow (CTA highlights)
        accent: {
          DEFAULT: '#ffcc2a',
          light: '#ffd54f',
        },
        danger: '#fd4c5c',
        muted: '#5a5b5e',
        // Dashboard theme blue (Superio) for the ATS side
        brand: {
          DEFAULT: '#1967d2',
          soft: '#f0f5f7',
        },
      },
      fontFamily: {
        // Body copy (both themes) and headings (dashboard uses Jost)
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Jost', 'Inter', 'system-ui', 'sans-serif'],
      },
      container: {
        center: true,
        padding: { DEFAULT: '1rem', lg: '2rem' },
      },
      boxShadow: {
        card: '0 6px 15px rgba(64, 79, 104, 0.05)',
      },
    },
  },
  plugins: [],
} satisfies Config;
