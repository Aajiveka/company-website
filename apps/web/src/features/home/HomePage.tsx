import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { JobSearchBar } from '@/features/jobs/components/JobSearchBar';

/** Service icon paths — keep content in the translation file. */
const SERVICE_ICONS = ['/image/s1.svg', '/image/s2.svg', '/image/s3.svg', '/image/s4.svg', '/image/s5.svg', '/image/s6.svg'];
const SERVICE_KEYS = ['advancedSearch', 'jobPosting', 'resumeBuilder', 'employerBranding', 'resumeDatabase', 'careerAdvice'] as const;

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
        <div className="container text-center">
          <h2>{t('about.heading')}</h2>
          <p className="mx-auto mt-4 max-w-3xl text-gray-600">{t('about.text')}</p>
        </div>
      </section>

      {/* ----------------------------- Our Story ------------------------------ */}
      <section className="py-8">
        <div className="container">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div className="md:pr-10">
              <h2>{t('story.heading')}</h2>
              <p className="mt-4 text-gray-600">{t('story.text1')}</p>
              <p className="mt-3 text-gray-600">{t('story.text2')}</p>
            </div>
            <img src="/image/story.webp" alt="Our story" className="w-full rounded-lg" loading="lazy" />
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
          <h2>{t('philosophy.heading')}</h2>
          <div className="mt-4 max-w-4xl space-y-3 text-navy/80">
            <p>{t('philosophy.text1')}</p>
            <p>{t('philosophy.text2')}</p>
          </div>
          <div className="my-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:my-12 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <img
                key={n}
                src={`/image/philosophy${n}.webp`}
                alt=""
                className="w-full"
                loading="lazy"
              />
            ))}
          </div>
          <div className="max-w-4xl space-y-3 text-navy/80">
            <p>{t('philosophy.text3')}</p>
            <p>{t('philosophy.text4')}</p>
          </div>
        </div>
      </section>

      {/* ---------------------------- Our Service ----------------------------- */}
      <section className="py-8 pb-16 text-center">
        <div className="container">
          <h2>{t('service.heading')}</h2>
          <p className="mt-4 text-gray-600">{t('service.subtext')}</p>
          <div className="mt-8 grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {SERVICE_KEYS.map((key, i) => (
              <article
                key={key}
                className="rounded-xl bg-white p-6 shadow-[0px_4px_40px_rgba(43,89,255,0.08)] transition hover:-translate-y-1 dark:bg-gray-800 dark:shadow-none dark:ring-1 dark:ring-gray-700"
              >
                <img src={SERVICE_ICONS[i]} alt="" className="mx-auto h-16" loading="lazy" />
                <h5 className="mb-2 mt-3 font-heading text-lg font-semibold text-navy">
                  {t(`service.${key}`)}
                </h5>
                <p className="text-center text-sm text-gray-600">{t(`service.${key}Text`)}</p>
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
