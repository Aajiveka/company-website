import { cn } from '@/lib/cn';

type BannerVariant = 'about' | 'blog' | 'jobs' | 'subscription' | 'testimonial';

const variants: Record<BannerVariant, string> = {
  // Mirrors NewTheme banner classes (background image / color + height).
  about: "min-h-[520px] bg-[url('/image/About_banner.jpg')] bg-cover bg-center text-white",
  blog: "min-h-[380px] bg-[url('/image/blog_banner.jpg')] bg-cover bg-center text-white",
  jobs: 'min-h-[360px] bg-primary text-white',
  subscription: 'min-h-[320px] bg-primary text-white',
  testimonial: 'min-h-[420px] bg-[#D6DFE4] text-navy',
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
      <div className="container relative py-16 text-center">
        <h1 className="mx-auto max-w-4xl font-heading text-3xl font-bold leading-tight md:text-4xl">
          {title}
        </h1>
        {subtitle && <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">{subtitle}</p>}
        {children}
      </div>
    </section>
  );
}
