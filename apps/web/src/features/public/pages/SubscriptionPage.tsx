import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { PricingPlans } from '../components/PricingPlans';
import { DevicesSection } from '../components/DevicesSection';

const BENEFIT_KEYS = ['benefit1', 'benefit2', 'benefit3', 'benefit4', 'benefit5'] as const;

export default function SubscriptionPage() {
  const { t } = useTranslation('public');
  return (
    <>
      <Seo
        title="Subscription"
        description="Subscribe to Aajiveka for priority profile visibility, AI resume building, unlimited job applications, and personalised career guidance."
        path="/subscription"
      />
      <PageBanner variant="subscription" title={t('subscription.bannerTitle')} subtitle={t('pricing.bannerSubtitle')} />

      <section className="py-12">
        <div className="container max-w-3xl">
          <h2 className="text-center">{t('subscription.whySubscribe')}</h2>
          <ul className="mt-6 space-y-3">
            {BENEFIT_KEYS.map((key) => (
              <li key={key} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <span className="text-gray-700">{t(`subscription.${key}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <PricingPlans />
      <DevicesSection />
    </>
  );
}
