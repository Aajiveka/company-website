import { PageBanner } from '../components/PageBanner';
import { PricingPlans } from '../components/PricingPlans';
import { DevicesSection } from '../components/DevicesSection';

export default function PricingPage() {
  return (
    <>
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
