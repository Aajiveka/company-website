import { Quote } from 'lucide-react';
import { PageBanner } from '../components/PageBanner';
import { DevicesSection } from '../components/DevicesSection';

const TESTIMONIALS = [
  { name: 'Ravi Mayani', role: 'Candidate', text: 'Aajiveka saved me time managing all my applications in one place. The AI resume builder helped me land interviews faster than I expected.' },
  { name: 'Angel Sharma', role: 'Candidate', text: 'The personalized job matches were spot-on. I found a role that fit my skills perfectly within two weeks of signing up.' },
  { name: 'Rohan Manothra', role: 'Candidate', text: 'The dedicated career assistant guided me through every step — from resume to final offer. Highly recommended.' },
  { name: 'Muskan Shah', role: 'Candidate', text: 'A genuinely user-friendly platform. Tracking my applications and interview status has never been this easy.' },
  { name: 'Jyoti Gandhi', role: 'Finance company', text: 'Their job portal consistently delivers highly qualified candidates, saving us time and effort in the hiring process.' },
  { name: 'Kuldeep Gondaliya', role: 'IT Company', text: 'Powerful search filters and a wide range of job categories made it easy to find the right talent quickly.' },
];

export default function TestimonialPage() {
  return (
    <>
      <PageBanner
        variant="testimonial"
        title="Client Testimonials: Building Lasting Relationships, One Success Story at a Time"
      />

      <section className="py-12 md:py-20">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <figure key={t.name} className="flex flex-col rounded-2xl bg-white p-6 shadow-card">
                <Quote className="h-8 w-8 text-accent" />
                <blockquote className="mt-3 flex-1 text-gray-600">{t.text}</blockquote>
                <figcaption className="mt-5">
                  <h5 className="font-heading font-semibold text-navy">{t.name}</h5>
                  <p className="text-sm text-gray-500">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <DevicesSection />
    </>
  );
}
