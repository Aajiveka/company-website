import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * The split card every auth page sits in — Figma node 54:3868.
 *
 * 900×600 card, 378px blue brand panel beside a 522px white form panel. Changing the shared
 * shell rather than the login page alone keeps register / forgot / reset on the same design
 * without four copies of the layout; the brand panel is deliberately generic so it reads
 * correctly on all of them.
 *
 * Below `lg` the brand panel is dropped rather than stacked: on a phone it would push the
 * form — the only thing anyone came here to use — below the fold.
 */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { t } = useTranslation('auth');

  const bullets = [
    t('shell.bullet1', 'Millions of live job listings'),
    t('shell.bullet2', 'Verified employers'),
    t('shell.bullet3', 'Apply in one click'),
  ];

  return (
    <section className="flex min-h-screen items-center justify-center bg-[#F4F7FE] px-4 py-12 dark:bg-gray-900">
      <div className="grid w-full max-w-[900px] overflow-hidden rounded-2xl shadow-[0_25px_50px_rgb(0_0_0/0.25)] lg:grid-cols-[378px_1fr]">
        {/* Brand panel */}
        <div className="relative hidden overflow-hidden bg-linear-to-b from-[#1D60E5] to-[#1248C2] p-10 lg:flex lg:flex-col">
          {/* Decorative discs, mirroring the design's soft background shapes. */}
          <span aria-hidden className="absolute -right-16 top-4 size-48 rounded-full bg-white/10" />
          <span aria-hidden className="absolute -left-24 bottom-[-72px] size-56 rounded-full bg-white/10" />
          <span aria-hidden className="absolute right-10 bottom-40 size-20 rounded-full bg-white/10" />

          <div className="relative">
            <img
              src="/image/logo-mark.png"
              alt=""
              width={72}
              height={72}
              className="size-[72px] rounded-2xl bg-white object-cover p-1"
              decoding="async"
            />
            <p className="mt-6 font-display text-3xl font-bold text-white">Aajiveka</p>
            <p className="mt-3 text-sm leading-relaxed text-blue-100">
              {t('shell.tagline', "India's trusted job platform — connecting talent with opportunity.")}
            </p>
          </div>

          <ul className="relative mt-auto space-y-3">
            {bullets.map((b) => (
              <li key={b} className="flex items-center gap-3 text-sm text-white">
                <span aria-hidden className="text-amber-300">
                  ✦
                </span>
                {b}
              </li>
            ))}
          </ul>

          <p className="relative mt-8 text-[10px] font-semibold uppercase tracking-[1px] text-blue-200">
            {t('shell.mission', 'Your career. Our mission.')}
          </p>
        </div>

        {/* Form panel */}
        <div className="bg-white p-6 sm:p-10 dark:bg-gray-800">
          {/* The brand mark only appears here when the panel beside it is hidden. */}
          <Link to="/" className="mb-6 block lg:hidden">
            <img
              src="/image/logo-mark.png"
              alt="Aajiveka"
              width={48}
              height={48}
              className="size-12 rounded-xl object-cover"
              decoding="async"
            />
          </Link>

          <h1 className="font-display text-2xl font-bold text-slate-800 sm:text-3xl dark:text-gray-100">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500 dark:text-gray-400">{subtitle}</p>}

          <div className="mt-7">{children}</div>

          {footer && (
            <div className="mt-5 text-center text-sm text-slate-600 dark:text-gray-400">{footer}</div>
          )}
        </div>
      </div>
    </section>
  );
}
