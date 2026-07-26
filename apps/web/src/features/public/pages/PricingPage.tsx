import { useTranslation } from 'react-i18next';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { PricingPlans } from '../components/PricingPlans';
import { DevicesSection } from '../components/DevicesSection';

export default function PricingPage() {
  const { t } = useTranslation('public');
  return (
    <>
      <Seo
        title="Pricing"
        description="Explore Aajiveka subscription plans for job seekers and employers. Affordable pricing for premium job search, AI resume building, and recruitment tools."
        path="/pricing"
      />
      <PageBanner
        variant="subscription"
        title={t('pricing.bannerTitle')}
        subtitle={t('pricing.bannerSubtitle')}
      />
      <PricingPlans />
      <DevicesSection />
    </>
  );
}
