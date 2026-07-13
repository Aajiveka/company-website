import { cva } from 'class-variance-authority';

/**
 * Kept out of Button.tsx so that file only exports a component (React Fast Refresh
 * requires that). Skinned with the Aajiveka tokens, not shadcn's neutral palette.
 */
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ' +
    'outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 ' +
    'disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary-dark',
        secondary: 'bg-brand text-white hover:bg-brand/90',
        outline: 'border border-primary text-primary hover:bg-primary hover:text-white',
        ghost: 'text-primary hover:bg-primary/10',
        danger: 'bg-danger text-white hover:bg-danger/90',
        accent: 'bg-accent text-navy hover:bg-accent-light',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-7 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);
