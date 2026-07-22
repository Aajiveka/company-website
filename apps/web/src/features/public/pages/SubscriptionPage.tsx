import { Check } from 'lucide-react';
import { Seo } from '@/components/Seo';
import { PageBanner } from '../components/PageBanner';
import { PricingPlans } from '../components/PricingPlans';
import { DevicesSection } from '../components/DevicesSection';

const BENEFITS = [
  'Get discovered by top employers with priority profile visibility',
  'Build a standout resume with our AI-powered resume builder',
  'Apply to unlimited jobs matched to your skills',
  'Receive personalized job alerts and career guidance',
  'Track every application from apply to interview',
];

export default function SubscriptionPage() {
  return (
    <>
      <Seo
        title="Subscription"
        description="Subscribe to Aajiveka for priority profile visibility, AI resume building, unlimited job applications, and personalised career guidance."
        path="/subscription"
      />
      <PageBanner variant="subscription" title="Subscription Benefits" subtitle="We have exclusive plans in our pricing" />

      <section className="py-12">
        <div className="container max-w-3xl">
          <h2 className="text-center">Why subscribe to Aajiveka?</h2>
          <ul className="mt-6 space-y-3">
            {BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-3 rounded-xl bg-white p-4 shadow-card">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <span className="text-gray-700">{b}</span>
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
