import { cn } from '@/lib/cn';

type BannerVariant = 'about' | 'blog' | 'jobs' | 'subscription' | 'testimonial';

const variants: Record<BannerVariant, string> = {
  // Mirrors NewTheme banner classes (background image / color + height).
  about: "min-h-[360px] bg-[url('/image/About_banner.jpg')] bg-cover bg-center text-white sm:min-h-[520px]",
  blog: "min-h-[280px] bg-[url('/image/blog_banner.jpg')] bg-cover bg-center text-white sm:min-h-[380px]",
  jobs: 'min-h-[260px] bg-primary text-white sm:min-h-[360px]',
  subscription: 'min-h-[240px] bg-primary text-white sm:min-h-[320px]',
  testimonial: 'min-h-[300px] bg-[#D6DFE4] text-navy sm:min-h-[420px]',
};

export interface PageBannerProps {
  variant: BannerVariant;
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/** Full-width page hero banner used across the public marketing pages. */
export function PageBanner({ variant, title, subtitle, children }: PageBannerProps) {
  return (
    <section className={cn('relative flex items-center pt-20', variants[variant])}>
      <div
        className="absolute inset-0 bg-black/20"
        aria-hidden={variant !== 'testimonial'}
        hidden={variant === 'testimonial' || variant === 'subscription' || variant === 'jobs'}
      />
      <div className="container relative py-8 text-center sm:py-16">
        <h1 className="mx-auto max-w-4xl font-heading text-2xl font-bold leading-tight sm:text-3xl md:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-base opacity-90 sm:text-lg">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
