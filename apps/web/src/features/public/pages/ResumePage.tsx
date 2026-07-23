import { FileText, Sparkles, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { PricingPlans } from '../components/PricingPlans';
import { DevicesSection } from '../components/DevicesSection';

const FEATURE_ICONS = [Sparkles, Target, FileText];
const FEATURE_KEYS = ['aiBuilder', 'atsOptimized', 'multipleTemplates'] as const;

export default function ResumePage() {
  const { t } = useTranslation('public');

  return (
    <>
      <Seo
        title="Resume Builder"
        description="Build a professional, ATS-optimised resume for free with Aajiveka's AI-powered resume builder. Choose from modern templates and land more interviews."
        path="/resume"
      />
      <PageBanner
        variant="subscription"
        title={t('resume.bannerTitle')}
        subtitle={t('pricing.bannerSubtitle')}
      />

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURE_KEYS.map((key, i) => {
              const Icon = FEATURE_ICONS[i];
              return (
                <div key={key} className="rounded-2xl bg-white p-6 text-center shadow-card">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                    <Icon className="h-7 w-7" />
                  </div>
                  <h5 className="mb-2 font-heading text-lg font-semibold text-navy">{t(`resume.${key}`)}</h5>
                  <p className="text-sm text-gray-600">{t(`resume.${key}Text`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <PricingPlans />
      <DevicesSection />
    </>
  );
}
