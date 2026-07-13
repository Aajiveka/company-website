import { FileText, Sparkles, Target } from 'lucide-react';
import { PageBanner } from '../components/PageBanner';
import { PricingPlans } from '../components/PricingPlans';
import { DevicesSection } from '../components/DevicesSection';

const FEATURES = [
  { icon: Sparkles, title: 'AI-Powered Builder', text: 'Generate a polished, professional resume in minutes with intelligent content suggestions.' },
  { icon: Target, title: 'ATS-Optimized', text: 'Templates engineered to pass Applicant Tracking Systems and reach real recruiters.' },
  { icon: FileText, title: 'Multiple Templates', text: 'Choose from a range of modern, recruiter-approved designs tailored to your industry.' },
];

export default function ResumePage() {
  return (
    <>
      <PageBanner
        variant="subscription"
        title="Aajiveka - The Ultimate Solution for Crafting a Winning Resume"
        subtitle="We have exclusive plans in our pricing"
      />

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white p-6 text-center shadow-card">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-primary">
                  <Icon className="h-7 w-7" />
                </div>
                <h5 className="mb-2 font-heading text-lg font-semibold text-navy">{title}</h5>
                <p className="text-sm text-gray-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <PricingPlans />
      <DevicesSection />
    </>
  );
}
