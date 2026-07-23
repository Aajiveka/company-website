import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { ReviewSection } from '../components/ReviewSection';
import { DevicesSection } from '../components/DevicesSection';

const CHOOSE_ICONS = ['/image/C1.svg', '/image/C2.svg', '/image/C3.svg', '/image/C4.svg', '/image/C5.svg'];
const INDUSTRY_ICONS = ['/image/I1.svg', '/image/I2.svg', '/image/I3.svg', '/image/I4.svg', '/image/I5.svg'];

export default function AboutPage() {
  const { t } = useTranslation('public');

  const CHOOSE = CHOOSE_ICONS.map((icon, i) => ({ icon, text: t(`about.choose${i + 1}`) }));
  const INDUSTRY = INDUSTRY_ICONS.map((icon, i) => ({
    icon,
    title: t(`about.industry${i + 1}`),
    text: t(`about.industry${i + 1}Text`),
  }));

  return (
    <>
      <Seo
        title="About Us"
        description="Learn about Aajiveka — India's next-gen job portal empowering the workforce through technology, AI-powered resume building, and personalised career guidance."
        path="/about"
      />
      <PageBanner variant="about" title={t('about.bannerTitle')} />

      {/* Mission */}
      <section className="py-12 md:py-20">
        <div className="container grid items-center gap-8 md:grid-cols-2">
          <div className="md:pr-10">
            <h2>{t('about.missionHeading')}</h2>
            <p className="mt-4 text-gray-600">{t('about.missionText')}</p>
          </div>
          <img src="/image/mission.webp" alt={t('about.missionHeading')} className="w-full rounded-lg" loading="lazy" />
        </div>
      </section>

      {/* Vision */}
      <section className="pb-8">
        <div className="container grid items-center gap-8 md:grid-cols-2">
          <img src="/image/vision.webp" alt={t('about.visionHeading')} className="w-full rounded-lg md:order-1" loading="lazy" />
          <div className="md:order-2 md:pl-10">
            <h2>{t('about.visionHeading')}</h2>
            <p className="mt-4 text-gray-600">{t('about.visionText')}</p>
          </div>
        </div>
      </section>

      {/* Value */}
      <section className="py-12 md:py-20">
        <div className="container">
          <div className="mb-8 text-center">
            <h2>{t('about.valueHeading')}</h2>
            <p className="mt-2 text-gray-600">{t('about.valueSubtext')}</p>
          </div>
          <div className="grid items-center gap-8 md:grid-cols-3">
            <div className="space-y-5">
              <Value title={t('about.customerCentricity')} text={t('about.customerCentricityText')} />
              <Value title={t('about.collaboration')} text={t('about.collaborationText')} />
            </div>
            <img src="/image/value.webp" alt={t('about.valueHeading')} className="w-full" loading="lazy" />
            <div className="space-y-5">
              <Value title={t('about.innovation')} text={t('about.innovationText')} />
              <Value title={t('about.transparency')} text={t('about.transparencyText')} />
              <Value title={t('about.diversity')} text={t('about.diversityText')} />
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose */}
      <section className="pb-8">
        <div className="container grid items-center gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {CHOOSE.map((c) => (
              <div key={c.icon} className="flex items-start gap-4 rounded-xl bg-white p-5 shadow-card">
                <img src={c.icon} alt="" className="h-12 w-12 flex-shrink-0" loading="lazy" />
                <p className="text-sm text-gray-600">{c.text}</p>
              </div>
            ))}
          </div>
          <div className="lg:pl-8">
            <h2>{t('about.whyChoose')}</h2>
            <p className="mt-4 text-gray-600">{t('about.whyChooseText')}</p>
            <Link to="/subscription">
              <Button className="mt-6">{t('actions.getStarted', { ns: 'common' })}</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Industry */}
      <section className="bg-navy py-14 text-white md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-white">{t('about.industryHeading')}</h2>
            <p className="mt-4 text-white/80">{t('about.industryText')}</p>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-2">
            {INDUSTRY.map((c) => (
              <div key={c.title} className="rounded-xl bg-white/5 p-6">
                <div className="mb-2 flex items-center gap-3">
                  <img src={c.icon} alt="" className="h-8 w-8" loading="lazy" />
                  <h6 className="font-heading text-lg font-semibold">{c.title}</h6>
                </div>
                <p className="text-sm text-white/80">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ReviewSection />
      <DevicesSection />
    </>
  );
}

function Value({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h5 className="mb-1.5 font-heading text-lg font-semibold text-navy">{title}</h5>
      <p className="text-sm text-gray-600">{text}</p>
    </div>
  );
}
