import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { PricingPlans } from '../components/PricingPlans';
import { DevicesSection } from '../components/DevicesSection';

export default function PricingPage() {
  return (
    <>
      <Seo
        title="Pricing"
        description="Explore Aajiveka subscription plans for job seekers and employers. Affordable pricing for premium job search, AI resume building, and recruitment tools."
        path="/pricing"
      />
      <PageBanner
        variant="subscription"
        title="Get the Early Advantage in Your Job Search with Aajiveka"
        subtitle="We have exclusive plans in our pricing"
      />
      <PricingPlans />
      <DevicesSection />
    </>
  );
}
