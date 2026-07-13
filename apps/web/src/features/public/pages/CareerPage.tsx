import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';
import { PageBanner } from '../components/PageBanner';
import { DevicesSection } from '../components/DevicesSection';

const OPENINGS = [
  { role: 'Frontend Engineer', type: 'Full-time', location: 'Gurgaon / Remote' },
  { role: 'Talent Acquisition Specialist', type: 'Full-time', location: 'Gurgaon' },
  { role: 'Product Designer (UX)', type: 'Full-time', location: 'Remote' },
  { role: 'Customer Success Executive', type: 'Full-time', location: 'Gurgaon' },
];

export default function CareerPage() {
  return (
    <>
      <PageBanner variant="blog" title="Career with AAJIVEKA" subtitle="Join us in empowering India's workforce through technology." />

      <section className="py-12 md:py-20">
        <div className="container max-w-4xl">
          <h2 className="text-center">Current Openings</h2>
          <div className="mt-8 space-y-4">
            {OPENINGS.map((o) => (
              <div
                key={o.role}
                className="flex flex-col gap-3 rounded-xl bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h5 className="font-heading text-lg font-semibold text-navy">{o.role}</h5>
                  <p className="text-sm text-gray-500">
                    {o.type} · {o.location}
                  </p>
                </div>
                <Link to="/contact">
                  <Button variant="outline" size="sm">
                    Apply Now
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <DevicesSection />
    </>
  );
}
