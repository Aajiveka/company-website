import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { JobSearchBar } from '@/features/jobs/components/JobSearchBar';

/** Service icon paths — keep content in the translation file. */
const SERVICE_ICONS = ['/image/s1.svg', '/image/s2.svg', '/image/s3.svg', '/image/s4.svg', '/image/s5.svg', '/image/s6.svg'];
const SERVICE_KEYS = ['advancedSearch', 'jobPosting', 'resumeBuilder', 'employerBranding', 'resumeDatabase', 'careerAdvice'] as const;
/** The seven onboarding steps from the company brochure. */
const HOW_IT_WORKS_STEPS = [1, 2, 3, 4, 5, 6, 7] as const;
/** Brochure page 4 staggers the steps around the phone: odd ones to its left, even ones to its right. */
const STEP_PLACEMENT = [
  'lg:col-start-1 lg:row-start-1 lg:flex-row-reverse lg:text-right',
  'lg:col-start-3 lg:row-start-2',
  'lg:col-start-1 lg:row-start-3 lg:flex-row-reverse lg:text-right',
  'lg:col-start-3 lg:row-start-4',
  'lg:col-start-1 lg:row-start-5 lg:flex-row-reverse lg:text-right',
  'lg:col-start-3 lg:row-start-6',
  'lg:col-start-1 lg:row-start-7 lg:flex-row-reverse lg:text-right',
] as const;

/**
 * Home page — faithful rebuild of index.aspx (hero, About, Our Story,
 * Our Philosophy, Our Service grid) on the NewTheme design tokens.
 */
export default function HomePage() {
  const { t } = useTranslation('home');

  return (
    <>
      <Seo
        title="Home"
        path="/"
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Aajiveka',
            url: 'https://aajiveka.com',
            logo: 'https://aajiveka.com/image/logo.svg',
            sameAs: [
              'https://www.facebook.com/profile.php?id=100092726993362',
              'https://twitter.com/aajiveka',
              'https://www.linkedin.com/company/aajiveka/',
              'https://www.youtube.com/@Aajiveka/about',
              'https://www.instagram.com/aajiveka/',
            ],
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: 'Aajiveka',
            url: 'https://aajiveka.com',
            potentialAction: {
              '@type': 'SearchAction',
              target: 'https://aajiveka.com/jobs?designation={search_term_string}',
              'query-input': 'required name=search_term_string',
            },
          },
        ]}
      />
      {/* -------------------------------- Hero -------------------------------- */}
      <section className="hero-banner relative flex min-h-[28rem] items-center overflow-hidden md:h-[600px] lg:h-[745px]">
        <img
          src="/image/slider_laptop.webp"
          alt=""
          aria-hidden="true"
          width={519}
          height={400}
          decoding="async"
          className="pointer-events-none absolute bottom-0 right-[4%] z-0 hidden w-[38%] max-w-[519px] object-contain md:block lg:right-[8%]"
        />
        <div className="container relative z-10">
          <div className="max-w-full text-white sm:max-w-3xl md:max-w-[52%]">
            <h1 className="mb-6 font-heading text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
              {t('hero.title')}
            </h1>
            <JobSearchBar />
          </div>
        </div>
      </section>

      {/* ------------------------------- About -------------------------------- */}
      <section className="py-8 md:py-12 lg:py-20">
        <div className="container">
          <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-14">
            <div>
              <p className="font-heading text-xl font-medium text-gray-500 dark:text-gray-400">{t('about.eyebrow')}</p>
              <h2>{t('about.heading')}</h2>
              <p className="mt-6 text-gray-600 dark:text-gray-300">{t('about.text1')}</p>
              <p className="mt-4 text-gray-600 dark:text-gray-300">{t('about.text2')}</p>
              <p className="mt-4 text-gray-600 dark:text-gray-300">{t('about.text3')}</p>
            </div>
            <img
              src="/image/about-aajiveka.webp"
              alt={t('about.imageAlt')}
              width={900}
              height={1080}
              loading="lazy"
              decoding="async"
              className="mx-auto w-full max-w-md rounded-2xl object-cover"
            />
          </div>
        </div>
      </section>

      {/* ----------------------------- Our Story ------------------------------ */}
      <section className="py-8">
        <div className="container">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="md:pr-10">
              <h2>{t('story.heading')}</h2>
              <p className="mt-4 text-gray-600 dark:text-gray-300">{t('story.text1')}</p>
              <p className="mt-3 text-gray-600 dark:text-gray-300">{t('story.text2')}</p>
            </div>
            <img src="/image/story.webp" alt="Our story" className="w-full rounded-lg" loading="lazy" decoding="async" style={{ aspectRatio: '16/9' }} />
          </div>
          <div className="mt-6 text-center">
            <h3 className="font-heading text-2xl font-semibold text-primary">
              {t('story.tagline')}
            </h3>
          </div>
        </div>
      </section>

      {/* --------------------------- Our Philosophy --------------------------- */}
      <section className="my-8 bg-accent py-10 md:my-12 md:py-16 lg:my-20">
        <div className="container">
          <div className="grid items-center gap-8 md:grid-cols-2 lg:gap-14">
            <div>
              <h2>{t('philosophy.heading')}</h2>
              <div className="mt-6 space-y-3 text-navy/80">
                <p>{t('philosophy.text1')}</p>
                <p>{t('philosophy.text2')}</p>
                <p>{t('philosophy.text3')}</p>
              </div>
            </div>
            <img
              src="/image/philosophy-aajiveka.webp"
              alt={t('philosophy.imageAlt')}
              width={800}
              height={827}
              loading="lazy"
              decoding="async"
              className="mx-auto w-full max-w-sm object-contain"
            />
          </div>
          <div className="mt-8 max-w-4xl space-y-3 text-navy/80 md:mt-12">
            <p>{t('philosophy.text4')}</p>
            <p>{t('philosophy.text5')}</p>
            <p>{t('philosophy.text6')}</p>
          </div>
        </div>
      </section>

      {/* --------------------------- How It Works ----------------------------- */}
      <section className="py-8 md:py-12">
        <div className="container">
          <div className="max-w-xl">
            <p className="font-heading text-xl font-medium text-gray-500 dark:text-gray-400">{t('howItWorks.eyebrow')}</p>
            <h2>{t('howItWorks.heading')}</h2>
            <p className="mt-4 text-gray-600 dark:text-gray-300">{t('howItWorks.subtext')}</p>
          </div>
          <ol className="mt-8 grid items-center gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-[1fr_auto_1fr] lg:gap-x-12">
            <img
              src="/image/how-it-works-app.webp"
              alt={t('howItWorks.imageAlt')}
              width={560}
              height={1166}
              loading="lazy"
              decoding="async"
              className="mx-auto w-full max-w-55 object-contain sm:col-span-2 lg:col-span-1 lg:col-start-2 lg:row-span-7 lg:row-start-1 lg:max-w-65"
            />
            {HOW_IT_WORKS_STEPS.map((n) => (
              <li
                key={n}
                className={`flex items-center gap-4 rounded-xl bg-white p-4 shadow-card transition hover:-translate-y-1 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700 ${STEP_PLACEMENT[n - 1]}`}
              >
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary font-heading text-lg font-bold text-white">
                  {n}
                </span>
                <span className="font-medium text-navy dark:text-gray-200">{t(`howItWorks.step${n}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------------------------- Our Service ----------------------------- */}
      <section className="py-8 pb-16 text-center">
        <div className="container">
          <h2>{t('service.heading')}</h2>
          <p className="mt-4 text-gray-600 dark:text-gray-300">{t('service.subtext')}</p>
          <div className="mt-8 grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_KEYS.map((key, i) => (
              <article
                key={key}
                className="rounded-xl bg-white p-6 shadow-[0px_4px_40px_rgba(43,89,255,0.08)] transition hover:-translate-y-1 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
              >
                <img src={SERVICE_ICONS[i]} alt="" className="mx-auto h-16" width={64} height={64} loading="lazy" decoding="async" />
                <h5 className="mb-2 mt-3 font-heading text-lg font-semibold text-navy">
                  {t(`service.${key}`)}
                </h5>
                <p className="text-center text-sm text-gray-600 dark:text-gray-300">{t(`service.${key}Text`)}</p>
              </article>
            ))}
          </div>
          <Link to="/subscription">
            <Button className="mt-10">{t('actions.knowMore', { ns: 'common' })}</Button>
          </Link>
        </div>
      </section>
    </>
  );
}
